
import fsp from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert';
import { files } from '../../util/files';
import { jcd_cache_dir_path } from '../constants';
import { JcdCacheMeta } from '../models/jcd/jcd-cache-meta';
import { JcdProject } from '../models/jcd/jcd-project';
import { prim } from '../../util/validate-primitives';

/*
cache entries stored as:
  [
    metadata,
    <cached data>
  ]
_*/

const default_ttl_ms = 1000 * 60 * 60 * 24;
const cache_keys = {
  jcd_project: 'jcd_project',
} as const;
// type JcdCacheKey = typeof cache_keys[keyof typeof cache_keys];
Object.keys(cache_keys).forEach((k) => {
  assert(cache_keys[k as keyof typeof cache_keys] === k, `key ${
    k
  } differs from value: ${cache_keys[k as keyof typeof cache_keys]}`);
});

export class JcdCache {
  static get cache_keys() {
    return cache_keys;
  }
  /* singleton _*/
  static base_dir = jcd_cache_dir_path;
  readonly ttl: number;
  private constructor(ttl: number) {
    this.ttl = ttl;
  }
  static init(ttlMs?: number): JcdCache {
    files.mkdirIfNotExist(JcdCache.base_dir);
    return new JcdCache(ttlMs ?? default_ttl_ms);
  }

  async getProjects(): Promise<JcdProject[] | undefined> {
    /* ignore more results for now _*/
    let cachedRaw = await this.getEntry(JcdCache.cache_keys['jcd_project']);
    if(cachedRaw === undefined) {
      return;
    }
    assert(prim.isString(cachedRaw));
    let cached = JSON.parse(cachedRaw);
    assert(Array.isArray(cached));
    let jcdProjects = cached.map(JcdProject.decode);
    return jcdProjects;
  }
  async setProjects(jcdProjects: JcdProject[]): Promise<void> {
    await this.setEntry(JcdCache.cache_keys['jcd_project'], JSON.stringify(jcdProjects));
  }

  async getEntry(key: string): Promise<unknown | undefined> {
    let entryFileName = `${key}.json`;
    let entryFilePath = [ JcdCache.base_dir, entryFileName ].join(path.sep);
    let entryExists = files.checkFile(entryFilePath);
    if(!entryExists) {
      return;
    }
    let buf = await fsp.readFile(entryFilePath);
    let rawData = JSON.parse(buf.toString());
    assert(Array.isArray(rawData));
    let cacheMeta = JcdCacheMeta.decode(rawData[0]);
    if((Date.now() - cacheMeta.created_at) > this.ttl) {
      console.log(`CACHE ENTRY INVALIDATED. '${cacheMeta.key}'`);
      return;
    }
    return rawData[1];
  }
  async setEntry(key: string, data: string | Buffer): Promise<void> {
    let entryFileName = `${key}.json`;
    let entryFilePath = [ JcdCache.base_dir, entryFileName ].join(path.sep);
    let cacheMeta: JcdCacheMeta = {
      key,
      created_at: Date.now(),
    };
    let cacheEntry = [ cacheMeta, data ];
    await fsp.writeFile(entryFilePath, JSON.stringify(cacheEntry));
  }
}
