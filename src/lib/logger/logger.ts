
import path from 'node:path';
import pino from 'pino';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type {
  FastifyBaseLogger,
  FastifyReply,
  FastifyRequest,
  FastifySchema,
  FastifyTypeProviderDefault,
  RawServerDefault,
  RouteGenericInterface,
} from 'fastify';
import type { ResSerializerReply } from 'fastify/types/logger';

import { ezdConfig } from '../config';
import { files } from '../../util/files';
import { APP_LOGGER_NAME, LOG_DIR_PATH, LOG_FILE_EXT } from '../constants';

const dev_env = ezdConfig.isDevEnv();

const log_level = (dev_env) ? 'debug' : 'info';

export const logger = initLogger();

function initLogger(): FastifyBaseLogger {
  let logger: pino.Logger;
  let opts: pino.LoggerOptions;
  let streams: pino.StreamEntry[];
  let multistreamOpts: pino.MultiStreamOptions;
  let stream: pino.MultiStreamRes;
  let logFileName: string;
  let errorLogFileName: string;
  let logFilePath: string;
  let errorLogFilePath: string;
  let logStream: pino.DestinationStream;
  let errorLogStream: pino.DestinationStream;

  files.mkdirIfNotExist(LOG_DIR_PATH);

  logFileName = `${APP_LOGGER_NAME}.${LOG_FILE_EXT}`;
  errorLogFileName = `${APP_LOGGER_NAME}.error.${LOG_FILE_EXT}`;
  logFilePath = [
    LOG_DIR_PATH,
    logFileName,
  ].join(path.sep);
  errorLogFilePath = [
    LOG_DIR_PATH,
    errorLogFileName,
  ].join(path.sep);
  logStream = pino.transport({
    target: 'pino/file',
    options: {
      destination: logFilePath,
    },
  });
  errorLogStream = pino.transport({
    target: 'pino/file',
    options: {
      destination: errorLogFilePath,
    },
  });
  streams = [
    { level: 'error', stream: errorLogStream },
    { level: log_level, stream: logStream },
  ];
  if(dev_env) {
    streams.push({ level: log_level, stream: process.stdout });
  }
  multistreamOpts = {
    // dedupe: true // send logs only to the stream with the higher level
  };
  stream = pino.multistream(streams, multistreamOpts);
  opts = {
    level: log_level,
    formatters: {
      level: (label) => {
        if(label === 'debug') {
          label = label.toLocaleUpperCase();
        }
        return {
          level: label,
        };
      },
      bindings: (bindings) => {
        return {
          pid: bindings.pid,
          // host: bindings.hostname,
        };
      },
    },
    /*
      See: https://github.com/fastify/fastify/blob/7f6d31980632eaa9c751dda48da8d12ff76ab411/lib/logger-pino.js#L47
    _*/
    serializers: {
      req(req: FastifyRequest) {
        return {
          method: req.method,
          url: req.url,
          version: req.headers && req.headers['accept-version'],
          host: req.host,
          remoteAddress: req.ip,
          remotePort: req.socket ? req.socket.remotePort : undefined,
        };
      },
      res(rep: ResSerializerReply<
        RawServerDefault,
        FastifyReply<
          RouteGenericInterface,
          RawServerDefault,
          IncomingMessage,
          ServerResponse<IncomingMessage>,
          unknown,
          FastifySchema,
          FastifyTypeProviderDefault,
          unknown>
        >) {
        return {
          statusCode: rep.statusCode,
          method: rep.request?.method,
          url: rep.request?.url,
        };
      }
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };
  logger = pino(opts, stream);
  return logger;
}
