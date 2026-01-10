
/* importing has the side-effect of initializing the env _*/
import { prim } from '../../util/validate-primitives';
import { ezdConfig } from '../config';
import { EzdError } from '../models/error/ezd-error';

/*
  TODO: naming TBD. Keeping simple for now.
    A place where secrets live
_*/

export const secretClient = {
  getSecret: getSecret,
} as const;

/*
  reads env for now
_*/
async function getSecret(secretName: string): Promise<string> {
  let expiryMs: number = ezdConfig.SYSTEM_SECRET_EXPIRATION === undefined
    ? Date.now() - (1000 * 60 * 60 * 24) // sufficiently in the past
    : (new Date(ezdConfig.SYSTEM_SECRET_EXPIRATION)).valueOf()
  ;
  if(expiryMs < Date.now()) {
    throw new EzdError(`error getting secret with key: ${secretName}`, 'EZD_0.3');
  }
  let secretVal = process.env[secretName];
  if(!prim.isString(secretVal)) {
    throw new EzdError(`error getting secret with key: ${secretName}`, 'EZD_0.4');
  }
  return secretVal;
}

/*
https://allan.reyes.sh/posts/keeping-secrets-out-of-logs/
_*/
