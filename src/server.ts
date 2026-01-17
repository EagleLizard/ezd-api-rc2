
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';

import { logger } from './lib/logger/logger';
import { registerAuthNRoutes, registerRoutes } from './routes';
import { ezdConfig } from './lib/config';
import { EzdSessionStore } from './lib/middleware/ezd-session-store';
import { authHooks } from './lib/middleware/auth-hooks';
import { userInfoPlug } from './lib/middleware/user-info-plug';
import { Metrics } from './lib/lib/metrics';
import { FastifyTypeBox } from './lib/models/fastify/fastify-typebox';
import { apiInit } from './lib/api-init';
import { EzdError } from './lib/models/error/ezd-error';

const cookie_max_age_days = 1;
const cookie_max_age_ms = cookie_max_age_days * 24 * 60 * 60 * 1000;

const devEnv = ezdConfig.isDevEnv();

export async function initServer() {
  let app: FastifyTypeBox;
  let port: number;
  let host: string;

  app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
    // trustProxy: [ '127.0.0.1' ],
  });

  let seshStore = new EzdSessionStore();
  app = app.register(cors, {
    // origin: '*',
    origin: [ ezdConfig.EZD_WEB_ORIGIN ],
    // origin: false,
    credentials: true,
  });
  app = app.register(fastifyCookie);
  app = app.register(fastifySession, {
    secret: ezdConfig.SESSION_SECRET,
    saveUninitialized: false,
    store: seshStore,
    cookieName: ezdConfig.EZD_SESSION_ID_NAME,
    cookie: {
      /* TODO: fix maxAge */
      // maxAge: cookie_max_age_days * 24 * 60 * 60 * 1000,
      maxAge: cookie_max_age_ms,
      secure: 'auto',
      httpOnly: true,
      // sameSite: 'none',
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
    req.ctx ??= {
      getUser: () => {
        if(req.ctx.user === undefined) {
          throw new EzdError('user missing from request context', 'EZD_2.1');
        }
        return req.ctx.user;
      }
    };
    done();
  });
  Metrics.init();

  userInfoPlug(app);

  /*
  -- Public routes
  _*/

  registerRoutes(app);

  /*
  -- Authenticated routes
  _*/

  app.register((fastify, opts, done) => {
    // fastify.addHook('preHandler', authHooks.authNPreHandler);
    fastify.addHook('onRequest', authHooks.authNPreHandler);
    registerAuthNRoutes(fastify);
    done();
  });

  /*
  -- API initialization
  _*/

  await apiInit.setupServer();

  /*
  -- Server Start
  _*/

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
