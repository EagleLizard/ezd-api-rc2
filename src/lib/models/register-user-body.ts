
import { Type, Static } from 'typebox';
import { Value } from 'typebox/value';
import { tbUtil } from '../../util/tb-util';

const RegisterUserBodyTSchema = Type.Object({
  userName: Type.String(),
  email: Type.String(),
  password: Type.String(),
});

export type RegisterUserBody = Static<typeof RegisterUserBodyTSchema>;

export const RegisterUserBodySchema = {
  decode: registerUserBodyDecode,
  check: registerUserBodyCheck,
} as const;

function registerUserBodyDecode(rawVal: unknown): RegisterUserBody {
  return tbUtil.decodeWithSchema(RegisterUserBodyTSchema, rawVal);
}

function registerUserBodyCheck(rawVal: unknown): rawVal is RegisterUserBody {
  return Value.Check(RegisterUserBodyTSchema, rawVal);
}
