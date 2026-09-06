
import assert from 'node:assert';

// import { Type } from 'typebox';

import { gcpDb } from '../client/gcp-db';
import { JcdProject } from '../models/jcd/jcd-project';
import { JcdProjectOrder } from '../models/jcd/jcd-project-order';
import { JcdImage } from '../models/jcd/jcd-image';
import { JcdProjPreview } from '../models/jcd/jcd-proj-preview';
import { EzdTestV3 } from '../models/jcd/ezd-test-v3';
import { authzService } from './authz-service';
import { EzdError } from '../models/error/ezd-error';
import { ezdCache, EzdCacheItem } from '../lib/ezd-cache';
// import { tbUtil } from '../../util/tb-util';

// const do_cache = ezdConfig.USE_JCD_CACHE;
// const jcdCache = JcdCache.init();

const jcd_v3_db_project_kind = 'JcdProjectV3';
const jcd_v3_db_image = 'JcdImageV3';
const jcd_v3_db_project_order = 'JcdProjectOrderV3';
const jcd_v3_ezd_test = 'EzdTestV3';

const jcd_title_images_cache_key = 'jcd_title_images';

const jcdProjCache: EzdCacheItem<JcdProject> = ezdCache.init<JcdProject>('jcd_project', (val) => {
  return JcdProject.decode(val);
});
const jcdProjectPreviewsCache: EzdCacheItem<JcdProjPreview[]> = ezdCache
  .init('jcd_project_previews', (vals) => {
    assert(Array.isArray(vals));
    let jcdProjPrevs: JcdProjPreview[] = vals.map(rawVal => JcdProjPreview.decode(rawVal));
    return jcdProjPrevs;
  });
const jcdProjectOrdersCache: EzdCacheItem<JcdProjectOrder[]> = ezdCache
  .init('jcd_project_orders', (vals) => {
    assert(Array.isArray(vals));
    let jcdProjOrders: JcdProjectOrder[] = vals.map(JcdProjectOrder.decode);
    return jcdProjOrders;
  });
const jcdImagesCache = ezdCache.init('jcd_project_images', (val) => {
  assert(Array.isArray(val));
  let jcdImages: JcdImage[] = val.map(rawVal => JcdImage.decode(rawVal));
  return jcdImages;
});

/* JCD project service _*/
export const jcdProjService = new class JcdProjService {
  getProjPreviews = getProjPreviews;
  getProjPreviewByRoute = getProjPreviewByRoute;
  getProjects = getProjects;
  getProjectByRoute = getProjectByRoute;
  getProjectOrders = getProjectOrders;
  getProjectImages = getProjectImages;
  getTitleImages = getTitleImages;

  getEzdTest = getEzdTest;
};

async function getProjPreviews(): Promise<JcdProjPreview[]> {
  let cached = jcdProjectPreviewsCache.get('');
  if(cached !== undefined) {
    return cached;
  }
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
  jcdProjPreviews.sort((a, b) => a.orderIndex - b.orderIndex);
  jcdProjectPreviewsCache.set('', jcdProjPreviews);
  return jcdProjPreviews;
}

async function getProjPreviewByRoute(
  route: string,
  ns?: string
): Promise<JcdProjPreview | undefined> {
  // let [ jcdProj, jcdProjOrders ] = await Promise.all([
  //   jcdProjService.getProjectByRoute(route),
  //   jcdProjService.getProjectOrders(),
  // ]);
  let jcdProj = await jcdProjService.getProjectByRoute(route, ns);
  if(jcdProj === undefined) {
    return undefined;
  }
  // let projOrder = jcdProjOrders.find((projOrder) => {
  //   return projOrder.projectKey === jcdProj.projectKey;
  // });
  let jcdImage = await getProjTitleImage(jcdProj.projectKey, ns);
  let projPreview: JcdProjPreview = {
    projectKey: jcdProj.projectKey,
    route: jcdProj.route,
    title: jcdProj.title,
    titleUri: jcdImage.bucketFile,
    // orderIndex: projOrder?.orderIdx ?? -1,
    orderIndex: -1,
  };
  return projPreview;
}

async function getProjTitleImage(projectKey: string, ns?: string): Promise<JcdImage> {
  let cacheKey = `jcd_title_image_${projectKey}${ns ? `-${ns}` : ''}`;
  let cached = jcdImagesCache.get(cacheKey)?.[0];
  if(cached !== undefined) {
    return cached;
  }
  let query = ns === undefined
    ? gcpDb.createQuery(jcd_v3_db_image)
    : gcpDb.createQuery(ns, jcd_v3_db_image)
  ;
  let jcdImgQuery = query
    .filter('imageType', '=', 'TITLE')
    .filter('projectKey', '=', projectKey)
    .limit(1)
  ;
  let imageQueryRes = (await jcdImgQuery.run())[0];
  let jcdImage = JcdImage.decode(imageQueryRes[0]);
  jcdImagesCache.set(cacheKey, [ jcdImage ]);
  return jcdImage;
}

async function getProjects(): Promise<JcdProject[]> {
  let query = gcpDb.createQuery(jcd_v3_db_project_kind);
  let projectsRes = await query.run();
  let jcdProjects = projectsRes[0].map(JcdProject.decode);
  return jcdProjects;
}

async function getProjectByRoute(routeKey: string, ns?: string): Promise<JcdProject | undefined> {
  let cacheKey = `${routeKey}${ns ? `_${ns}` : ''}`;
  let cachedProj = jcdProjCache.get(cacheKey);
  if(cachedProj !== undefined) {
    return cachedProj;
  }
  let query = ns === undefined
    ? gcpDb.createQuery(jcd_v3_db_project_kind)
    : gcpDb.createQuery(ns, jcd_v3_db_project_kind)
  ;
  query = query.filter('route', '=', routeKey)
    .limit(1)
  ;
  let queryRes = await query.run();
  if(queryRes[0][0] === undefined) {
    return;
  }
  let jcdProj = JcdProject.decode(queryRes[0][0]);
  jcdProjCache.set(cacheKey, jcdProj);
  return jcdProj;
}

async function getProjectImages(
  projectKey: string,
  opts: {active?: boolean} = {}
): Promise<JcdImage[]> {
  let query = gcpDb.createQuery(jcd_v3_db_image)
    .filter('projectKey', '=', projectKey);
  if(opts.active === true) {
    query = query.filter('active', true);
  }
  let queryRes = await query.run();
  let jcdImages = queryRes[0].map(JcdImage.decode);
  return jcdImages;
}

async function getProjectOrders(): Promise<JcdProjectOrder[]> {
  let cached = jcdProjectOrdersCache.get('');
  if(cached !== undefined) {
    return cached;
  }
  let query = gcpDb.createQuery(jcd_v3_db_project_order);
  let projectOrdersRes = await query.run();
  let jcdProjectOrders = projectOrdersRes[0].map(JcdProjectOrder.decode);
  jcdProjectOrdersCache.set('', jcdProjectOrders);
  return jcdProjectOrders;
}

async function getTitleImages(): Promise<JcdImage[]> {
  let cached = jcdImagesCache.get(jcd_title_images_cache_key);
  if(cached !== undefined) {
    return cached;
  }
  let query = gcpDb.createQuery(jcd_v3_db_image).filter('imageType', '=', 'TITLE');
  let imageQueryRes = await query.run();
  let jcdImages = imageQueryRes[0].map(JcdImage.decode);
  jcdImagesCache.set(jcd_title_images_cache_key, jcdImages);
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
