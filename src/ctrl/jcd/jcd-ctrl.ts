
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
import { JcdImage } from '../../lib/models/jcd/jcd-image';
import { EzdError } from '../../lib/models/error/ezd-error';
import { perm } from '../../lib/service/perm-service';
import { JcdNewProjDto } from '../../lib/models/jcd/jcd-new-proj-dto';
import { hashUtil } from '../../lib/lib/hash-util';
import { jcdFs } from '../../lib/service/jcd-file-service';

const CreateJcdProject = {
  body: Type.Object({
    env: Type.String(),
    proj: JcdNewProjDto.schema,
  }),
  response: {
    200:  Type.Object({}),
    403:  Type.Object({ errMsg: Type.String() }),
  }
} as const satisfies FastifySchema;
type CreateJcdProject = typeof CreateJcdProject;
async function createJcdProject(req: ReqTB<CreateJcdProject>, res: RepTB<CreateJcdProject>) {
  let ctxUser = req.ctx.getUser();
  let hasJcdPerm = await perm.check(ctxUser.user_id, 'jcd.mgmt');
  if(!hasJcdPerm) {
    return res.status(403).send({ errMsg: 'Permission denied' });
  }
  let newProjDto = req.body.proj;
  let env = req.body.env;
  try {
    await jcdProjService.createProj({
      env,
      project: newProjDto,
    });
  } catch(e) {
    if(EzdError.is(e) && e.code === 'JCD_2.0') {
      return res.status(403).send({ errMsg: e.message });
    }
    throw e;
  }
  return res.status(200).send({no: 123});
}

const DeleteJcdProject = {
  querystring: Type.Object({
    env: Type.String(),
  }),
  params: Type.Object({
    projKey: Type.String(),
  }),
  response: {
    200: Type.Object({}),
    403: Type.Object({ errMsg: Type.String() }),
  }
} as const satisfies FastifySchema;
type DeleteJcdProject = typeof DeleteJcdProject;
async function deleteJcdProject(req: ReqTB<DeleteJcdProject>, res: RepTB<DeleteJcdProject>) {
  let ctxUser = req.ctx.getUser();
  let hasJcdPerm = await perm.check(ctxUser.user_id, 'jcd.mgmt');
  if(!hasJcdPerm) {
    return res.status(403).send({ errMsg: 'Permission denied' });
  }
  let projKey = req.params.projKey;
  let env = req.query.env;
  try {
    await jcdProjService.deleteProjV3(projKey, { env, img: true });
  } catch(e) {
    if(EzdError.is(e) && e.code === 'JCD_1.1') {
      return res.status(403).send({ errMsg: e.message });
    }
    throw e;
  }
  return res.status(200).send({});
}

const GetJcdProjects = {
  querystring: Type.Object({
    route: Type.Optional(Type.String()),
    preview: Type.Optional(Type.Boolean()),
    env: Type.String(),
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
  let env = req.query.env;
  let route = req.query.route;
  try {
    if(req.query.preview) {
      if(route !== undefined) {
        let jcdProjPreview = await jcdProjService
          .getProjPreviewByRoute(route, env);
        if(jcdProjPreview === undefined) {
          return res.status(404).send({ message: 'preview not found' });
        }
        return res.status(200).send(jcdProjPreview);
      }
      let projPreviews = await jcdProjService.getProjPreviews(env);
      return res.status(200).send(projPreviews);
    }
    if(route !== undefined) {
      let jcdProject = await jcdProjService.getProjectByRoute(route, env);
      if(jcdProject === undefined) {
        return res.status(404).send({ message: 'project not found' });
      }
      return res.status(200).send(jcdProject);
    }
    let jcdProjects = await jcdProjService.getProjects(env);
    return res.status(200).send(jcdProjects);
  } catch(e) {
    console.error(e);
    throw new EzdError('uncaught error occurred when getting projects', { cause: e });
  }
}

const GetJcdProjectImg = {
  params: Type.Object({
    projKey: Type.String(),
  }),
  querystring: Type.Object({
    env: Type.String(),
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
  let projKey = req.params.projKey;
  let projImages = await jcdProjService.getProjectImages(projKey, req.query.env);
  return res.status(200).send(projImages);
}

const PostProjectImg = {
  params: Type.Object({
    projKey: Type.String(),
  }),
  querystring: Type.Object({
    env: Type.String(),
    type: Type.Union([ Type.Literal('TITLE'), Type.Literal('GALLERY') ]),
  }),
  response: {
    200: Type.Object({}),
    403: Type.Object({ errMsg: Type.String() }),
  }
} as const satisfies FastifySchema;
type PostProjectImg = typeof PostProjectImg;
async function postProjectImg(req: ReqTB<PostProjectImg>, res: RepTB<PostProjectImg>) {
  let ctxUser = req.ctx.getUser();
  let hasPerm = await perm.check(ctxUser.user_id, 'jcd.mgmt');
  if(!hasPerm) {
    return res.status(403).send({ errMsg: 'Permission denied' });
  }
  /* todo:xxx: use req.parts() to support multiple files per request _*/
  let file = await req.file();
  let projKey = req.params.projKey;
  let env = req.query.env;
  let imageType = req.query.type;
  if(file !== undefined) {
    let imgUploadRes = await jcdFs.uploadProjImg(file, imageType, projKey, env);
  }
  return res.status(200).send({});
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
    env: Type.Optional(Type.String()),
  }),
  response: {
    200: Type.Array(EzdTestV3.schema),
    403: Type.Optional(Type.Object({})),
  }
} as const satisfies FastifySchema;
type GetEzdTest = typeof GetEzdTest;
async function getEzdTest(req: ReqTB<GetEzdTest>, res: RepTB<GetEzdTest>) {
  let ctxUser = req.ctx.getUser();
  let ns = req.query.env;
  let hasJcdTestPerm = await authzService.checkPermission(ctxUser.user_id, 'jcd.test');
  if(!hasJcdTestPerm) {
    return res.status(403).send({});
  }
  let ezdTestV3s = await jcdProjService.getEzdTest(ctxUser.user_id, ns);
  return res.status(200).send(ezdTestV3s);
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

  CreateJcdProject = CreateJcdProject;
  DeleteJcdProject = DeleteJcdProject;
  GetJcdProjects = GetJcdProjects;
  GetJcdProjectImg = GetJcdProjectImg;
  PostProjectImg = PostProjectImg;
  GetJcdImg = GetJcdImg;
  GetEzdTest = GetEzdTest;
  GetJcdExport = GetJcdExport;

  createJcdProject = createJcdProject;
  deleteJcdProject = deleteJcdProject;
  getProjects = getProjects;
  getProjectImg = getProjectImg;
  postProjectImg = postProjectImg;
  getImg = getJcdImg;
  getEzdTest = getEzdTest;
  getJcdExport = getJcdExport;
};

