
import 'source-map-support/register';

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import stream, { Readable, Writable } from 'node:stream';

import { extern_dir_path, external_temp_dir_path, mime_gen_meta_file_name } from '../lib/constants';
import { prim } from '../util/validate-primitives';
import { MimeDbEntry, mimeDbEntrySchema } from '../lib/models/mime/mime-db-entry';
import { files } from '../util/files';
import { MimeGenMeta } from '../lib/models/mime/mime-gen-meta';

/*
generate mime type definitions based on mime-db.
  see:
    - https://github.com/jshttp/mime-db
    - https://github.com/broofa/mime-score/blob/af6211995a4e6c2e2710095ec2f05ac009c267f3/src/mimeScore.ts
_*/

const mimedb_version = '1.54.0';
const mimedb_uri = `https://cdn.jsdelivr.net/gh/jshttp/mime-db@${mimedb_version}/db.json`;
const mimedb_file_name = `mime-db.${mimedb_version}.json`;
const mimedb_file_path = [ external_temp_dir_path, mimedb_file_name ].join(path.sep);

/* see: https://datatracker.ietf.org/doc/html/rfc6838#section-4.2 _*/
const mime_type_sort_rxs: RegExp[] = [
  /^video\//,
  /^audio\//,
  /^font\//,
  /^application\//,
];

const facet_sort_rxs: RegExp[] = [
  /\/vnd\./,
  /\/x\./,
  /\/x-/,
  /\/prs\./,
];

(async () => {
  try {
    await genMimeTypesMain();
  } catch(e) {
    console.error(e);
    throw e;
  }
})();

async function genMimeTypesMain() {
  setProcName();
  console.log('gen-mime-types main()');
  await genMimeTypes();
}

async function genMimeTypes() {
  let rawMimeDb: unknown;
  let mimeDbRawKeys: string[];
  let mimeDb: Record<string, MimeDbEntry>;
  let extKeys: string[];
  let extMap: Record<string, string[]>;
  rawMimeDb = await getMimeDb();
  if(!prim.isObject(rawMimeDb)) {
    throw new Error('mime-db.json not parsed correctly, expected json');
  }
  mimeDb = {};
  mimeDbRawKeys = [ ...Object.keys(rawMimeDb) ];
  extMap = {};
  for(let i = 0; i < mimeDbRawKeys.length; i++) {
    let mimeDbKey = mimeDbRawKeys[i];
    let mimeDbEntry = mimeDbEntrySchema.decode(rawMimeDb[mimeDbKey]);
    if(
      (mimeDbEntry.extensions !== undefined)
      && (mimeDbEntry.extensions.length > 0)
    ) {
      mimeDb[mimeDbKey] = mimeDbEntry;
      for(let k = 0; k < mimeDbEntry.extensions.length; k++) {
        let extTypes: string[];
        let ext = mimeDbEntry.extensions[k];
        extTypes = extMap[ext] ?? [];
        extTypes.push(mimeDbKey);
        extMap[ext] = extTypes;
      }
    }
  }
  extKeys = [ ...Object.keys(extMap) ];
  for(let i = 0; i < extKeys.length; i++) {
    let extKey = extKeys[i];
    let extTypes = extMap[extKey];
    if(extTypes.length > 1) {
      extTypes = extTypes.toSorted((a, b) => {
        let aFacetIdx: number;
        let bFacetIdx: number;
        aFacetIdx = facet_sort_rxs.findIndex((rx) => rx.test(a));
        bFacetIdx = facet_sort_rxs.findIndex((rx) => rx.test(b));
        /*
        If one has a facet and the other does not,
          prefer no facet
        _*/
        if(aFacetIdx === -1 && bFacetIdx > -1) {
          return -1;
        } else if(aFacetIdx > -1 && bFacetIdx === 1) {
          return 1;
        }
        /*
        Prefer by first part precedence
        _*/
        for(let k = 0; k < mime_type_sort_rxs.length; k++) {
          let sortPrefix = mime_type_sort_rxs[k];
          if(sortPrefix.test(a) && !sortPrefix.test(b)) {
            return -1;
          } else if(!sortPrefix.test(a) && sortPrefix.test(b)) {
            return 1;
          }
        }
        /*
        If both entries have facets & equal prefix precedence,
          prefer by facet precedence
        _*/
        if(aFacetIdx !== bFacetIdx) {
          return aFacetIdx - bFacetIdx;
        }
        /*
        If no other rules apply,
          prefer the shorter type
        _*/
        if(a.length < b.length) {
          return -1;
        } else if(a.length > b.length) {
          return 1;
        }
        return 0;
      });
      extMap[extKey] = extTypes;
    }
  }
  let extToTypeOutFileName: string;
  let mimeGenMeta: MimeGenMeta;
  let nowDate: Date;
  let mimeGenMetaFilePath: string;
  let mimeGenMetaStr: string;
  extToTypeOutFileName = `ext-mime-map.${mimedb_version}.json`;
  nowDate = new Date;
  mimeGenMeta = {
    mimeDbVersion: mimedb_version,
    createdAt: nowDate.toISOString(),
    extMapFile: extToTypeOutFileName,
  };
  mimeGenMetaFilePath = [
    extern_dir_path,
    mime_gen_meta_file_name,
  ].join(path.sep);
  mimeGenMetaStr = JSON.stringify(mimeGenMeta, null, 2);
  /* create external dir if not exists _*/
  if(!files.checkDir(extern_dir_path)) {
    fs.mkdirSync(extern_dir_path, { recursive: true });
  }
  fs.writeFileSync(mimeGenMetaFilePath, mimeGenMetaStr);

  let extToTypeOutFilePath: string = [
    extern_dir_path,
    extToTypeOutFileName,
  ].join(path.sep);
  let extToTypeOutFileStr: string = JSON.stringify(extMap, null, 2);
  fs.writeFileSync(extToTypeOutFilePath, extToTypeOutFileStr);
}

async function getMimeDb(): Promise<unknown> {
  /* create external dir if not exists */
  let externalDirExists: boolean;
  let mimeDbExists: boolean;
  let mimeDbPath: string;
  let rawMimeDb: unknown;
  externalDirExists = files.checkDir(external_temp_dir_path);
  if(!externalDirExists) {
    await fsp.mkdir(external_temp_dir_path, { recursive: true });
  }
  mimeDbPath = mimedb_file_path;
  mimeDbExists = files.checkFile(mimeDbPath);
  if(!mimeDbExists) {
    mimeDbPath = await getMimeDbFromUrl();
  }
  rawMimeDb = JSON.parse(fs.readFileSync(mimeDbPath).toString());
  return rawMimeDb;
}

async function getMimeDbFromUrl(): Promise<string> {
  let res: Response;
  let rs: Readable;
  let destFilePath: string;
  let ws: Writable;
  let wss: Writable;
  let wssPromise: Promise<void>;
  res = await fetch(mimedb_uri);
  if(res.status !== 200) {
    console.error(res.status);
    console.error(res.statusText);
    throw new Error(`${res.status}: ${res.statusText}`);
  }
  if(res.body === null) {
    throw new Error('null body received from fetch() for mime-db');
  }
  rs = stream.Readable.fromWeb(res.body);
  destFilePath = mimedb_file_path;
  ws = fs.createWriteStream(destFilePath);
  wss = rs.pipe(ws);
  wssPromise = new Promise<void>((resolve, reject) => {
    let errCb: (err: Error) => void;
    let finishCb: () => void;
    errCb = (err) => {
      wss.off('finish', finishCb);
      reject(err);
    };
    finishCb = () => {
      wss.off('error', errCb);
      resolve();
    };
    wss.once('error', errCb);
    wss.once('finish', finishCb);
  });
  await wssPromise;
  return destFilePath;
}

function setProcName() {
  process.title = 'ezd-api-rc2_gen-mime-types';
}
