
import path from 'node:path';

import { FastifyInstance } from 'fastify';
import { getHealthCtrl } from './ctrl/get-health';
import { getIndexCtrl } from './ctrl/get-index';
import { postRegisterUserCtrl } from './ctrl/users/register-user-ctrl';
import { postUserLogin } from './ctrl/users/user-auth-ctrl';
import { getWhoamiCtrl } from './ctrl/users/whoami-ctrl';
import { staticPlug } from './lib/middleware/static-plug/static-plug';
import { BASE_DIR } from './lib/constants';

export function registerPublicRoutes(app: FastifyInstance) {
  app.get('/health', getHealthCtrl);

  app.get('/', getIndexCtrl);

  app.register(staticPlug, {
    dir: [ BASE_DIR, 'static' ].join(path.sep),
    prefix: '/v1/static/',
  });

  app.post('/v1/users/register', postRegisterUserCtrl);
  app.post('/v1/user/login', postUserLogin);
}

export function registerAuthNRoutes(app: FastifyInstance) {
  app.get('/v1/user/whoami', getWhoamiCtrl);
}
