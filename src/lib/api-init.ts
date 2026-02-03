
import { secretClient } from './client/secret-client';
import { ezdConfig } from './config';
import { ValidationError } from './models/error/validation-error';
import { UserDto } from './models/user-dto';
import { authzService } from './service/authz-service';
import { userService } from './service/user-service';

const super_user_perms = [
  'user.create',
  'role.create',
  'role.delete',
  'role.read',
  'permission.read',
  'jcd.proj.read',
];

export const apiInit = {
  setupServer: setupServer,
} as const;

/*
  For the first time the server starts with a fresh DB, or a critical system/api
    user gets deleted. May be extended to include other uses
_*/
async function setupServer(): Promise<void> {
  console.log('apiInit.setupServer()');
  /*
    1: Check if server admin user exists.
      - If not, create
    2: Check if api user exists
      - If not, create
  _*/
  await createSystemUser({
    email: ezdConfig.EZD_SUPER_USER_EMAIL,
    userName: ezdConfig.EZD_SUPER_USER_USERNAME,
    pwKey: 'EZD_ADMIN_PW',
  });
  let apiUser = await createSystemUser({
    email: ezdConfig.EZD_API_USER_EMAIL,
    userName: ezdConfig.EZD_API_USER_USERNAME,
    pwKey: 'EZD_API_PW',
  });
  for(let i = 0; i < super_user_perms.length; i++) {
    let superUserPermName = super_user_perms[i];
    await authzService.createPermissionWithRole('ServerAdmin', superUserPermName);
  }
  // await authzService.createPermissionWithRole('ServerAdmin', 'user.create');
  // await authzService.createPermissionWithRole('ServerAdmin', 'role.create');
  // await authzService.createPermissionWithRole('ServerAdmin', 'role.read');
  // await authzService.createPermissionWithRole('ServerAdmin', 'user.none');
  // await authzService.createPermissionWithRole('Test', 'user.none');
  let noPermRole = await authzService.createRole(apiUser.user_id, 'NoPermissions');
  await authzService.addRoleToUser(apiUser.user_id, noPermRole.role_name);
}

async function createSystemUser(opts: {
  email: string;
  userName: string;
  pwKey: string;
}): Promise<UserDto> {
  let user = await userService.getUserByName(opts.userName);
  if(user === undefined) {
    let pwVal = await secretClient.getSecret(opts.pwKey);
    let errOrUser = await userService.registerUser({
      email: opts.email,
      userName: opts.userName,
      password: pwVal,
    });
    if(errOrUser instanceof ValidationError) {
      throw errOrUser;
    }
    user = errOrUser;
  }
  return user;
}
