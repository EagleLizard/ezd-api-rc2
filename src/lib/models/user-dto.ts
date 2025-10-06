
import { Type, Static } from '@sinclair/typebox';
import { tbUtil } from '../../util/tb-util';

const UserDtoTSchema = Type.Object({
  user_id: Type.Integer(),
  user_name: Type.String(),
  email: Type.String(),

  created_at: Type.Date(),
  modified_at: Type.Date(),
});

export type UserDto = Static<typeof UserDtoTSchema>;

export const UserDtoSchema = {
  schema: UserDtoTSchema,

  decode: decodeUserDto,
} as const;

function decodeUserDto(rawVal: unknown): UserDto {
  return tbUtil.decodeWithSchema(UserDtoTSchema, rawVal);
}
