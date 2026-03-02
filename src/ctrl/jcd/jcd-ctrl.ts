
import { FastifySchema } from 'fastify';
import { Type } from 'typebox';

import { RepTB, ReqTB } from '../../lib/models/fastify/fastify-typebox';
import { authzService } from '../../lib/service/authz-service';
import { jcdProjService } from '../../lib/service/jcd-proj-service';
import { JcdProjPreview } from '../../lib/models/jcd/jcd-proj-preview';
import { JcdProject } from '../../lib/models/jcd/jcd-project';
import { EzdTestV3 } from '../../lib/models/jcd/ezd-test-v3';
import { EzdError } from '../../lib/models/error/ezd-error';
import { jcdService } from '../../lib/service/jcd-service';

const GetJcdProjects = {
  querystring: Type.Object({
    route: Type.Optional(Type.String())
  }),
  response: {
    200: Type.Union([ Type.Array(JcdProjPreview.schema), JcdProject.schema ]),
    403: Type.Optional(Type.Object({})),
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
    return res.status(403).send();
  }
  if(req.query.route !== undefined) {
    let jcdProject = await jcdProjService.getProjectByRoute(req.query.route);
    return res.status(200).send(jcdProject);
  }
  let projPreviews = await jcdProjService.getProjPreviews();
  return res.status(200).send(projPreviews);
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
    return res.status(403).send();
  }
  let ezdTestV3s = await jcdProjService.getEzdTest(ctxUser.user_id, ns);
  return res.status(200).send(ezdTestV3s);
}

const GetJcdExport = {
  response: {
    200: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    403: Type.Optional(Type.Object({})),
  }
} as const satisfies FastifySchema;
type GetJcdExport = typeof GetJcdExport;
async function getJcdExport(req: ReqTB<GetJcdExport>, res: RepTB<GetJcdExport>) {
  let ctxUser = req.ctx.getUser();
  let hasExportPerm = await authzService.checkPermission(ctxUser.user_id, 'jcd.export');

  if(!hasExportPerm) {
    return res.status(403).send();
  }

  let exportRes = await jcdService.getExport();
  console.log({exportRes});

  return res.status(200).send(exportRes);
}

export const jcdCtrl = new class JcdCtrl {
  GetJcdProjects = GetJcdProjects;
  GetEzdTest = GetEzdTest;
  GetJcdExport = GetJcdExport;
  getProjects = getProjects;
  getEzdTest = getEzdTest;
  getJcdExport = getJcdExport;
};

