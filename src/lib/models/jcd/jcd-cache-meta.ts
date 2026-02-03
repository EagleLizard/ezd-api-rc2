
import { Type, Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

const JcdCacheMetaTSchema = Type.Object({
  key: Type.String(),
  created_at: Type.Number(),
});
export type JcdCacheMeta = Static<typeof JcdCacheMetaTSchema>;
export const JcdCacheMeta = {
  schema: JcdCacheMetaTSchema,
  decode: decodeJcdCacheMeta
} as const;

function decodeJcdCacheMeta(rawVal: unknown): JcdCacheMeta {
  return tbUtil.decodeWithSchema(JcdCacheMetaTSchema, rawVal);
}
