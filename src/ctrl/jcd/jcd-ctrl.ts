
import type { FastifySchema } from 'fastify';
import { Type } from 'typebox';

import type { RepTB, ReqTB } from '../../lib/models/fastify/fastify-typebox';
import { authzService } from '../../lib/service/authz-service';
import { jcdProjService } from '../../lib/service/jcd-proj-service';
import { JcdProjPreview } from '../../lib/models/jcd/jcd-proj-preview';
import { JcdProject } from '../../lib/models/jcd/jcd-project';
import { EzdTestV3 } from '../../lib/models/jcd/ezd-test-v3';
import { jcdService } from '../../lib/service/jcd-service';
import { JcdEntityExportDto } from '../../lib/models/jcd/jcd-export';
import { ezdConfig } from '../../lib/config';
import { HttpHeader } from 'fastify/types/utils';
import { GcpNamespace } from '../../lib/models/gcp/gcp-namespace';
import { JcdImage } from '../../lib/models/jcd/jcd-image';
import { GcpKey } from '../../lib/models/gcp/gcp-kind';
import { EzdError } from '../../lib/models/error/ezd-error';
import { gcpDbError } from '../../lib/models/gcp/gcp-db-error';

const GetJcdProjects = {
  querystring: Type.Object({
    route: Type.Optional(Type.String()),
    preview: Type.Optional(Type.Boolean()),
    ns: Type.Optional(Type.String()),
  }),
  response: {
    200: Type.Union([
      Type.Array(JcdProject.schema),
      JcdProject.schema,
      Type.Array(JcdProjPreview.schema),
      JcdProjPreview.schema,
    ]),
    403: Type.Optional(Type.Object({})),
    404: Type.Object({ message: Type.String() }),
  }
} as const satisfies FastifySchema;
type GetJcdProjects = typeof GetJcdProjects;
async function getProjects(
  req: ReqTB<GetJcdProjects>,
  res: RepTB<GetJcdProjects>
) {
  let ctxUser = req.ctx.getUser();
  let hasJcdPerm = await authzService.checkPermission(ctxUser.user_id, 'jcd.proj.read');
  if(!hasJcdPerm) {
    return res.status(403).send({});
  }
  try {
    if(req.query.preview) {
      if(req.query.route !== undefined) {
        let jcdProjPreview = await jcdProjService
          .getProjPreviewByRoute(req.query.route, req.query.ns);
        if(jcdProjPreview === undefined) {
          return res.status(404).send({ message: 'preview not found' });
        }
        return res.status(200).send(jcdProjPreview);
      }
      let projPreviews = await jcdProjService.getProjPreviews();
      return res.status(200).send(projPreviews);
    }
    if(req.query.route !== undefined) {
      let jcdProject = await jcdProjService.getProjectByRoute(req.query.route);
      if(jcdProject === undefined) {
        return res.status(404).send({ message: 'project not found' });
      }
      return res.status(200).send(jcdProject);
    }
    let jcdProjects = await jcdProjService.getProjects();
    return res.status(200).send(jcdProjects);
  } catch(e) {
    console.error(e);
    throw new EzdError('uncaught error occurred when getting projects', { cause: e });
  }
}

const GetJcdProjectImg = {
  querystring: Type.Object({
    proj_key: Type.String(),
  }),
  response: {
    200: Type.Array(JcdImage.schema),
    403: Type.Optional(Type.Object({})),
    404: Type.Object({ message: Type.String() }),
  },
} as const satisfies FastifySchema;
type GetJcdProjectImg = typeof GetJcdProjectImg;
async function getProjectImg(
  req: ReqTB<GetJcdProjectImg>,
  res: RepTB<GetJcdProjectImg>
) {
  let ctxUser = req.ctx.getUser();
  let hasJcdReadPerm = await authzService.checkPermission(ctxUser.user_id, 'jcd.proj.read');
  if(!hasJcdReadPerm) {
    return res.status(403).send({});
  }
  let projKey = req.query.proj_key;
  let projImages = await jcdProjService.getProjectImages(projKey);
  return res.status(200).send(projImages);
}

const jcd_img_route_prefix = '/v1/jcd/img' as const;
const GetJcdImg = {
  response: {
    200: Type.Any(),
    403: Type.Any(),
    404: Type.Any(),
  }
} as const satisfies FastifySchema;
type GetJcdImg = typeof GetJcdImg;
async function getJcdImg(req: ReqTB<GetJcdImg>, res: RepTB<GetJcdImg>) {
  let ctxUser = req.ctx.getUser();
  let hasJcdPerm = await authzService.checkPermission(ctxUser.user_id, 'jcd.proj.read');
  if(!hasJcdPerm) {
    return res.status(403).send();
  }
  let proxyPath = req.url.substring(jcd_img_route_prefix.length);
  let proxyUrl = `${ezdConfig.eaglelizard_api_host}/image/v2${proxyPath}`;
  let resp: Response;
  try {
    resp = await fetch(proxyUrl);
  } catch(e) {
    if(e instanceof TypeError && e.cause instanceof AggregateError && 'code' in e.cause) {
      /* upstream image server not available */
      req.log.error(e, 'upstream image server not available');
      return res.status(404).send();
    }
    throw e;
  }
  if(resp.body === null) {
    return res.status(404).send();
  }
  let passthru_headers: HttpHeader[] = [
    'content-type',
    'cache-control',
    'date',
  ];
  passthru_headers.forEach((header) => {
    if(resp.headers.has(header)) {
      res.header(header, resp.headers.get(header));
    }
  });
  return res.status(200).send(resp.body);
}

const GetEzdTest = {
  querystring: Type.Object({
    ns: Type.Optional(Type.String()),
  }),
  response: {
    200: Type.Array(EzdTestV3.schema),
    403: Type.Optional(Type.Object({})),
  }
} as const satisfies FastifySchema;
type GetEzdTest = typeof GetEzdTest;
async function getEzdTest(req: ReqTB<GetEzdTest>, res: RepTB<GetEzdTest>) {
  let ctxUser = req.ctx.getUser();
  let ns = req.query.ns;
  let hasJcdTestPerm = await authzService.checkPermission(ctxUser.user_id, 'jcd.test');
  if(!hasJcdTestPerm) {
    return res.status(403).send({});
  }
  let ezdTestV3s = await jcdProjService.getEzdTest(ctxUser.user_id, ns);
  return res.status(200).send(ezdTestV3s);
}

const GetJcdNamespace = {
  response: {
    200: Type.Array(GcpNamespace.schema),
    403: Type.Object({ errMsg: Type.String() }),
  },
} as const satisfies FastifySchema;
type GetJcdNamespace = typeof GetJcdNamespace;
async function getJcdNamespace(
  req: ReqTB<GetJcdNamespace>,
  res: RepTB<GetJcdNamespace>,
): Promise<void> {
  let ctxUser = req.ctx.getUser();
  let hasJcdPerm = await authzService.checkPermission(ctxUser.user_id, 'jcd.mgmt');
  if(!hasJcdPerm) {
    return res.status(403).send({ errMsg: 'Permission denied '});
  }
  let jcdNss = await jcdService.getNamespaces();
  return res.status(200).send(jcdNss);
}

const GetJcdKinds = {
  querystring: Type.Object({
    ns: Type.Optional(Type.String()),
  }),
  response: {
    200: Type.Array(GcpKey),
    403: Type.Object({ errMsg: Type.String() }),
  },
} as const satisfies FastifySchema;
type GetJcdKinds = typeof GetJcdKinds;
async function getJcdKinds(
  req: ReqTB<GetJcdKinds>,
  res: RepTB<GetJcdKinds>,
): Promise<void> {
  let ns = req.query.ns;
  let ctxUser = req.ctx.getUser();
  let hasJcdPerm = await authzService.checkPermission(ctxUser.user_id, 'jcd.mgmt');
  if(!hasJcdPerm) {
    return res.status(403).send({ errMsg: 'Permission denied' });
  }
  let jcdKinds = await jcdService.getEntityKinds(ns);
  return res.status(200).send(jcdKinds);
}

const GetJcdKindEntities = {
  querystring: Type.Object({
    ns: Type.Optional(Type.String()),
    /* name: either a GCP key name OR id _*/
    name: Type.Optional(Type.String()),
  }),
  params: Type.Object({
    entityKind: Type.String(),
  }),
  response: {
    200: Type.Union([
      Type.Array(GcpKey.schema),
      Type.Any(),
    ]),
    403: Type.Object({ errMsg: Type.String() }),
  }
} as const satisfies FastifySchema;
type GetJcdKindEntities = typeof GetJcdKindEntities;
async function getJcdKindEntities(
  req: ReqTB<GetJcdKindEntities>,
  res: RepTB<GetJcdKindEntities>
): Promise<void> {
  let ctxUser = req.ctx.getUser();
  let ns = req.query.ns;
  let entityKey = req.params.entityKind;
  let name = req.query.name;
  let hasJcdPerm = await authzService.checkPermission(ctxUser.user_id, 'jcd.mgmt');
  if(name !== undefined && name.length > 0) {
    let entity = await jcdService.getKindEntityByName(entityKey, name, ns);
    return res.status(200).send(entity);
  }
  if(!hasJcdPerm) {
    return res.status(403).send({ errMsg: 'Permission denied' });
  }
  let kindEntities = await jcdService.getEntitiesByKind(entityKey, ns);
  return res.status(200).send(kindEntities);
}

const PostJcdCopyEnvKind = {
  // querystring: Type.Object({
  //   ns: Type.Optional(Type.String()),
  // }),
  params: Type.Object({
    entityKind: Type.String(),
  }),
  body: Type.Object({
    /* name is either GCP entity name or id _*/
    name: Type.String(),
    /* When fromEnv is omitted, will be default env _*/
    fromEnv: Type.Optional(Type.String()),
    /* When toEnv is '1', will be default env _*/
    toEnv: Type.String(),
  }),
  response: {
    200: Type.Object({
      outcome: Type.Object({ msg: Type.String() }),
    }),
    403: Type.Object({ errMsg: Type.String() }),
  }
} as const satisfies FastifySchema;
type PostJcdCopyEnvKind = typeof PostJcdCopyEnvKind;
async function postJcdCopyEnvKind(
  req: ReqTB<PostJcdCopyEnvKind>,
  res: RepTB<PostJcdCopyEnvKind>
): Promise<void> {
  let ctxUser = req.ctx.getUser();
  let hasCopyPerm = await authzService.checkPermission(ctxUser.user_id, 'jcd.mgmt');
  if(!hasCopyPerm) {
    return res.status(403).send({ errMsg: 'Permission denied' });
  }
  let entityKind = req.params.entityKind;
  let toEnv = req.body.toEnv;
  let fromEnv = req.body.fromEnv;
  let name = req.body.name;

  if(toEnv === jcdService.default_env_id) {
    return res.status(403).send({ errMsg: 'Copy to [default] namespace/env not yet supported' });
  }
  try {
    await jcdService.copyEnvKindEntity({
      fromEnv: fromEnv,
      toEnv: toEnv,
      entityKind: entityKind,
      name: name,
    });
  } catch(e) {
    if(!gcpDbError.isGcpDbError(e)) {
      throw e;
    }
    if(e.code === 6) {
      req.log.error(e);
      return res.status(403).send({
        errMsg: `error: ${e.details}`,
      });
    }
    throw e;
  }
  return res.status(200).send({ outcome: { msg: 'success' } });
}

const GetJcdExport = {
  response: {
    200: Type.Optional(Type.Array(JcdEntityExportDto.schema)),
    403: Type.Optional(Type.Object({})),
  }
} as const satisfies FastifySchema;
type GetJcdExport = typeof GetJcdExport;
async function getJcdExport(req: ReqTB<GetJcdExport>, res: RepTB<GetJcdExport>): Promise<never> {
  let ctxUser = req.ctx.getUser();
  let hasExportPerm = await authzService.checkPermission(ctxUser.user_id, 'jcd.export');

  if(!hasExportPerm) {
    return res.status(403).send({});
  }

  let exportRes = await jcdService.getExport();

  return res.status(200).send(exportRes);
}

export const jcdCtrl = new class JcdCtrl {
  jcd_img_route_prefix = jcd_img_route_prefix;

  GetJcdProjects = GetJcdProjects;
  GetJcdProjectImg = GetJcdProjectImg;
  GetJcdImg = GetJcdImg;
  GetEzdTest = GetEzdTest;
  GetJcdExport = GetJcdExport;
  GetJcdNamespace = GetJcdNamespace;
  GetJcdKinds = GetJcdKinds;
  GetJcdKindEntities = GetJcdKindEntities;
  PostJcdCopyEnvKind = PostJcdCopyEnvKind;

  getProjects = getProjects;
  getProjectImg = getProjectImg;
  getImg = getJcdImg;
  getEzdTest = getEzdTest;
  getJcdExport = getJcdExport;
  getJcdNamespace = getJcdNamespace;
  getJcdKinds = getJcdKinds;
  getJcdKindEntities = getJcdKindEntities;
  postJcdCopyEnvKind = postJcdCopyEnvKind;
};

