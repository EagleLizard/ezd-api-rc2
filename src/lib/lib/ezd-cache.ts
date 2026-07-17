
import { EzdError } from '../models/error/ezd-error';

// type EzdCacheItem<T extends TSchema> = {
//   cacheKey: string;
//   schema: T,
// };

type EzdCacheStoreItem = {
  created: Date;
  val: string;
};

const cache_key_sep = ':';

type IEzdCacheStore<K, V> = {
  set: (k: K, v: V) => IEzdCacheStore<K,V>;
  get: (k: K) => V | undefined;
  delete: (k: K) => boolean;
  clear: () => void;
};

const ezd_cache_item_map: Map<string, EzdCacheItem> = new Map();
const cache_store: Map<string, EzdCacheStoreItem> = new Map();

export const ezdCache = {
  init: registerCacheItem,
};

function registerCacheItem<T>(
  keyPrefix: string,
  decodeFn: (val: unknown) => T,
) {
  return EzdCacheItem.init(keyPrefix, decodeFn);
}

class EzdCacheItem<T = unknown> {
  keyPrefix: string;
  decodeFn: (val: unknown) => T;
  ttlMs = 1_000 * 60 * 20;
  // _cache_store: IEzdCacheStore<string, EzdCacheStoreItem> = cache_store;

  private constructor(keyPrefix: string, decodeFn: (val: unknown) => T) {
    this.keyPrefix = keyPrefix;
    this.decodeFn = decodeFn;
  }

  set(key: string, item: T) {
    let cacheKey = this._getFullKey(key);
    let nowDate = new Date();
    let valStr = JSON.stringify(item);
    let storeItem: EzdCacheStoreItem = {
      created: nowDate,
      val: valStr,
    };
    cache_store.set(cacheKey, storeItem);
  }
  get(key: string): T | undefined {
    let nowDate = new Date();
    let cacheKey = this._getFullKey(key);
    let cacheItem = cache_store.get(cacheKey);
    if(cacheItem === undefined) {
      return;
    }
    let deltaMs = nowDate.valueOf() - cacheItem.created.valueOf();
    if(deltaMs > this.ttlMs) {
      cache_store.delete(key);
      return;
    }
    return this.decodeFn(JSON.parse(cacheItem.val));
  }

  _getFullKey(key: string): string {
    return `${this.keyPrefix}${cache_key_sep}${key}`;
  }

  static init<K>(
    keyPrefix: string,
    decodeFn: (val: unknown) => K,
  ): EzdCacheItem<K> {
    if(ezd_cache_item_map.has(keyPrefix)) {
      throw new EzdError(`Cache key already exists: ${keyPrefix}`, 'EZD_1.2');
    }
    if(keyPrefix.includes(cache_key_sep)) {
      throw new EzdError(`Key prefix cannot contain separator '${cache_key_sep}'`, 'EZD_1.3');
    }
    let ezdCacheItem = new EzdCacheItem(keyPrefix, decodeFn);
    ezd_cache_item_map.set(
      ezdCacheItem.keyPrefix,
      ezdCacheItem,
    );
    return ezdCacheItem;
  }
}
