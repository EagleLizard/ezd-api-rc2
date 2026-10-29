
import streamp from 'node:stream/promises';
import { Storage } from '@google-cloud/storage';

import { EzdError } from '../models/error/ezd-error';
import { hashUtil } from '../lib/hash-util';
import { jcdCfg } from '../config/jcd-config';
import { jobService } from './job-service';
import { JcdImgProcJobData } from '../models/job/jcd-img-proc-job-data';
import { jcdImgUtil } from '../lib/jcd/jcd-img-util';
import { jcdImageSize } from '../models/jcd/jcd-image-size';
import { JobDto } from '../models/job/job-dto';
import { JcdImage } from '../models/jcd/jcd-image';
import { JcdUploadProjImageResDto } from '../models/jcd/jcd-upload-proj-image-res-dto';
import { Readable } from 'node:stream';
import { jcdService } from './jcd-service';

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
  await Promise.all(gcsFiles.map(gcsFile => (
    (async () => {
      let [ gcsFileExists ] = await gcsFile.exists();
      if(gcsFileExists) {
        await gcsFile.delete();
      }
    })()
  )));
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

type UploadProjImgOpts = {
  file: {
    rs: Readable;
    filename: string;
    mimetype: string;
  };
  jcdImage: JcdImage;
  env: string;
} & {};
async function uploadProjImg(opts: UploadProjImgOpts): Promise<JcdUploadProjImageResDto> {
  let jcdImage = opts.jcdImage;
  if(jcdService.checkDefaultEnv(opts.env)) {
    throw new EzdError('upload to default env not permitted (yet)', 'JCD_2.9');
  }
  if(!jcdCfg.img_v4.valid_mime_types.includes(opts.file.mimetype)) {
    throw new EzdError(`Invalid image mime type '${
      opts.file.mimetype
    }' for file: ${opts.file.filename}`, 'JCD_2.8');
  }
  let bucketFilePath = jcdImgUtil.getImgV4BucketPath(opts.env, jcdImage.bucketFile);
  let srcBucketFilePath = jcdImgUtil.getSrcPath(bucketFilePath);
  let gcsImgUploadRes = await uploadGcsImg(srcBucketFilePath, opts.file.rs);
  let procImgJobData: JcdImgProcJobData = {
    srcPath: srcBucketFilePath,
    destPath: jcdImage.bucketFile,
    env: opts.env,
    jcdImageKey: jcdImage.id,
    projectKey: jcdImage.projectKey,
  };
  let jobDataStr = JSON.stringify(procImgJobData);
  let jobDto: JobDto = await jobService.enqueue('jcd_img_proc', jobDataStr);

  let res: JcdUploadProjImageResDto = { jcdImage, job_id: jobDto.job_id };
  return res;
}

type GcsImgUploadRes = {
  hash: string;
} & {};
async function uploadGcsImg(
  gcsFilePath: string,
  file: Readable
): Promise<GcsImgUploadRes | void> {
  let hasher = hashUtil.getHasher();
  let storage = new Storage;
  let bucket = storage.bucket(jcdCfg.img_v4.bucket);
  let gcsFile = bucket.file(gcsFilePath);
  /*
  TODO:xxx: throw error if file exists
  _*/
  file.on('data', (chunk) => {
    if(!Buffer.isBuffer(chunk)) {
      file.emit('error', new EzdError('unexpected non-buffer stream data', 'JCD_2.1'));
    }
    hasher.update(chunk);
  });
  await streamp.pipeline([ file, gcsFile.createWriteStream() ]);
  let hashStr = hasher.digest('hex');
  let metadataResp = await gcsFile.setMetadata({
    metadata: {
      sha1: hashStr,
    }
  });
  return { hash: hashStr };
}
