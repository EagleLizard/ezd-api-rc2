
import 'dotenv/config';
import { prim } from '../util/validate-primitives';

const DEV_ENV_STR = 'dev';

const ezdConfig = {
  EZD_HOST: getEnvVarOrErr('EZD_HOST'),
  EZD_PORT: getNumberEnvVar('EZD_PORT'),
  EZD_WEB_ORIGIN: getEnvVarOrErr('EZD_WEB_ORIGIN'),
  SESSION_SECRET: getEnvVarOrErr('SESSION_SECRET'),

  POSTGRES_HOST: getEnvVarOrErr('POSTGRES_HOST'),
  POSTGRES_PORT: getNumberEnvVar('POSTGRES_PORT'),
  POSTGRES_USER: getEnvVarOrErr('POSTGRES_USER'),
  POSTGRES_PASSWORD: getEnvVarOrErr('POSTGRES_PASSWORD'),
  POSTGRES_DB: getEnvVarOrErr('POSTGRES_DB'),

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
