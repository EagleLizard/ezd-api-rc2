
import { FastifyInstance } from 'fastify';
import { getHealthCtrl } from './ctrl/get-health';
import { getIndexCtrl } from './ctrl/get-index';
import { postRegisterUserCtrl } from './ctrl/users/register-user-ctrl';
import { postUserLogin } from './ctrl/users/user-auth-ctrl';

export function registerPublicRoutes(app: FastifyInstance) {
  app.get('/health', getHealthCtrl);

  app.get('/', getIndexCtrl);

  app.post('/v1/users/register', postRegisterUserCtrl);
  app.post('/v1/user/login', postUserLogin);
}
