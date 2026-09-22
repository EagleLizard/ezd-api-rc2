
import assert from 'node:assert';
import type { entity } from '@google-cloud/datastore/build/src/entity';
import { prim } from '../../../util/validate-primitives';
import { gcpDb } from '../../client/gcp-db';

export type JcdV3GcpEntity<T = Record<string | number | symbol, unknown>> = {
  key: entity.Key;
  data: T;
} & {};
export const JcdV3GcpEntity = {
  decode: decodeJcdV3GcpEntity,
} as const;

function decodeJcdV3GcpEntity(rawEntity: unknown): JcdV3GcpEntity {
  assert(prim.isObject(rawEntity));
  let key = rawEntity[gcpDb.KEY];
  assert(gcpDb.isKey(key));
  return {
    key,
    data: rawEntity,
  };
}
