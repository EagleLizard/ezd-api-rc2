
import { FastifyInstance } from 'fastify';
import { getHealthCtrl } from './ctrl/get-health';
import { getIndexCtrl } from './ctrl/get-index';

export function registerPublicRoutes(app: FastifyInstance) {
  app.get('/health', getHealthCtrl);

  app.get('/', getIndexCtrl);
}
