
import { Type, Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';
import { UserDtoSchema } from '../user-dto';
import { UserRoleDtoSchema } from '../authz/user-role-dto';

const UsersUserRoleDtoTSchema = Type.Object({
  user_id: UserDtoSchema.schema.properties.user_id,
  role_id: UserRoleDtoSchema.schema.properties.role_id,
  created_at: Type.String({ format: 'pg-date-time' }),
  modified_at: Type.String({ format: 'pg-date-time' }),
});

export type UsersUserRoleDto = Static<typeof UsersUserRoleDtoTSchema>;

export const UsersUserRoleDto = {
  decode: decodeUsersUserRoleDto,
} as const;

function decodeUsersUserRoleDto(rawVal: unknown): UsersUserRoleDto {
  return tbUtil.decodeWithSchema(UsersUserRoleDtoTSchema, rawVal);
}
