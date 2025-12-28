
import { Type, Static } from 'typebox';

import { tbUtil } from '../../util/tb-util';
import { UserDtoSchema } from './user-dto';
import { SessionDtoSchema } from './session-dto';

const UserLoginDtoTSchema = Type.Object({
  user_login_id: Type.Number(),
  logged_out: Type.Boolean(),
  logged_out_at: Type.Union([ Type.String({ format: 'pg-date-time' }), Type.Null() ]),
  ip_addr: Type.String(),

  sid: SessionDtoSchema.schema.properties.sid,
  user_id: UserDtoSchema.schema.properties.user_id,

  created_at: Type.String({ format: 'pg-date-time' }),
  modified_at: Type.String({ format: 'pg-date-time' }),
});

export type UserLoginDto = Static<typeof UserLoginDtoTSchema>;

export const UserLoginDtoSchema = {
  decode: decodeUserLoginDto,
} as const;

function decodeUserLoginDto(rawVal: unknown): UserLoginDto {
  return tbUtil.decodeWithSchema(UserLoginDtoTSchema, rawVal);
}
