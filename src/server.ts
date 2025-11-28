
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';

import { logger } from './lib/logger/logger';
import { registerAuthNRoutes, registerPublicRoutes } from './routes';
import { ezdConfig } from './lib/config';
import { EzdSessionStore } from './lib/middleware/ezd-session-store';
import { authHooks } from './lib/middleware/auth-hooks';
import { userInfoPlug } from './lib/middleware/user-info-plug';

const cookie_max_age_days = 7;

const cookie_max_age_ms = cookie_max_age_days * 24 * 60 * 60 * 1000;

export async function initServer() {
  let app: FastifyInstance;
  let port: number;
  let host: string;

  app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
    // trustProxy: [ '127.0.0.1' ],
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
      // httpOnly: false,
      httpOnly: true,
    },
  });

  /*
  -- Middleware
  _*/

  app.decorateRequest('ctx');
  app.addHook('onRequest', (req, rep, done) => {
    /*
      set request context defaults
    _*/
    req.ctx ??= {};
    done();
  });

  userInfoPlug(app);

  /*
  -- Public routes
  _*/

  registerPublicRoutes(app);

  /*
  -- Authenticated routes
  _*/

  app.register((fastify, opts, done) => {
    // fastify.addHook('preHandler', authHooks.authNPreHandler);
    fastify.addHook('onRequest', authHooks.authNPreHandler);
    registerAuthNRoutes(fastify);
    done();
  });

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
