
import { Type, Static } from 'typebox';

import { tbUtil } from '../../../util/tb-util';
import { UserInfoSchema } from '../user-info';
import { PermissionRespSchema, RoleRespSchema } from '../authz/role-resp';

const GetUserRespItemTSchema = Type.Object({
  user: UserInfoSchema.schema,
  roles: Type.Optional(Type.Array(RoleRespSchema.schema)),
  permissions: Type.Optional(Type.Array(PermissionRespSchema.schema))
});
export type GetUserRespItem = Static<typeof GetUserRespItemTSchema>;
export const GetUserRespItem = {
  decode: decodeGetUserRespItem,
} as const;

function decodeGetUserRespItem(rawVal: unknown): GetUserRespItem {
  return tbUtil.decodeWithSchema(GetUserRespItemTSchema, rawVal);
}
