import {
  Datastore,
  InsertCallback,
  InsertResponse,
  PathType,
  Query,
  Transaction,
} from '@google-cloud/datastore';
import type { Entities, entity } from '@google-cloud/datastore/build/src/entity';
import type {
  CreateReadStreamOptions,
  DeleteCallback,
  DeleteResponse,
  GetCallback,
  GetResponse,
} from '@google-cloud/datastore/build/src/request';
import { prim } from '../../util/validate-primitives';
import { EzdError } from '../models/error/ezd-error';
import { logger } from '../logger/logger';
import { ezdErrorCodes } from '../models/error/ezd-error-codes';
import { jcdService } from '../service/jcd-service';

const _datastore = new Datastore();

export const gcpDb = new class GcpDb {
  createQuery(kind?: string): Query
  createQuery(kind?: string[] | undefined): Query
  createQuery(namespace: string, kind?: string): Query
  createQuery(namespace: string, kind?: string[]): Query
  createQuery(kindOrNamespace?: string | string[], kindOrNot?: string | string[]): Query {
    let ns: string | undefined;
    if(kindOrNot !== undefined) {
      /* first param is namespace _*/
      ns = kindOrNamespace as string;
      return (typeof kindOrNot === 'string')
        ? _datastore.createQuery(ns, kindOrNot)
        : _datastore.createQuery(ns, kindOrNot)
      ;
    }
    return (typeof kindOrNamespace === 'string')
      ? _datastore.createQuery(kindOrNamespace)
      : _datastore.createQuery(kindOrNamespace)
    ;
  }
  /*
  helper to simplify createQuery call logic
  _*/
  query(kind?: string, ns?: string): Query
  query(kind?: string[], ns?: string): Query
  query(kind?: string | string[], ns?: string): Query {
    if(ns !== undefined) {
      return prim.isString(kind)
        ? this.createQuery(ns, kind)
        : this.createQuery(ns, kind)
      ;
    }
    return prim.isString(kind)
      ? this.createQuery(kind)
      : this.createQuery(kind)
    ;
  }

  get(keys: entity.Key | entity.Key[], options?: CreateReadStreamOptions): Promise<GetResponse>
  get(keys: entity.Key | entity.Key[], callback: GetCallback): void
  get(
    keys: entity.Key | entity.Key[],
    options: CreateReadStreamOptions,
    callback: GetCallback
  ): void;
  get(
    keys: entity.Key | entity.Key[],
    optionsOrCallback?: CreateReadStreamOptions | GetCallback,
    callback?: GetCallback
  ): void | Promise<GetResponse> {
    if(optionsOrCallback !== undefined) {
      if(typeof optionsOrCallback === 'function') {
        return _datastore.get(keys, optionsOrCallback);
      }
      if(typeof callback === 'function') {
        return _datastore.get(keys, optionsOrCallback, callback);
      }
      return _datastore.get(keys, optionsOrCallback);
    }
    /* else, callback will be undefined _*/
    return _datastore.get(keys);
  }

  insert(entities: Entities): Promise<InsertResponse>
  insert(entities: Entities, callback: InsertCallback): void
  insert(entities: Entities, callback?: InsertCallback): Promise<InsertResponse> | void {
    if(callback !== undefined) {
      return _datastore.insert(entities, callback);
    }
    return _datastore.insert(entities);
  }

  delete(entities: Entities): Promise<DeleteResponse>
  delete(entities: Entities, callback: DeleteCallback): void
  delete(entities: Entities, callback?: DeleteCallback): Promise<DeleteResponse> | void {
    let _entities = Array.isArray(entities)
      ? entities
      : entities !== undefined
        ? [ entities ]
        : []
    ;
    /*
    check to prevent deletes from default
    _*/
    for(let i = 0; i < _entities.length; i++) {
      let _entity = _entities[i];
      if(!gcpDb.isKey(_entity)) {
        let errMsg = 'entity is not a key';
        logger.error({entity: _entity}, errMsg);
        throw new EzdError(errMsg, ezdErrorCodes.jcd_env_del_not_allowed);
      }
      if(
        _entity.namespace === undefined
        || _entity.namespace.includes('default')
        || _entity.namespace === jcdService.default_env_id
      ) {
        let errMsg = 'cannot delete from default namespace (yet)';
        logger.error({ entity: _entity }, errMsg);
        throw new EzdError(errMsg, ezdErrorCodes.jcd_env_del_not_allowed);
      }
    }
    if(callback !== undefined) {
      return _datastore.delete(entities, callback);
    }
    return _datastore.delete(entities, callback);
  }

  transaction(): Transaction {
    return _datastore.transaction();
  }

  key(options: entity.KeyOptions): entity.Key
  key(path: PathType[]): entity.Key
  key(path: string): entity.Key
  key(pathOrOpts: entity.KeyOptions | PathType[] | string): entity.Key {
    if(prim.isString(pathOrOpts)) {
      return _datastore.key(pathOrOpts);
    } else if(Array.isArray(pathOrOpts)) {
      return _datastore.key(pathOrOpts);
    }
    return _datastore.key(pathOrOpts);
  }
  int(val: number | string): entity.Int {
    return _datastore.int(val);
  }

  isKey(val: unknown): val is entity.Key {
    if(!prim.is_object(val)) {
      return false;
    }
    return Datastore.isKey(val);
  }
  get KEY(): symbol {
    return _datastore.KEY;
  }
};
