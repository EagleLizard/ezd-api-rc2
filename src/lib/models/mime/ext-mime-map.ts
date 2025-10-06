
import { Type, Static } from '@sinclair/typebox';
import { tbUtil } from '../../../util/tb-util';

const ExtMimeMapTSchema = Type.Record(Type.String(), Type.Array(Type.String()));

export type ExtMimeMap = Static<typeof ExtMimeMapTSchema>;

export const ExtMimeMapSchema = {
  decode: decodeExtMimeMap,
} as const;

function decodeExtMimeMap(val: unknown): ExtMimeMap {
  return tbUtil.decodeWithSchema(ExtMimeMapTSchema, val);
}
