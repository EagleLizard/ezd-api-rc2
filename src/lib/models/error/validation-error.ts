
/*
2024 writeup reference: https://medium.com/@Nelsonalfonso/understanding-custom-errors-in-typescript-a-complete-guide-f47a1df9354c
_*/

export class ValidationError extends Error {
  public readonly code: string;
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
    /*
    TODO: pass code in ctor. non-static.
      e.g.:
        EZD_0.0 -> default validation error
        EZD_0.1 -> email validation error
        EZD_1.0 -> some other error (another class)
    _*/
    this.code = 'EZD_0.0';
  }
}
