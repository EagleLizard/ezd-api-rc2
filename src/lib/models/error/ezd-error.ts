
import { prim } from '../../../util/validate-primitives';
import { ezdErrorCodes } from './ezd-error-codes';

/*
Intended as a superclass, but can be used without extending
_*/
export class EzdError extends Error {
  public readonly code: string;
  constructor(message?: string, code?: string)
  constructor(message?: string, options?: ErrorOptions)
  constructor(message?: string, code?: string, options?: ErrorOptions)
  constructor(message?: string, code?: string | ErrorOptions, options?: ErrorOptions) {
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
    this.message = `${this.code}: ${this.message}`;
  }
}
