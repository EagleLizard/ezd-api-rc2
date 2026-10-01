
import type { FastifySchema } from 'fastify';
import { Type } from 'typebox';

import type { RepTB, ReqTB } from '../../lib/models/fastify/fastify-typebox';
import { JcdProjKeyDto } from '../../lib/models/jcd/jcd-proj-key-dto';
import { authzService } from '../../lib/service/authz-service';
import { jcdProjService } from '../../lib/service/jcd-proj-service';
import { jcdService } from '../../lib/service/jcd-service';
import { GcpKeyDto } from '../../lib/models/gcp/gcp-key-dto';
import { EzdError } from '../../lib/models/error/ezd-error';
import { GcpNamespace } from '../../lib/models/gcp/gcp-namespace';
import { GcpKey } from '../../lib/models/gcp/gcp-kind';
import { gcpDbError } from '../../lib/models/gcp/gcp-db-error';

/*
Env and Namespace are synonymous
_*/

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
  params: Type.Object({
    envKey: Type.String(),
  }),
  response: {
    200: Type.Array(GcpKey.schema),
    403: Type.Object({ errMsg: Type.String() }),
  },
} as const satisfies FastifySchema;
type GetJcdKinds = typeof GetJcdKinds;
async function getJcdKinds(
  req: ReqTB<GetJcdKinds>,
  res: RepTB<GetJcdKinds>,
): Promise<void> {
  let ns = req.params.envKey;
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
    /* name: either a GCP key name OR id _*/
    name: Type.Optional(Type.String()),
  }),
  params: Type.Object({
    envKey: Type.String(),
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
  let ns = req.params.envKey;
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
  params: Type.Object({
    entityKind: Type.String(),
    /* When fromEnv is omitted, will be default env _*/
    fromEnvKey: Type.String(),
    /* When toEnv is '1', will be default env _*/
    toEnvKey: Type.String(),
  }),
  body: Type.Object({
    /* name is either GCP entity name or id _*/
    name: Type.String(),
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
  let toEnv = req.params.toEnvKey;
  let fromEnv = req.params.fromEnvKey;
  let name = req.body.name;

  if(jcdService.checkDefaultEnv(toEnv)) {
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

const GetV3Proj = {
  params: Type.Object({
    envKey: Type.String(),
  }),
  response: {
    200: Type.Array(JcdProjKeyDto.schema),
    403: Type.Object({ errMsg: Type.String() }),
  },
} as const satisfies FastifySchema;
type GetV3Proj = typeof GetV3Proj;
async function getV3Proj(req: ReqTB<GetV3Proj>, res: RepTB<GetV3Proj>): Promise<void> {
  let ctxUser = req.ctx.getUser();
  let hasPerm = await authzService.checkPermission(ctxUser.user_id, 'jcd.read');
  if(!hasPerm) {
    return res.status(403).send({ errMsg: 'Permission denied' });
  }
  let env = req.params.envKey;
  let projKeyDtos = await jcdProjService.getKeys(env);
  return res.status(200).send(projKeyDtos);
}

const PostV3ProjCopy = {
  params: Type.Object({
    /* When fromEnv is omitted, will be default env _*/
    fromEnvKey: Type.String(),
    /* When toEnv is '1', will be default env _*/
    toEnvKey: Type.String(),
    projKey: Type.String(),
  }),
  response: {
    200: Type.Object({
      outcome: Type.String(),
      ops: Type.Object({
        inserted: Type.Array(GcpKeyDto.schema),
        skipped: Type.Array(GcpKeyDto.schema),
      }),
    }),
    403: Type.Object({ errMsg: Type.String() }),
  }
} as const satisfies FastifySchema;
type PostV3ProjCopy = typeof PostV3ProjCopy;
async function postV3ProjCopy(
  req: ReqTB<PostV3ProjCopy>,
  res: RepTB<PostV3ProjCopy>,
): Promise<void> {
  let ctxUser = req.ctx.getUser();
  let hasPerm = await authzService.checkPermission(ctxUser.user_id, 'jcd.mgmt');
  if(!hasPerm) {
    return res.status(403).send({ errMsg: 'Permission denied' });
  }
  let fromEnv = req.params.fromEnvKey;
  let toEnv = req.params.toEnvKey;
  let projKey = req.params.projKey;

  if(jcdService.checkDefaultEnv(toEnv)) {
    return res.status(403).send({ errMsg: 'cannot copy to default env (yet)' });
  }
  if(fromEnv === toEnv) {
    return res.status(403).send({ errMsg: 'cannot copy from env to itself'});
  }
  let copyRes = await jcdProjService.copyProjV3({ projKey, fromEnv, toEnv });
  let inserted: GcpKeyDto[] = copyRes.inserted.map(insertedKey => {
    return GcpKeyDto.decode(Object.assign({}, insertedKey));
  });
  let skipped: GcpKeyDto[] = copyRes.skipped.map(skippedKey => {
    return GcpKeyDto.decode(Object.assign({}, skippedKey));
  });
  return res.status(200).send({
    outcome: 'success',
    ops: {
      inserted,
      skipped,
    }});
}

const DeleteV3Proj = {
  params: Type.Object({
    projKey: Type.String(),
    envKey: Type.String(),
  }),
  querystring: Type.Object({
    img: Type.Optional(Type.Boolean()),
  }),
  response: {
    200: Type.Optional(Type.Object({})),
    403: Type.Object({ errMsg: Type.String() }),
  },
} satisfies FastifySchema;
type DeleteV3Proj = typeof DeleteV3Proj;
async function deleteV3Proj(req: ReqTB<DeleteV3Proj>, res: RepTB<DeleteV3Proj>): Promise<void> {
  let ctxUser = req.ctx.getUser();
  let hasPerm = await authzService.checkPermission(ctxUser.user_id, 'jcd.mgmt');
  if(!hasPerm) {
    return res.status(403).send({ errMsg: 'Permission denied' });
  }
  let projKey = req.params.projKey;
  let env = req.params.envKey;
  let img = req.query.img;
  try {
    await jcdProjService.deleteProjV3(projKey, { env, img });
  } catch(e) {
    if(EzdError.is(e) && e.code === 'JCD_1.1') {
      return res.status(403).send({ errMsg: e.message });
    }
    throw e;
  }
  return res.status(200).send({});
}

export const jcdEnvCtrl = {
  GetJcdNamespace,
  getJcdNamespace,
  GetJcdKinds,
  getJcdKinds,
  GetJcdKindEntities,
  getJcdKindEntities,
  PostJcdCopyEnvKind,
  postJcdCopyEnvKind,

  GetV3Proj,
  getV3Proj,
  PostV3ProjCopy,
  postV3ProjCopy,
  DeleteV3Proj,
  deleteV3Proj,
};
