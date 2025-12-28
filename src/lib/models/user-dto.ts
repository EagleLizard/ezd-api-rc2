
import { Type, Static } from 'typebox';
import { tbUtil } from '../../util/tb-util';

const UserDtoTSchema = Type.Object({
  user_id: Type.String(),
  user_name: Type.String(),
  email: Type.String(),

  created_at: Type.String({ format: 'pg-date-time' }),
  modified_at: Type.String({ format: 'pg-date-time' }),
});

export type UserDto = Static<typeof UserDtoTSchema>;

export const UserDtoSchema = {
  schema: UserDtoTSchema,

  decode: decodeUserDto,
} as const;

function decodeUserDto(rawVal: unknown): UserDto {
  return tbUtil.decodeWithSchema(UserDtoTSchema, rawVal);
}
