
import { Type, Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

const MimeGenMetaTSchema = Type.Object({
  mimeDbVersion: Type.String(),
  createdAt: Type.String(),
  extMapFile: Type.String(),
});

export type MimeGenMeta = Static<typeof MimeGenMetaTSchema>;

export const MimeGenMetaSchema = {
  decode: decodeMimeGenMeta,
} as const;

function decodeMimeGenMeta(val: unknown): MimeGenMeta {
  return tbUtil.decodeWithSchema(MimeGenMetaTSchema, val);
}
