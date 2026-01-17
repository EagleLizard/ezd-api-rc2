
import { Type, Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

const UserRoleDtoTSchema = Type.Object({
  role_id: Type.Integer(),
  role_name: Type.String(),

  created_at: Type.String({ format: 'pg-date-time' }),
  modified_at: Type.String({ format: 'pg-date-time' }),
});
export type UserRoleDto = Static<typeof UserRoleDtoTSchema>;

export const UserRoleDtoSchema = {
  schema: UserRoleDtoTSchema,
  decode: decodeUserRoleDto,
} as const;

function decodeUserRoleDto(rawVal: unknown): UserRoleDto {
  return tbUtil.decodeWithSchema(UserRoleDtoTSchema, rawVal);
}
