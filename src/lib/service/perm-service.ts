
/*
Helper module for authz/permission operations
_*/

import { authzService } from './authz-service';

export const perm = {
  check: check,
};

async function check(user_id: string, permission: string): Promise<boolean> {
  return authzService.checkPermission(user_id, permission);
}
