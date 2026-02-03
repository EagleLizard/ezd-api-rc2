
import 'dotenv/config';
import { prim } from '../util/validate-primitives';

const DEV_ENV_STR = 'dev';

const ezdConfig = {
  EZD_HOST: getEnvVarOrErr('EZD_HOST'),
  EZD_PORT: getNumberEnvVar('EZD_PORT'),
  EZD_WEB_ORIGIN: getEnvVarOrErr('EZD_WEB_ORIGIN'),
  SESSION_SECRET: getEnvVarOrErr('SESSION_SECRET'),
  EZD_JWT_SECRET: getEnvVarOrErr('EZD_JWT_SECRET'),

  POSTGRES_HOST: getEnvVarOrErr('POSTGRES_HOST'),
  POSTGRES_PORT: getNumberEnvVar('POSTGRES_PORT'),
  POSTGRES_USER: getEnvVarOrErr('POSTGRES_USER'),
  POSTGRES_PASSWORD: getEnvVarOrErr('POSTGRES_PASSWORD'),
  POSTGRES_DB: getEnvVarOrErr('POSTGRES_DB'),

  EZD_SESSION_ID_NAME: 'ezdSeshId',
  EZD_SUPER_USER_USERNAME: getEnvVarOrErr('EZD_SUPER_USER_USERNAME'),
  EZD_SUPER_USER_EMAIL: getEnvVarOrErr('EZD_SUPER_USER_EMAIL'),
  EZD_API_USER_USERNAME: getEnvVarOrErr('EZD_API_USER_USERNAME'),
  EZD_API_USER_EMAIL: getEnvVarOrErr('EZD_API_USER_EMAIL'),
  EZD_DEFAULT_ROLE_NAME: 'Default',
  EZD_SUPER_USER_ROLE_NAME: 'ServerAdmin',

  SYSTEM_SECRET_EXPIRATION: process.env['SYSTEM_SECRET_EXPIRATION'],
  USE_JCD_CACHE: getBoolEnvVar('USE_JCD_CACHE'),

  isDevEnv: isDevEnv,
} as const;

export {
  ezdConfig,
};

function isDevEnv() {
  return process.env.EZD_ENV === DEV_ENV_STR;
}

function getEnvVarOrErr(envKey: string): string {
  let rawEnvVar: string | undefined;
  rawEnvVar = process.env[envKey];
  if(!prim.isString(rawEnvVar)) {
    throw new Error(`Invalid ${envKey}`);
  }
  return rawEnvVar;
}

function getBoolEnvVar(envKey: string): boolean {
  let rawVar = process.env[envKey];
  /* manually parse bool _*/
  if(rawVar === undefined) {
    return false;
  }
  return rawVar.toLowerCase() === 'true';
}

function getNumberEnvVar(envKey: string): number {
  let rawPort: string;
  let portNum: number;
  rawPort = getEnvVarOrErr(envKey);
  portNum = +rawPort;
  if(isNaN(portNum)) {
    throw new Error(`invalid env var ${envKey}, expected 'number'`);
  }
  return portNum;
}
