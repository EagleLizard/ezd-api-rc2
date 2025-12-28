import { UserRoleDto, UserRoleDtoSchema } from '../models/user/user-role-dto';
import { IPgClient } from './pg-client';

export const authzRepo = {
  getUserRoles: getUserRoles,
} as const;

async function getUserRoles(pgClient: IPgClient, userId: string): Promise<UserRoleDto[]> {
  let queryStr = `
    select ur.* from user_role ur
      INNER JOIN users_user_role uur ON ur.role_id = uur.role_id
    where uur.user_id = $1
  `;
  let queryRes = await pgClient.query(queryStr, [ userId ]);
  let userRoles: UserRoleDto[] = [];
  for(let i = 0; i < queryRes.rows.length; i++) {
    let userRole = UserRoleDtoSchema.decode(queryRes.rows[i]);
    userRoles.push(userRole);
  }
  return userRoles;
}
