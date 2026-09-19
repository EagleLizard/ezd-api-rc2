
import type { FastifySchema } from 'fastify';
import { Type } from 'typebox';

import type { RepTB, ReqTB } from '../../lib/models/fastify/fastify-typebox';
import { JcdProjKeyDto } from '../../lib/models/jcd/jcd-proj-key-dto';
import { authzService } from '../../lib/service/authz-service';
import { jcdProjService } from '../../lib/service/jcd-proj-service';
import { jcdService } from '../../lib/service/jcd-service';

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
    200: Type.Object({ result: Type.String() }), // todo: placeholder, replace
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
  await jcdProjService.copyProjV3({ projKey, fromEnv, toEnv });
  return res.status(200).send({ result: 'success' });
}

export const jcdEnvCtrl = {
  GetV3Proj,
  getV3Proj,
  PostV3ProjCopy,
  postV3ProjCopy,
};
