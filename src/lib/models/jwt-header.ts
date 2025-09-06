
import { Type, Static } from '@sinclair/typebox';
import { tbUtil } from '../../util/tb-util';

const JwtHeaderTSchema = Type.Object({
  typ: Type.Optional(Type.String()),
  alg: Type.Optional(Type.String()),
  kid: Type.Optional(Type.String()),
});

export type JwtHeader = Static<typeof JwtHeaderTSchema>;

export const JwtHeaderSchema = {
  decode: decodeJwtHeader,
} as const;

function decodeJwtHeader(rawVal: unknown): JwtHeader {
  return tbUtil.decodeWithSchema(JwtHeaderTSchema, rawVal);
}
