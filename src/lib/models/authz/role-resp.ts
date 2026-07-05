
import { Type, Static } from 'typebox';
import { UserRoleDtoSchema } from './user-role-dto';
import { PermissionRespSchema  } from './permission-resp';
import { tbUtil } from '../../../util/tb-util';

const RoleRespTSchema = Type.Object({
  id: UserRoleDtoSchema.schema.properties.role_id,
  name: UserRoleDtoSchema.schema.properties.role_name,
  permissions: Type.Optional(Type.Array(PermissionRespSchema.schema)),
});
export type RoleResp = Static<typeof RoleRespTSchema>;

export const RoleRespSchema = {
  schema: RoleRespTSchema,
  decode: decodeRoleResp
} as const;

function decodeRoleResp(rawVal: unknown): RoleResp {
  return tbUtil.decodeWithSchema(RoleRespTSchema, rawVal);
}
