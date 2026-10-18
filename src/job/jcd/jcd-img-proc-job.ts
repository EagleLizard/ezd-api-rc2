
import stream_p from 'node:stream/promises';
import path from 'node:path';
import fs from 'node:fs';
import { Storage, File } from '@google-cloud/storage';
import sharp from 'sharp';
import { JcdImgProcJobData } from '../../lib/models/job/jcd-img-proc-job-data';
import { JobDto } from '../../lib/models/job/job-dto';
import { jcdCfg } from '../../lib/config/jcd-config';
import { EzdError } from '../../lib/models/error/ezd-error';
import { jcdImageSize, JcdResizeFmt } from '../../lib/models/jcd/jcd-image-size';
import { files } from '../../util/files';
import { hashUtil } from '../../lib/lib/hash-util';
import { prim } from '../../util/validate-primitives';
import { jcdImgUtil } from '../../lib/lib/jcd/jcd-img-util';

export const jcdImgProcJob = {
  run: runJcdImgProcJob,
};

async function runJcdImgProcJob(job: JobDto) {
  let jobData = JcdImgProcJobData.parse(JSON.parse(job.data));
  let storage = new Storage;
  let bucket = storage.bucket(jcdCfg.img_v4.bucket);
  let gcsFile = bucket.file(jobData.srcPath);
  let [ gcsFileMeta, ] = await gcsFile.getMetadata();
  if(gcsFileMeta.contentType === undefined) {
    throw new EzdError(`undefined contenType for file '${
      jobData.srcPath
    }', job_id: ${job.job_id}`, 'EZD_6.1');
  }
  /* save source image to temp directory _*/
  let tempImgFilePath = jcdImgUtil.getSrcPath(
    getTempImgPath(jobData.env, jobData.destPath),
    path.sep
  );
  files.mkdirIfNotExist(path.dirname(tempImgFilePath));
  if(files.checkFile(tempImgFilePath) && prim.isString(gcsFileMeta.metadata?.sha1)) {
    let tempImgRs = fs.createReadStream(tempImgFilePath);
    let hasher = hashUtil.getHasher();
    tempImgRs.on('data', hasher.update);
    await stream_p.finished(tempImgRs);
    let tempImgSha1: string = hasher.digest('hex');
    if(gcsFileMeta.metadata.sha1 !== tempImgSha1) {
      console.log(`Temp image file for ${
        tempImgFilePath
      } differs from GCS, fetching remote file...`);
      await fetchFileFromGcs(gcsFile, tempImgFilePath);
    } else {
      console.log(`Temp file exists for ${tempImgFilePath}`);
    }
  } else {
    await fetchFileFromGcs(gcsFile, tempImgFilePath);
  }
  let resizeFmts = Object.entries(jcdImageSize.resize_fmt_map).toSorted((a, b) => {
    return b[1].width - a[1].width;
  });
  for(let i = 0; i < resizeFmts.length; i++) {
    let resizeFmt = resizeFmts[i][1];
    let tempResizeDestPath = jcdImgUtil.getResizePath(
      jobData.destPath,
      resizeFmt.prefix,
      path.sep
    );
    let tempResizeFilePath = getTempImgPath(jobData.env, tempResizeDestPath);
    console.log(`~ ${jobData.env} ${resizeFmt.prefix} - ${jobData.destPath}`);
    files.mkdirIfNotExist(path.dirname(tempResizeFilePath));
    let hashTransform = hashUtil.getTransform();
    await stream_p.pipeline([
      fs.createReadStream(tempImgFilePath),
      getSharpTransformer(gcsFileMeta.contentType, resizeFmt),
      hashTransform,
      fs.createWriteStream(tempResizeFilePath),
    ]);
    let sha1Str = hashTransform.digest('hex');
    /* check if file exists in destination bucket folder_*/
    let gcsBucketPath = jcdImgUtil.getImgV4BucketPath(jobData.env, jobData.destPath);
    let gcsPath = jcdImgUtil.getResizePath(gcsBucketPath, resizeFmt.prefix);
    let gcsResizeFile = bucket.file(gcsPath);
    let [ gcsResizeFileExists ] = await gcsResizeFile.exists();
    let uploadResizedImg = true;
    if(gcsResizeFileExists) {
      let [ gcsResizeFileMeta ] = await gcsResizeFile.getMetadata();
      let gcsResizeSha1 = gcsResizeFileMeta.metadata?.sha1;
      if(prim.isString(gcsResizeSha1) && gcsResizeSha1 === sha1Str) {
        console.log('hashes match, skip.');
        uploadResizedImg = false;
      }
    }
    if(uploadResizedImg) {
      await stream_p.pipeline([
        fs.createReadStream(tempResizeFilePath),
        gcsResizeFile.createWriteStream(),
      ]);
      await gcsResizeFile.setMetadata({
        metadata: {
          sha1: sha1Str,
        }
      });
    }
  }
}

function getTempImgPath(env: string, destPath: string): string {
  let bucketPath = jcdImgUtil.getImgV4BucketPath(env, destPath, path.sep);
  let tempImgPath = [
    jcdCfg.img_v4.tmp_dir,
    bucketPath,
  ].join(path.sep);
  return tempImgPath;
}

function fetchFileFromGcs(gcsFile: File, tempImgFilePath: string) {
  console.log(`fetching ${tempImgFilePath}...`);
  return stream_p.pipeline([
    gcsFile.createReadStream(),
    fs.createWriteStream(tempImgFilePath),
  ]);
}

function getSharpTransformer(contentType: string, resizeFmt: JcdResizeFmt): sharp.Sharp {
  let sharpTransformer: sharp.Sharp;
  switch(contentType) {
    case 'image/jpeg':
      sharpTransformer = sharp().jpeg({
        // mozjpeg: true,
        trellisQuantisation: true,
        overshootDeringing: true,
        optimizeScans: true,
        quantizationTable: 3,
        quality: 90,
      });
      break;
    case 'image/png':
      sharpTransformer = sharp().png({
        effort: 10,
        compressionLevel: 9,
      });
      break;
    default:
      throw new EzdError(`Invalid jcd-img-proc contentType: ${contentType}`, 'EZD_6.2');
  }
  sharpTransformer = sharpTransformer
    .rotate()
    .resize({
      withoutEnlargement: true,
      fit: sharp.fit.inside,
      width: resizeFmt.width,
      height: resizeFmt.height,
    });
  return sharpTransformer;
}
