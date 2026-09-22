
import type { FastifySchema } from 'fastify';
import { Type } from 'typebox';

import type { RepTB, ReqTB } from '../../lib/models/fastify/fastify-typebox';
import { JcdProjKeyDto } from '../../lib/models/jcd/jcd-proj-key-dto';
import { authzService } from '../../lib/service/authz-service';
import { jcdProjService } from '../../lib/service/jcd-proj-service';
import { jcdService } from '../../lib/service/jcd-service';
import { GcpKeyDto } from '../../lib/models/gcp/gcp-key-dto';
import { EzdError } from '../../lib/models/error/ezd-error';
import { ezdErrorCodes } from '../../lib/models/error/ezd-error-codes';

/*
Env and Namespace are synonymous
_*/

const GetV3Proj = {
  querystring: Type.Object({
    env: Type.Optional(Type.String()),
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
  let env = req.query.env;
  let projKeyDtos = await jcdProjService.getKeys(env);
  return res.status(200).send(projKeyDtos);
}

const PostV3ProjCopy = {
  params: Type.Object({
    projKey: Type.String(),
  }),
  body: Type.Object({
    /* When fromEnv is omitted, will be default env _*/
    fromEnv: Type.Optional(Type.String()),
    /* When toEnv is '1', will be default env _*/
    toEnv: Type.String(),
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
  let fromEnv = req.body.fromEnv;
  let toEnv = req.body.toEnv;
  let projKey = req.params.projKey;

  if(toEnv === jcdService.default_env_id || toEnv.includes('default')) {
    /* todo: remove this when ready to copy to default env/ns _*/
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
  }),
  querystring: Type.Object({
    env: Type.Optional(Type.String()),
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
  let env = req.query.env;
  let img = req.query.img;
  try {
    await jcdProjService.deleteProjV3(projKey, { env, img });
  } catch(e) {
    if(EzdError.is(e) && e.code === ezdErrorCodes.jcd_env_del_not_allowed) {
      return res.status(403).send({ errMsg: e.message });
    }
    throw e;
  }
  return res.status(200).send({});
}

export const jcdEnvCtrl = {
  GetV3Proj,
  getV3Proj,
  PostV3ProjCopy,
  postV3ProjCopy,
  DeleteV3Proj,
  deleteV3Proj,
};
