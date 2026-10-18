
import streamp from 'node:stream/promises';
import type { MultipartFile } from '@fastify/multipart';
import { Storage } from '@google-cloud/storage';

import { EzdError } from '../models/error/ezd-error';
import { hashUtil } from '../lib/hash-util';
import { jcdProjService } from './jcd-proj-service';
import { jcdCfg } from '../config/jcd-config';
import { jobService } from './job-service';
import { JcdImgProcJobData } from '../models/job/jcd-img-proc-job-data';
import { jcdImgUtil } from '../lib/jcd/jcd-img-util';
import { jcdImageSize } from '../models/jcd/jcd-image-size';

export const jcdFs = {
  delImgFiles: delImgFiles,
  getImgFile: getImgFile,
  uploadProjImg: uploadProjImg,
} as const;

type DelImgFilesOpts = {
  env: string;
  imgPath: string;
} & {};
async function delImgFiles(opts: DelImgFilesOpts) {
  let fmtKeys = Object.values(jcdImageSize.image_size_map);
  let bucketPath = jcdImgUtil.getImgV4BucketPath(opts.env, opts.imgPath);
  let gcsResizeFilePaths = fmtKeys.map((fmtKey) =>{
    return jcdImgUtil.getResizePath(bucketPath, fmtKey);
  });
  let gcsSrcFilePath = jcdImgUtil.getSrcPath(bucketPath);
  let gcsFilePaths = [
    ...gcsResizeFilePaths,
    gcsSrcFilePath,
  ];
  let storage = new Storage();
  let bucket = storage.bucket(jcdCfg.img_v4.bucket);
  let gcsFiles = gcsFilePaths.map((gcsPath) => bucket.file(gcsPath));
  for(let i = 0; i < gcsFiles.length; i++) {
    let gcsFile = gcsFiles[i];
    let [ gcsFileExists ] = await gcsFile.exists();
    if(gcsFileExists) {
      await gcsFile.delete();
    }
  }
}

async function getImgFile(env: string, imgPath: string, sz?: string) {
  let bucketPath = jcdImgUtil.getImgV4BucketPath(env, imgPath);
  if(!jcdImageSize.checkImgSize(sz)) {
    /* could also be an error. For now just set to the default _*/
    sz = undefined;
  }
  let resizePath = (sz === undefined)
    ? jcdImgUtil.getSrcPath(bucketPath)
    : jcdImgUtil.getResizePath(bucketPath, sz)
  ;
  let storage = new Storage();
  let bucket = storage.bucket(jcdCfg.img_v4.bucket);
  let gcsFile = bucket.file(resizePath);
  let [ fileExists ] = await gcsFile.exists();
  if(!fileExists) {
    return new EzdError(`Img not found: ${resizePath}`, 'JCD_2.5');
  }
  return gcsFile;
}

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
  let jcdImage = await jcdProjService.createImg(imgBucketFile, projKey, env, {
    imageType,
  });
  let bucketFilePath = jcdImgUtil.getImgV4BucketPath(env, imgBucketFile);
  let srcBucketFilePath = jcdImgUtil.getSrcPath(bucketFilePath);
  let gcsImgUploadRes = await uploadGcsImg(srcBucketFilePath, file);
  let procImgJobData: JcdImgProcJobData = {
    srcPath: srcBucketFilePath,
    destPath: jcdImage.bucketFile,
    env: env,
    jcdImageKey: jcdImage.id,
    projectKey: jcdImage.projectKey,
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
  let hashStr = hasher.digest('hex');
  let metadataResp = await gcsFile.setMetadata({
    metadata: {
      sha1: hashStr,
    }
  });
  return { hash: hashStr };
}
