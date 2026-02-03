
import { FastifySchema } from 'fastify';
import { Type } from 'typebox';

import { RepTB, ReqTB } from '../../lib/models/fastify/fastify-typebox';
import { authzService } from '../../lib/service/authz-service';
import { jcdProjService } from '../../lib/service/jcd-proj-service';
import { JcdProjPreview } from '../../lib/models/jcd/jcd-proj-preview';

// export const JCD_V3_DB_PROJECT_KIND = 'JcdProjectV3';

const GetJcdProjects = {
  response: {
    200: Type.Array(JcdProjPreview.schema),
    403: Type.Optional(Type.Object({})),
  }
} as const satisfies FastifySchema;
type GetJcdProjects = typeof GetJcdProjects;

export const jcdCtrl = new class JcdCtrl {
  GetJcdProjects = GetJcdProjects;
  getProjects = getProjects;
};

async function getProjects(
  req: ReqTB<GetJcdProjects>,
  res: RepTB<GetJcdProjects>
) {
  let ctxUser = req.ctx.getUser();
  let hasJcdPerm = await authzService.checkPermission(ctxUser.user_id, 'jcd.proj.read');
  if(!hasJcdPerm) {
    return res.status(403).send();
  }
  let projPreviews = await jcdProjService.getProjPreviews();
  return res.status(200).send(projPreviews);
}
