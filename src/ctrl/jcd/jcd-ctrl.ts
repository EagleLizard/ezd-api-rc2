
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
import { JcdEntityExportDto } from '../../lib/models/jcd/jcd-export';
import { ezdConfig } from '../../lib/config';

const GetJcdProjects = {
  querystring: Type.Object({
    route: Type.Optional(Type.String()),
    preview: Type.Optional(Type.Boolean()),
  }),
  response: {
    200: Type.Union([
      Type.Array(JcdProject.schema),
      JcdProject.schema,
      Type.Array(JcdProjPreview.schema),
      JcdProjPreview.schema,
    ]),
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
  if(req.query.preview) {
    if(req.query.route !== undefined) {
      let jcdProjPreview = await jcdProjService.getProjPreviewByRoute(req.query.route);
      return res.status(200).send(jcdProjPreview);
    }
    let projPreviews = await jcdProjService.getProjPreviews();
    return res.status(200).send(projPreviews);
  }
  if(req.query.route !== undefined) {
    let jcdProject = await jcdProjService.getProjectByRoute(req.query.route);
    return res.status(200).send(jcdProject);
  }
  let jcdProjects = await jcdProjService.getProjects();
  return res.status(200).send(jcdProjects);
}

const jcd_img_route_prefix = '/v1/jcd/img';
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
  let resp = await fetch(proxyUrl);
  if(resp.body === null) {
    return res.status(404).send();
  }
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
    return res.status(403).send();
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
async function getJcdExport(req: ReqTB<GetJcdExport>, res: RepTB<GetJcdExport>) {
  let ctxUser = req.ctx.getUser();
  let hasExportPerm = await authzService.checkPermission(ctxUser.user_id, 'jcd.export');

  if(!hasExportPerm) {
    return res.status(403).send();
  }

  let exportRes = await jcdService.getExport();

  return res.status(200).send(exportRes);
}

export const jcdCtrl = new class JcdCtrl {
  jcd_img_route_prefix = jcd_img_route_prefix;
  GetJcdProjects = GetJcdProjects;
  GetJcdImg = GetJcdImg;
  GetEzdTest = GetEzdTest;
  GetJcdExport = GetJcdExport;
  getProjects = getProjects;
  getImg = getJcdImg;
  getEzdTest = getEzdTest;
  getJcdExport = getJcdExport;
};

