
import { Type, Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

/*
  via mime-db
  see: https://github.com/jshttp/mime-db/tree/master?tab=readme-ov-file#data-structure
_*/

const MimeDbEntryTSchema = Type.Object({
  source: Type.Optional(Type.Union([
    Type.Literal('apache'),
    Type.Literal('iana'),
    Type.Literal('nginx'),
  ])),
  extensions: Type.Optional(Type.Array(Type.String())),
  compressible: Type.Optional(Type.Boolean()),
  charset: Type.Optional(Type.String()),
});

export type MimeDbEntry = Static<typeof MimeDbEntryTSchema>;

export const mimeDbEntrySchema = {
  decode: decodeMimeDbEntry,
} as const;

function decodeMimeDbEntry(val: unknown): MimeDbEntry {
  return tbUtil.decodeWithSchema(MimeDbEntryTSchema, val);
}
