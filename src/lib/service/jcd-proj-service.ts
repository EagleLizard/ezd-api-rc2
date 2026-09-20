
import assert from 'node:assert';
import { entity } from '@google-cloud/datastore/build/src/entity';

import { gcpDb } from '../client/gcp-db';
import { JcdProject } from '../models/jcd/jcd-project';
import { JcdProjectOrder } from '../models/jcd/jcd-project-order';
import { JcdImage } from '../models/jcd/jcd-image';
import { JcdProjPreview } from '../models/jcd/jcd-proj-preview';
import { EzdTestV3 } from '../models/jcd/ezd-test-v3';
import { authzService } from './authz-service';
import { EzdError } from '../models/error/ezd-error';
import { ezdCache, EzdCacheItem } from '../lib/ezd-cache';
import { JcdProjKeyDto } from '../models/jcd/jcd-proj-key-dto';
import { prim } from '../../util/validate-primitives';
import { jcdService } from './jcd-service';
import { ezdErrorCodes } from '../models/error/ezd-error-codes';

const jcd_v3_project_key = 'JcdProjectKeyV3';
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
  getKeys = getKeys;
  copyProjV3 = copyProjV3;
  getProjPreviews = getProjPreviews;
  getProjPreviewByRoute = getProjPreviewByRoute;
  getProjects = getProjects;
  getProjectByRoute = getProjectByRoute;
  getProjectOrders = getProjectOrders;
  getProjectImages = getProjectImages;
  getTitleImages = getTitleImages;

  getEzdTest = getEzdTest;
};

async function getKeys(env?: string): Promise<JcdProjKeyDto[]> {
  let query = gcpDb.query('JcdProjectKeyV3', env);
  let queryRes = await query.run();
  let projKeyDtos = queryRes[0].map(rawVal => JcdProjKeyDto.decode(rawVal));
  return projKeyDtos;
}

/*
jcd v3 entities:
  - JcdProjectKeyV3
  - JcdProjectOrderV3
  - JcdImageV3
  - JcdProjectV3
_impl. plan_
  copy jcd v3 project from one namespace (env) to another
  want to check if a copy can happen:
    1. check if the operation will overwrite any entities on the dest env
      - not sure what options exist to handle this case gracefully
    2. copy all of the entities over to the dest env (toEnv)
    3. for now, it's an error case if toEnv is the default GCP namespace
_*/
type JcdV3GcpEntity<T = Record<string | number | symbol, unknown>> = {
  key: entity.Key;
  data: T;
} & {};
type JcdEnvCopyProjRes = {
  inserted: entity.Key[];
  skipped: entity.Key[];
} & {};
type JcdEnvCopyProjOpts = {
  projKey: string;
  fromEnv?: string;
  toEnv: string;
} & {};
async function copyProjV3(opts: JcdEnvCopyProjOpts): Promise<JcdEnvCopyProjRes> {
  if(opts.toEnv === jcdService.default_env_id || opts.toEnv.includes('default')) {
    throw new EzdError(
      'copy to default env not permitted yet',
      ezdErrorCodes.jcd_env_copy_not_allowed
    );
  }
  let srcEntitiesPromises = [
    getV3SrcEntities(jcd_v3_project_key, opts.projKey),
    getV3SrcEntities(jcd_v3_db_project_order, opts.projKey),
    getV3SrcEntities(jcd_v3_db_project_kind, opts.projKey),
    getV3SrcEntities(jcd_v3_db_image, opts.projKey),
  ];
  let srcEntityArrs = (await Promise.all(srcEntitiesPromises));
  let srcEntities: JcdV3GcpEntity[] = [];
  for(let i = 0; i < srcEntityArrs.length; i++) {
    for(let k = 0; k < srcEntityArrs[i].length; k++) {
      srcEntities.push(srcEntityArrs[i][k]);
    }
  };
  let destInsertEntityKeys: entity.Key[] = srcEntities.map(srcEntity => {
    assert(prim.isString(srcEntity.key.name));
    let key = gcpDb.key({
      namespace: opts.toEnv,
      path: [ srcEntity.key.kind, srcEntity.key.name ],
    });
    return key;
  });
  /*
  for now, skip entities that exist in the destination
  _*/
  let rawDestEntities = await gcpDb.get(destInsertEntityKeys);
  let destEntities: JcdV3GcpEntity[] = rawDestEntities[0].map((rawEntity: unknown) => {
    assert(prim.isObject(rawEntity));
    let key = rawEntity?.[gcpDb.KEY];
    assert(gcpDb.isKey(key));
    return {
      key,
      data: rawEntity,
    };
  });
  let destInsertEntities: JcdV3GcpEntity[] = [];
  let insertedKeys: entity.Key[] = [];
  let skippedKeys: entity.Key[] = [];
  for(let i = 0; i < destInsertEntityKeys.length; i++) {
    let destInsertKey = destInsertEntityKeys[i];
    let foundDestEntity = destEntities.find(destEntity => {
      return (
        destEntity.key.kind === destInsertKey.kind
        && destEntity.key.name === destInsertKey.name
      );
    });
    if(foundDestEntity === undefined) {
      let foundSrcEntity = srcEntities.find(srcEntity => {
        return (
          srcEntity.key.kind === destInsertKey.kind
          && srcEntity.key.name === destInsertKey.name
        );
      });
      assert(foundSrcEntity !== undefined);
      destInsertEntities.push({
        key: destInsertKey,
        data: foundSrcEntity.data
      });
      insertedKeys.push(destInsertKey);
    } else {
      skippedKeys.push(destInsertKey);
    }
  }
  await gcpDb.insert(destInsertEntities);
  return {
    inserted: insertedKeys,
    skipped: skippedKeys,
  };
}

async function getV3SrcEntities(
  entityName: string,
  projKey: string,
  env?: string
): Promise<JcdV3GcpEntity[]> {
  let query = gcpDb.query(entityName, env)
    .filter('projectKey', '=', projKey)
  ;
  let queryRes = await query.run();
  let entities: JcdV3GcpEntity[] = [];
  for(let i = 0; i < queryRes[0].length; i++) {
    let rawEntity = queryRes[0][i];
    assert(gcpDb.isKey(rawEntity?.[gcpDb.KEY]));
    let key = rawEntity[gcpDb.KEY];
    entities.push({
      key,
      data: rawEntity
    });
  }
  return entities;
}

async function getProjPreviews(env?: string): Promise<JcdProjPreview[]> {
  let cacheKey = `${env ? `-${env}` : ''}`;
  let cached = jcdProjectPreviewsCache.get(cacheKey);
  if(cached !== undefined) {
    return cached;
  }
  let [ jcdProjects, jcdProjectOrders, jcdTitleImages ] = await Promise.all([
    jcdProjService.getProjects(env),
    jcdProjService.getProjectOrders(env),
    jcdProjService.getTitleImages(env),
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
  jcdProjectPreviewsCache.set(cacheKey, jcdProjPreviews);
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

async function getProjects(env?: string): Promise<JcdProject[]> {
  let query = gcpDb.query(jcd_v3_db_project_kind, env);
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

async function getProjectOrders(env?: string): Promise<JcdProjectOrder[]> {
  let cacheKey = `${env ? `-${env}` : ''}`;
  let cached = jcdProjectOrdersCache.get(cacheKey);
  if(cached !== undefined) {
    return cached;
  }
  let query = gcpDb.createQuery(jcd_v3_db_project_order);
  let projectOrdersRes = await query.run();
  let jcdProjectOrders = projectOrdersRes[0].map(JcdProjectOrder.decode);
  jcdProjectOrdersCache.set(cacheKey, jcdProjectOrders);
  return jcdProjectOrders;
}

async function getTitleImages(env?: string): Promise<JcdImage[]> {
  let cacheKey = `${jcd_title_images_cache_key}${env ? `-${env}` : ''}`;
  let cached = jcdImagesCache.get(cacheKey);
  if(cached !== undefined) {
    return cached;
  }
  let query = gcpDb.createQuery(jcd_v3_db_image).filter('imageType', '=', 'TITLE');
  let imageQueryRes = await query.run();
  let jcdImages = imageQueryRes[0].map(JcdImage.decode);
  jcdImagesCache.set(cacheKey, jcdImages);
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
