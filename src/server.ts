
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';

import { logger } from './lib/logger/logger';
import { registerPublicRoutes } from './routes';
import { ezdConfig } from './lib/config';
import { EzdSessionStore } from './lib/middleware/ezd-session-store';

const cookie_max_age_days = 14;

const cookie_max_age_ms = cookie_max_age_days * 24 * 60 * 60 * 1000;

export async function initServer() {
  let app: FastifyInstance;
  let port: number;
  let host: string;

  app = Fastify({
    loggerInstance: logger,
  });
  app.register(cors, {
    // origin: '*',
    origin: ezdConfig.EZD_WEB_ORIGIN,
    credentials: true,
  });
  app.register(fastifyCookie);
  let seshStore = new EzdSessionStore();
  app.register(fastifySession, {
    secret: ezdConfig.SESSION_SECRET,
    saveUninitialized: true,
    store: seshStore,
    cookieName: ezdConfig.EZD_SESSION_ID_NAME,
    cookie: {
      /* TODO: fix maxAge */
      // maxAge: cookie_max_age_days * 24 * 60 * 60 * 1000,
      maxAge: cookie_max_age_ms,
      secure: 'auto',
      httpOnly: false,
    },
  });

  // app.addHook('onSend', (req, rep, payload: unknown, done) => {
  //   // console.log(req.session);
  //   // console.log(req.cookies);
  //   done();
  // });

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
