
import assert from 'node:assert';
import { PropertyFilter } from '@google-cloud/datastore';
import { entity } from '@google-cloud/datastore/build/src/entity';
import { Storage } from '@google-cloud/storage';
import { gcpDb } from '../client/gcp-db';
import { JcdV3GcpEntity } from '../models/jcd/jcd-v3-gcp-entity';
import { jcdProjService } from './jcd-proj-service';
import { JcdImage } from '../models/jcd/jcd-image';
import { jcdImgUtil } from '../lib/jcd/jcd-img-util';
import { EzdError } from '../models/error/ezd-error';
import { jcdCfg } from '../config/jcd-config';
import { jcdService } from './jcd-service';
import { jcdFs } from './jcd-file-service';
import { JcdUploadProjImageResDto } from '../models/jcd/jcd-upload-proj-image-res-dto';
import { prim } from '../../util/validate-primitives';
import { ezdCache } from '../lib/ezd-cache';

export const jcdEnvService = {
  copyProjImgsV3: copyProjImgsV3,
  copyProjV3: copyProjV3,
} as const;

type CopyImgV3Opts = {
  projKey: string;
  fromEnv: string;
  toEnv: string;
  imgFiles: boolean;
} & {};
async function copyProjImgsV3(opts: CopyImgV3Opts) {
  if(jcdService.checkDefaultEnv(opts.toEnv)) {
    throw new EzdError('Copying images to default env not permitted (yet)', 'JCD_1.0');
  }
  let srcProj = await jcdProjService.getProject(opts.projKey, opts.fromEnv);
  if(srcProj === undefined) {
    throw new EzdError(`Project ${opts.projKey} not found in env ${opts.fromEnv}`, 'JCD_2.2');
  }
  let srcImgs = (await getV3Entities(
    jcdProjService.jcd_v3_db_image,
    opts.projKey,
    opts.fromEnv
  )).map(entity => JcdImage.parse(entity.data));
  let existingDestImgs = await jcdProjService.getProjectImages(opts.projKey, opts.toEnv);
  /*
  for each image from source:
    get new bucketfile path
    compare new bucketFile path to current
    if they differ, change properties to match:
      jcdImage.bucketFile
      jcdImage.id
    the new entity will have a new key, equal to jcdImage.id
  _*/
  let imgPairs: [srcImg: JcdImage, destImg: JcdImage][] = [];
  for(let i = 0; i < srcImgs.length; i++) {
    let destImg = JcdImage.clone(srcImgs[i]);
    JcdV3GcpEntity.deleteKey(destImg); // delete key to prevent accidental GCP operations
    let filename = destImg.bucketFile.split(jcdImgUtil.gcs_path_delim).pop();
    if(filename === undefined) {
      throw new EzdError(`Invalid filename in bucketFile: ${destImg.bucketFile}`, 'JCD_1.5');
    }
    let destBucketFile = [ srcProj.route, filename ].join(jcdImgUtil.gcs_path_delim);
    if(
      destImg.bucketFile !== destBucketFile
      || destImg.id !== destBucketFile
    ) {
      destImg.bucketFile = destBucketFile;
      destImg.id = destBucketFile;
    }
    /* check if img already exists in dest */
    let existingImg = existingDestImgs.find(jcdImg => {
      return jcdImg.bucketFile === destImg.bucketFile;
    });
    if(existingImg === undefined) {
      imgPairs.push([ srcImgs[i], destImg ]);
    }
  }
  /* Insert images in target env _*/
  let destImgEntities: JcdV3GcpEntity[] = imgPairs.map(imgPair => {
    let destImg = imgPair[1];
    let destImgEntity = {
      data: destImg,
      key: gcpDb.key({
        namespace: opts.toEnv,
        path: [ jcdProjService.jcd_v3_db_image, destImg.id ],
      })
    };
    return destImgEntity;
  });
  await gcpDb.insert(destImgEntities);
  if(opts.imgFiles === false) {
    /* skip image uploads. Currently only for api tests. _*/
    return;
  }
  /*
  initiate the uploads
  _*/
  const isFromDefaultEnv = jcdService.checkDefaultEnv(opts.fromEnv);
  let srcGcsBucketName: string = (isFromDefaultEnv)
    ? jcdCfg.img_v3.bucket
    : jcdCfg.img_v4.bucket
  ;
  let storage = new Storage();
  let uploadPromises: Promise<JcdUploadProjImageResDto>[] = [];
  for(let i = 0; i < imgPairs.length; i++) {
    let [ srcImg, destImg ] = imgPairs[i];
    let srcBucket = storage.bucket(srcGcsBucketName);
    let gcsFile = srcBucket.file(srcImg.bucketFile);
    let [ fileExists ] = await gcsFile.exists();
    if(!fileExists) {
      throw new EzdError(`Source image not found: ${
        srcImg.bucketFile
      }, env: ${opts.fromEnv}`,'JCD_1.3');
    }
    let [ gcsMeta ] = await gcsFile.getMetadata();
    if(gcsMeta.contentType === undefined) {
      throw new EzdError(`No contentType in metatadata for source image: ${
        srcImg.bucketFile
      }, env: ${opts.fromEnv}`, 'JCD_1.4');
    }
    let destMimetype = gcsMeta.contentType;
    let destFilename = destImg.bucketFile.split(jcdImgUtil.gcs_path_delim).pop();
    if(destFilename === undefined) {
      throw new EzdError(`Invalid filename in bucketFile: ${destImg.bucketFile}`, 'JCD_1.5');
    }
    let uploadPromise = jcdFs.uploadProjImg({
      env: opts.toEnv,
      jcdImage: destImg,
      file: {
        rs: gcsFile.createReadStream(),
        filename: destFilename,
        mimetype: destMimetype,
      }
    });
    uploadPromises.push(uploadPromise);
  }
  await Promise.all(uploadPromises);
}

/*
  jcd v3 entities:
    - JcdProjectKeyV3
    - JcdProjectOrderV3
    - JcdImageV3
    - JcdProjectV3
  copy jcd v3 project from one namespace (env) to another
    1. check if the operation will overwrite any entities on the dest env
      - if so, skip those
    2. copy all of the entities over to the dest env (toEnv)
    3. for now, it's an error case if toEnv is the default GCP namespace
_*/
// type JcdV3GcpEntity<T = Record<string | number | symbol, unknown>> = {
//   key: entity.Key;
//   data: T;
// } & {};
type JcdEnvCopyProjRes = {
  inserted: entity.Key[];
  skipped: entity.Key[];
} & {};
type JcdEnvCopyProjOpts = {
  projKey: string;
  fromEnv: string;
  toEnv: string;
  imgFiles: boolean;
} & {};
async function copyProjV3(opts: JcdEnvCopyProjOpts): Promise<JcdEnvCopyProjRes> {
  if(jcdService.checkDefaultEnv(opts.toEnv)) {
    throw new EzdError('copy to default env not permitted (yet)', 'JCD_1.0');
  }
  if(opts.fromEnv === opts.toEnv) {
    throw new EzdError('cannot copy env to self', 'JCD_1.0');
  }
  let srcEntitiesPromises = [
    getV3Entities(jcdProjService.jcd_v3_project_key, opts.projKey, opts.fromEnv),
    getV3Entities(jcdProjService.jcd_v3_db_project_order, opts.projKey, opts.fromEnv),
    getV3Entities(jcdProjService.jcd_v3_db_project_kind, opts.projKey, opts.fromEnv),
  ];
  let srcEntities: JcdV3GcpEntity[] = (await Promise.all(srcEntitiesPromises)).flat();
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
  let rawDestEntities = (await gcpDb.get(destInsertEntityKeys))[0];
  assert(Array.isArray(rawDestEntities));
  let destEntities: JcdV3GcpEntity[] = rawDestEntities.map(JcdV3GcpEntity.decode);

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
  await jcdEnvService.copyProjImgsV3({
    fromEnv: opts.fromEnv,
    toEnv: opts.toEnv,
    projKey: opts.projKey,
    imgFiles: opts.imgFiles,
  });
  ezdCache.bust();
  return {
    inserted: insertedKeys,
    skipped: skippedKeys,
  };
}

async function getV3Entities(
  entityName: string,
  projKey: string,
  env: string
): Promise<JcdV3GcpEntity[]> {
  let query = gcpDb.query(entityName, env)
    .filter(new PropertyFilter('projectKey', '=', projKey))
  ;
  let entities: JcdV3GcpEntity[] = (await query.run())[0].map(JcdV3GcpEntity.decode);
  return entities;
}
