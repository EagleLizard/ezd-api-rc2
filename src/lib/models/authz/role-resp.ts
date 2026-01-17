
import { Type, Static } from 'typebox';
import { UserRoleDtoSchema } from './user-role-dto';
import { PermissionDtoSchema } from './permission-dto';

const PermissionRespTSchema = Type.Object({
  id: PermissionDtoSchema.schema.properties.permission_id,
  name: PermissionDtoSchema.schema.properties.permission_name,
});
export type PermissionResp = Static<typeof PermissionRespTSchema>;

const RoleRespTSchema = Type.Object({
  id: UserRoleDtoSchema.schema.properties.role_id,
  name: UserRoleDtoSchema.schema.properties.role_name,
  permissions: Type.Optional(Type.Array(PermissionRespTSchema)),
});
export type RoleResp = Static<typeof RoleRespTSchema>;

export const RoleRespSchema = {
  schema: RoleRespTSchema,
} as const;

export const PermissionRespSchema = {
  schema: PermissionRespTSchema,
} as const;
