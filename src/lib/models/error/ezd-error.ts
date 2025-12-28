
import { prim } from '../../../util/validate-primitives';
import { EzdErrorCode, ezdErrorCodes } from './ezd-error-codes';

/*
Intended as a superclass, but can be used without extending
_*/
export class EzdError extends Error {
  public readonly code: string;
  public readonly ezdMsg: string;
  constructor(message?: string, code?: EzdErrorCode)
  constructor(message?: string, options?: ErrorOptions)
  constructor(message?: string, code?: EzdErrorCode, options?: ErrorOptions)
  constructor(message?: string, code?: EzdErrorCode | ErrorOptions, options?: ErrorOptions) {
    if(prim.isObject(code)) {
      options = code;
      code = undefined;
    } else if(!prim.isString(code)) {
      code = ezdErrorCodes.DEFAULT;
    }
    super(message, options);
    this.name = 'EzdError';
    Object.setPrototypeOf(this, EzdError.prototype);
    this.code = code ?? ezdErrorCodes.DEFAULT;
    this.ezdMsg = this.message;
    /* for logging: include code and message _*/
    this.message = `${this.code}: ${this.ezdMsg}`;
  }
}
