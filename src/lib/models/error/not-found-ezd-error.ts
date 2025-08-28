import { EzdError } from './ezd-error';
import { ezdErrorCodes } from './ezd-error-codes';

export class NotFoundEzdError extends EzdError {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, ezdErrorCodes.NOT_FOUND, options);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundEzdError.prototype);
    this.message = `${this.code}: Not Found`;
    if(message !== undefined) {
      this.message = `${this.message} - ${message}`;
    }
  }
}
