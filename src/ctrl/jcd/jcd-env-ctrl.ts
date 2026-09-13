
import type { FastifySchema } from 'fastify';
import { Type } from 'typebox';

import type { RepTB, ReqTB } from '../../lib/models/fastify/fastify-typebox';
import { JcdProjKeyDto } from '../../lib/models/jcd/jcd-proj-key-dto';
import { authzService } from '../../lib/service/authz-service';
import { jcdProjService } from '../../lib/service/jcd-proj-service';

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

export const jcdEnvCtrl = {
  GetV3Proj,
  getV3Proj,
};
