
import type { MultipartFile } from '@fastify/multipart';
import { Storage } from '@google-cloud/storage';

import { EzdError } from '../models/error/ezd-error';
import { hashUtil } from '../lib/hash-util';
import { jcdProjService } from './jcd-proj-service';
import { jcdCfg } from '../config/jcd-config';

export const jcdFs = {
  uploadProjImg: uploadProjImg,
} as const;

async function uploadProjImg(
  file: MultipartFile,
  imageType: 'TITLE' | 'GALLERY',
  projKey: string,
  env: string
): Promise<void> {
  /*
  - get existing jcd image
    - new images need more unique key than only image name
      > folderKey + file name
  - stream to source image bucket
    - path will be:
      img-v4-src/<jcd project route>/<image name>
    - if it exists already...
      > overwrite?
      > error?
  - get hash while streaming

  When a new GALLERY image is uploaded:
    calculate new orderIdx:
      - get existing images
      - if new orderIdx specified:
        > if in middle, update any order indices after
      - if orderIdx not specified, insert at end:
        > find max orderIdx in existing image list
        > set new orderIdx to max orderIdx + 1 (or some big number if we want gaps for future inserts)

  When a TITLE image is uploaded and one already exists:
    insert new title image entity
    then, update existing tile image:
      - change type to GALLERY
      - calculate new orderIdx
  _*/
  let jcdProj = await jcdProjService.getProject(projKey, env);
  if(jcdProj === undefined) {
    throw new EzdError(`Project ${projKey} not found`, 'JCD_2.2');
  }
  let imgBucketFile = [ jcdProj.route, file.filename ].join('/');
  let jcdV3Img = await jcdProjService.getImgByPath(imgBucketFile, env);
  if(jcdV3Img === undefined) {
    await jcdProjService.createImg(imgBucketFile, projKey, env, {
      imageType,
    });
  }
  let bucketFilePath = [
    jcdCfg.img_v4.src_folder,
    imgBucketFile,
  ].join('/');
  console.log(bucketFilePath);
  let gcsImUploadRes = await uploadGcsImg(bucketFilePath, file);
}

type GcsImgUploadRes = {
  hash: string;
} & {};
async function uploadGcsImg(gcsFilePath: string, file: MultipartFile): Promise<GcsImgUploadRes> {
  let deferred = Promise.withResolvers<void>();
  let hasher = hashUtil.getHasher();
  let storage = new Storage;
  let bucket = storage.bucket(jcdCfg.img_v4.bucket);
  let gcsFile = bucket.file(gcsFilePath);

  /*
  TODO:xxx: throw error if file exists
  _*/
  let gcsWs = file.file.pipe(gcsFile.createWriteStream());

  file.file.on('data', (chunk) => {
    if(!Buffer.isBuffer(chunk)) {
      throw new EzdError('unexpected non-buffer stream data', 'JCD_2.1');
    }
    hasher.update(chunk);
  });
  file.file.once('error', deferred.reject);

  gcsWs.once('error', deferred.reject);
  gcsWs.once('close', () => {
    deferred.resolve();
  });
  await deferred.promise;
  let hashStr = hasher.digest();
  let metadataResp = await gcsFile.setMetadata({
    metadata: {
      sha1: hashStr,
    }
  });
  return { hash: hashStr };
}
