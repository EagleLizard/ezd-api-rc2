
import fs from 'node:fs';
import path from 'node:path';

import { ExtMimeMap, ExtMimeMapSchema } from '../models/mime/ext-mime-map';
import { MimeGenMeta, MimeGenMetaSchema } from '../models/mime/mime-gen-meta';
import { extern_dir_path, mime_gen_meta_file_name } from '../constants';

let extMimeMap: ExtMimeMap;

init();

export const mimeTypes = {
  getType: getMimeType,
} as const;

function getMimeType(filePath: string): string | undefined {
  let mimeType: string | undefined;
  let extName: string;
  extName = path.extname(filePath).replace(/^./, '');
  mimeType = extMimeMap[extName]?.[0];
  return mimeType;
}

function init() {
  let mimeGenMeta: MimeGenMeta;
  let extMimeMapFilePath: string;
  let extMimeMapBuf: Buffer;
  let rawExtMimeMap: unknown;
  mimeGenMeta = getMimeGenMeta();
  extMimeMapFilePath = [
    extern_dir_path,
    mimeGenMeta.extMapFile,
  ].join(path.sep);
  extMimeMapBuf = fs.readFileSync(extMimeMapFilePath);
  rawExtMimeMap = JSON.parse(extMimeMapBuf.toString());
  extMimeMap = ExtMimeMapSchema.decode(rawExtMimeMap);
}

function getMimeGenMeta(): MimeGenMeta {
  let mimeGenMetaFilePath: string;
  let mimeGenMetaBuf: Buffer;
  let rawMimeGenMeta: unknown;
  let mimeGenMeta: MimeGenMeta;
  mimeGenMetaFilePath = [
    extern_dir_path,
    mime_gen_meta_file_name
  ].join(path.sep);
  mimeGenMetaBuf = fs.readFileSync(mimeGenMetaFilePath);
  rawMimeGenMeta = JSON.parse(mimeGenMetaBuf.toString());
  mimeGenMeta = MimeGenMetaSchema.decode(rawMimeGenMeta);
  return mimeGenMeta;
}
