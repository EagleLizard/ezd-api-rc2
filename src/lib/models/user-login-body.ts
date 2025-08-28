
import { Type, Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { tbUtil } from '../../util/tb-util';

const UserLoginBodyTSchema = Type.Object({
  userName: Type.String(),
  password: Type.String(),
});

export type UserLoginBody = Static<typeof UserLoginBodyTSchema>;

export const UserLoginBodySchema = {
  decode: decodeUserLoginBody,
  check: checkUserLoginBody,
} as const;

function decodeUserLoginBody(rawVal: unknown): UserLoginBody {
  return tbUtil.decodeWithSchema(UserLoginBodyTSchema, rawVal);
}

function checkUserLoginBody(rawVal: unknown): rawVal is UserLoginBody {
  return Value.Check(UserLoginBodyTSchema, rawVal);
}
