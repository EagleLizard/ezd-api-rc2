
import streamp from 'node:stream/promises';
import type { MultipartFile } from '@fastify/multipart';
import { Storage } from '@google-cloud/storage';

import { EzdError } from '../models/error/ezd-error';
import { hashUtil } from '../lib/hash-util';
import { jcdProjService } from './jcd-proj-service';
import { jcdCfg } from '../config/jcd-config';
import { jobService } from './job-service';
import { JcdImgProcJobData } from '../models/job/jcd-img-proc-job';

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
  _*/
  let jcdProj = await jcdProjService.getProject(projKey, env);
  if(jcdProj === undefined) {
    throw new EzdError(`Project ${projKey} not found`, 'JCD_2.2');
  }
  let imgBucketFile = [ jcdProj.route, file.filename ].join('/');
  await jcdProjService.createImg(imgBucketFile, projKey, env, {
    imageType,
  });
  let bucketFilePath = [
    jcdCfg.img_v4.src_folder,
    imgBucketFile,
  ].join('/');
  let gcsImUploadRes = await uploadGcsImg(bucketFilePath, file);
  let procImgJobData: JcdImgProcJobData = {
    srcPath: bucketFilePath,
  };
  let jobDataStr = JSON.stringify(procImgJobData);
  let jobDto = await jobService.enqueue('jcd_img_proc', jobDataStr);
}

type GcsImgUploadRes = {
  hash: string;
} & {};
async function uploadGcsImg(
  gcsFilePath: string,
  file: MultipartFile
): Promise<GcsImgUploadRes | void> {
  let hasher = hashUtil.getHasher();
  let storage = new Storage;
  let bucket = storage.bucket(jcdCfg.img_v4.bucket);
  let gcsFile = bucket.file(gcsFilePath);
  /*
  TODO:xxx: throw error if file exists
  _*/
  file.file.on('data', (chunk) => {
    if(!Buffer.isBuffer(chunk)) {
      file.file.emit('error', new EzdError('unexpected non-buffer stream data', 'JCD_2.1'));
    }
    hasher.update(chunk);
  });
  await streamp.pipeline([ file.file, gcsFile.createWriteStream() ]);
  let hashStr = hasher.digest();
  let metadataResp = await gcsFile.setMetadata({
    metadata: {
      sha1: hashStr,
    }
  });
  return { hash: hashStr };
}
