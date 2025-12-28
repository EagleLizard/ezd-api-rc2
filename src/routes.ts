
import path from 'node:path';

import { FastifyInstance } from 'fastify';
import { getHealthCtrl } from './ctrl/get-health';
import { getIndexCtrl } from './ctrl/get-index';
import { postRegisterUserCtrl } from './ctrl/users/register-user-ctrl';
import { postUserLogin, postUserLogout } from './ctrl/users/user-auth-ctrl';
import { getWhoamiCtrl } from './ctrl/users/whoami-ctrl';
import { staticPlug } from './lib/middleware/static-plug/static-plug';
import { BASE_DIR } from './lib/constants';
import { getUserCtrl } from './ctrl/users/user-ctrl';
import { postUserRole } from './ctrl/users/user-authz-ctrl';
import { Metrics } from './lib/lib/metrics';
import { UserDtoSchema } from './lib/models/user-dto';
import { Type } from '@sinclair/typebox';

export function registerRoutes(app: FastifyInstance) {
  app.get('/health', getHealthCtrl);
  app.get('/metrics', async (req, res) => {
    return res.status(200).send(await Metrics.init().collect());
  });

  app.get('/', getIndexCtrl);

  app.register(staticPlug, {
    dir: [ BASE_DIR, 'static' ].join(path.sep),
    prefix: '/v1/static/',
  });

  app.get('/v1/user/:username', getUserCtrl);

  app.post('/v1/users/register', postRegisterUserCtrl);
  app.post('/v1/user/login', postUserLogin);
  // app.post('/v1/user/login', {
  //   schema: {
  //     body: Type.Object({
  //       userName: Type.String(),
  //       password: Type.String(),
  //     }),
  //     response: {
  //       200: Type.Object({
  //         user: UserDtoSchema.schema,
  //       }),
  //     },
  //   }
  // }, postUserLogin);
}

export function registerAuthNRoutes(app: FastifyInstance) {
  app.get('/v1/user/whoami', getWhoamiCtrl);

  app.post('/v1/user/logout', postUserLogout);
  app.post('/v1/user/role', postUserRole);
}
