
import assert from 'node:assert';
import { gcpDb } from '../client/gcp-db';
import { JcdProject } from '../models/jcd/jcd-project';
import { JcdProjectOrder } from '../models/jcd/jcd-project-order';
import { JcdImage } from '../models/jcd/jcd-image';
import { JcdProjPreview } from '../models/jcd/jcd-proj-preview';
import { EzdTestV3 } from '../models/jcd/ezd-test-v3';
import { authzService } from './authz-service';
import { EzdError } from '../models/error/ezd-error';

// const do_cache = ezdConfig.USE_JCD_CACHE;
// const jcdCache = JcdCache.init();

const jcd_v3_db_project_kind = 'JcdProjectV3';
const jcd_v3_db_image = 'JcdImageV3';
const jcd_v3_db_project_order = 'JcdProjectOrderV3';
const jcd_v3_ezd_test = 'EzdTestV3';

/* JCD project service _*/
export const jcdProjService = new class JcdProjService {
  getProjPreviews = getProjPreviews;
  getProjects = getProjects;
  getProjectByRoute = getProjectByRoute;
  getProjectOrders = getProjectOrders;
  getTitleImages = getTitleImages;

  getEzdTest = getEzdTest;
};

async function getProjPreviews(): Promise<JcdProjPreview[]> {
  let [ jcdProjects, jcdProjectOrders, jcdTitleImages ] = await Promise.all([
    jcdProjService.getProjects(),
    jcdProjService.getProjectOrders(),
    jcdProjService.getTitleImages(),
  ]);
  let jcdProjPreviews: JcdProjPreview[] = jcdProjects.map(jcdProj => {
    let foundJcdOrder = jcdProjectOrders.find(jcdOrder => {
      return jcdOrder.projectKey === jcdProj.projectKey;
    });
    assert(foundJcdOrder !== undefined);
    let foundJcdTitleImage = jcdTitleImages.find(jcdImage => {
      return jcdImage.projectKey === jcdProj.projectKey;
    });
    assert(foundJcdTitleImage !== undefined);
    let projPreview: JcdProjPreview = {
      projectKey: jcdProj.projectKey,
      route: jcdProj.route,
      title: jcdProj.title,
      titleUri: foundJcdTitleImage.bucketFile,
      orderIndex: foundJcdOrder.orderIdx,
    };
    return projPreview;
  });
  return jcdProjPreviews;
}

async function getProjects(): Promise<JcdProject[]> {
  let jcdProjects: JcdProject[];
  let query = gcpDb.createQuery(jcd_v3_db_project_kind);
  let projectsRes = await query.run();
  jcdProjects = projectsRes[0].map(JcdProject.decode);
  return jcdProjects;
}

async function getProjectByRoute(routeKey: string): Promise<JcdProject | undefined> {
  let query = gcpDb.createQuery(jcd_v3_db_project_kind).filter('route', '=', routeKey).limit(1);
  let queryRes = await query.run();
  if(queryRes[0][0] === undefined) {
    return;
  }
  let jcdProj = JcdProject.decode(queryRes[0][0]);
  return jcdProj;
}

async function getProjectOrders(): Promise<JcdProjectOrder[]> {
  let query = gcpDb.createQuery(jcd_v3_db_project_order);
  let projectOrdersRes = await query.run();
  let jcdProjectOrders = projectOrdersRes[0].map(JcdProjectOrder.decode);
  return jcdProjectOrders;
}

async function getTitleImages(): Promise<JcdImage[]> {
  let query = gcpDb.createQuery(jcd_v3_db_image).filter('imageType', '=', 'TITLE');
  let imageQueryRes = await query.run();
  let jcdImages = imageQueryRes[0].map(JcdImage.decode);
  return jcdImages;
}

async function getEzdTest(asUserId: string, ns: string = ''): Promise<EzdTestV3[]> {
  let hasJcdPerm = await authzService.checkPermission(asUserId, 'jcd.test');
  if(!hasJcdPerm) {
    throw new EzdError(`Permission denied for userId: ${asUserId}`, 'EZD_5.4');
  }
  let query = gcpDb.createQuery(ns, jcd_v3_ezd_test);
  let queryRes = await query.run();
  let ezdTestV3s = queryRes[0].map((val: Record<string, unknown>) => {
    val = transformGcpObj(val);
    return EzdTestV3.decode(val);
  });
  return ezdTestV3s;
}

function transformGcpObj(obj: Record<string, unknown>): Record<string, unknown> {
  let res = Object.assign({}, obj);
  for(const k in res) {
    if(res[k] instanceof Date) {
      res[k] = res[k].toISOString();
    }
  }
  return res;
}
