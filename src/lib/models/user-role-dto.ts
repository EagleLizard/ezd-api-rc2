
import { Type, Static } from '@sinclair/typebox';
import { tbUtil } from '../../util/tb-util';

const UserRoleDtoTSchema = Type.Object({
  role_id: Type.Integer(),
  role_name: Type.String(),

  created_at: Type.Date(),
  modified_at: Type.Date(),
});

export type UserRoleDto = Static<typeof UserRoleDtoTSchema>;

export const UserRoleDtoSchema = {
  decode: decodeUserRoleDto,
} as const;

function decodeUserRoleDto(rawVal: unknown): UserRoleDto {
  return tbUtil.decodeWithSchema(UserRoleDtoTSchema, rawVal);
}
