
import { EzdError } from './ezd-error';

export class InvalidPasswordError extends EzdError {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, 'EZD_0.1', options);
    this.name = 'InvalidPasswordError';
    Object.setPrototypeOf(this, InvalidPasswordError.prototype);
    this.message = `${this.code}: Invalid password`;
    if(message !== undefined) {
      this.message = `${this.message} - ${message}`;
    }
  }
}
