
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';

import { logger } from './lib/logger/logger';
import { registerPublicRoutes } from './routes';
import { ezdConfig } from './lib/config';

export async function initServer() {
  let app: FastifyInstance;
  let port: number;
  let host: string;

  app = Fastify({
    loggerInstance: logger,
  });
  app.register(cors, {
    origin: '*',
    credentials: true,
  });
  /* public routes _*/
  registerPublicRoutes(app);
  host = ezdConfig.EZD_HOST;
  port = ezdConfig.EZD_PORT;

  try {
    await app.listen({ port, host });
    console.log(`Listening on ${host}:${port}`);
  } catch(e) {
    app.log.error(e);
    process.exitCode = 1;
  }
}
