
import { Type, Static } from 'typebox';
import { tbUtil } from '../../util/tb-util';

/*
this can have anything in addition to the expected properties.
_*/
const JwtPayloadTSchema = Type.Intersect([
  Type.Object({
    iss: Type.Optional(Type.String()),
    sub: Type.Optional(Type.String()),
    aud: Type.Optional(Type.Union([ Type.String(), Type.Array(Type.String()) ])),
    exp: Type.Optional(Type.Number()),
    nbf: Type.Optional(Type.Number()),
    iat: Type.Optional(Type.Number()),
    jti: Type.Optional(Type.String()),
  }),
  Type.Record(Type.String(), Type.Unknown()),
]);

export type JwtPayload = Static<typeof JwtPayloadTSchema>;

export const JwtPayloadSchema = {
  decode: decodeJwtPayload,
} as const;

function decodeJwtPayload(rawVal: unknown): JwtPayload {
  return tbUtil.decodeWithSchema(JwtPayloadTSchema, rawVal);
}
