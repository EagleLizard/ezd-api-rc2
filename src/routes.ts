
import path from 'node:path';

import { FastifyInstance } from 'fastify';
import { getHealthCtrl } from './ctrl/get-health';
import { getIndexCtrl } from './ctrl/get-index';
import { userAuthCtrl } from './ctrl/users/user-auth-ctrl';
import { getWhoamiCtrl } from './ctrl/users/whoami-ctrl';
import { staticPlug } from './lib/middleware/static-plug/static-plug';
import { BASE_DIR } from './lib/constants';
import { userCtrl } from './ctrl/users/user-ctrl';
import { userAuthzCtrl } from './ctrl/users/user-authz-ctrl';
import { Metrics } from './lib/lib/metrics';
import { FastifyTypeBox } from './lib/models/fastify/fastify-typebox';

export function registerRoutes(app: FastifyTypeBox) {
  app.get('/health', getHealthCtrl);
  app.get('/metrics', async (req, res) => {
    return res.status(200).send(await Metrics.init().collect());
  });

  app.get('/', getIndexCtrl);

  app.register(staticPlug, {
    dir: [ BASE_DIR, 'static' ].join(path.sep),
    prefix: '/v1/static/',
  });

  app.post('/v1/users/register', {
    schema: userAuthCtrl.PostRegisterUserSchema,
  }, userAuthCtrl.postRegisterUser);
  app.post('/v1/user/login', {
    schema: userAuthCtrl.PostUserLoginSchema
  }, userAuthCtrl.postUserLogin);
}

export function registerAuthNRoutes(app: FastifyInstance) {
  app.get('/v1/user/whoami', getWhoamiCtrl);
  app.get('/v1/user', {
    schema: userCtrl.GetUsersSchema
  }, userCtrl.getUsers);
  app.post('/v1/user', {
    schema: userCtrl.CreateUser
  }, userCtrl.createUser);
  app.delete('/v1/user/:userId', {
    schema: userCtrl.DeleteUserSchema,
  }, userCtrl.deleteUser);

  app.post('/v1/user/logout', {
    schema: userAuthCtrl.PostUserLogoutSchema
  }, userAuthCtrl.postUserLogout);
  app.get('/v1/user/:userId/role', {
    schema: userAuthzCtrl.GetUserRolesSchema
  }, userAuthzCtrl.getUserRoles);
  app.post('/v1/user/:userId/role', {
    schema: userAuthzCtrl.PostUserRoleSchema
  }, userAuthzCtrl.postUserRole);
  app.delete('/v1/user/:userId/role/:roleName', {
    schema: userAuthzCtrl.DeleteUserRoleSchema,
  }, userAuthzCtrl.deleteUserRole);
  app.get('/v1/user/:userId/permission', {
    schema: userAuthzCtrl.GetUserPermissionsSchema,
  }, userAuthzCtrl.getUserPermissions);
}
