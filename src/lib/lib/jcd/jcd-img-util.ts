
import { EzdError } from '../../models/error/ezd-error';
import { jcdCfg } from '../../config/jcd-config';

const gcs_path_delim = '/';

export const jcdImgUtil = {
  getResizePath: getResizePath,
  getSrcPath: getSrcPath,
  getImgV4BucketPath: getImgV4BucketPath,
} as const;

/*
prev:
  img_folder/env/fmtPrefix/projKey/filename.ext
next:
  img_folder/env/projKey/{filename}_{fmtPrefix}.ext
_*/
function getResizePath(
  bucketPath: string,
  fmtKey: string,
  delim = gcs_path_delim,
): string {
  let splat: string[] = bucketPath.includes(delim)
    ? bucketPath.split(delim)
    : [ bucketPath ]
  ;
  let filePart = splat.pop()!;
  let dotIdx = filePart.indexOf('.');
  if(dotIdx === -1) {
    throw new EzdError(`Invalid filename in bucket path: ${bucketPath}`, 'JCD_2.4');
  }
  let fileName = filePart.substring(0, dotIdx);
  let ext = filePart.substring(dotIdx);
  let fmtFileName = `${fileName}_${fmtKey}${ext}`;
  splat.push(fmtFileName);
  let resizePath = splat.join(delim);
  return resizePath;
}

function getSrcPath(bucketPath: string, delim = gcs_path_delim) {
  if(!bucketPath.includes(delim)) {
    throw new EzdError(`Invalid bucketPath, expected at least 2 path parts: ${
      bucketPath
    }`, 'JCD_2.4');
  }
  return bucketPath.split(delim)
    .toSpliced(-2, 0, jcdCfg.img_v4.src_dir)
    .join(delim);
}

function getImgV4BucketPath(env: string, destPath: string, delim = gcs_path_delim): string {
  let gcsBucketFilePath = [
    jcdCfg.img_v4.img_folder,
    env,
    destPath,
  ].join(delim);
  return gcsBucketFilePath;
}
