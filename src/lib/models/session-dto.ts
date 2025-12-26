
import { Type, Static } from '@sinclair/typebox';
import { tbUtil } from '../../util/tb-util';

const SessionDtoTSchema = Type.Object({
  sid: Type.String(),
  sesh: Type.Object({
    cookie: Type.Object({
      originalMaxAge: Type.Union([ Type.Number(), Type.Null() ]),
      maxAge: Type.Optional(Type.Number()),
      expires: Type.Optional(Type.Union([ Type.String(), Type.Null() ])),
      httpOnly: Type.Optional(Type.Boolean()),
      path: Type.Optional(Type.String()),
      domain: Type.Optional(Type.Union([ Type.String(), Type.Null() ])),
      secure: Type.Optional(Type.Union([ Type.Boolean(), Type.Literal('auto') ])),
      sameSite: Type.Optional(Type.Union([
        Type.Boolean(),
        Type.Literal('lax'),
        Type.Literal('strict'),
        Type.Literal('none'),
      ])),
    }),
  }),
  ip_addr: Type.String(),
  user_agent: Type.Union([ Type.String(), Type.Null() ]),
  expire: Type.Date(),
});

export type SessionDto = Static<typeof SessionDtoTSchema>;

export const SessionDtoSchema = {
  schema: SessionDtoTSchema,
  decode: sessionDtoDecode,
} as const;

function sessionDtoDecode(rawVal: unknown): SessionDto {
  return tbUtil.decodeWithSchema(SessionDtoTSchema, rawVal);
}
