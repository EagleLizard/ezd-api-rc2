
/* typebox utils */

import { Static, TSchema } from 'typebox';
import { DecodeError, Value } from 'typebox/value';
import { Compile } from 'typebox/compile';
import { EzdError } from '../lib/models/error/ezd-error';

export const tbUtil = {
  getSchemaDecodeFn: getSchemaDecodeFn,
  decodeWithSchema: decodeWithSchema,
} as const;

function decodeWithSchema<S extends TSchema>(tschema: S, rawVal: unknown): Static<S> {
  let decoded: Static<S>;
  try {
    decoded = Value.Decode(tschema, rawVal);
  } catch(e) {
    if(!(e instanceof DecodeError)) {
      throw e;
    }
    let errs = Value.Errors(tschema, rawVal);
    [ ...errs ].forEach((err, idx) => {
      console.log(err);
    });
    let errMsg = `${e.cause.errors[0].message}, path: ${e.cause.errors[0].schemaPath}`;
    throw new EzdError(errMsg, 'EZD_1.1', {
      cause: e,
    });
  }
  return decoded;
}

function getSchemaDecodeFn<S extends TSchema>(tschema: S): (rawVal: unknown) => Static<S> {
  let cSchema = Compile(tschema);
  return function schemaDecodeFn(rawVal: unknown) {
    let decoded: Static<S>;
    try {
      decoded = cSchema.Parse(rawVal);
    } catch(e) {
      if(!(e instanceof DecodeError)) {
        throw e;
      }
      let errMsg = `${e.cause.errors[0].message}, path: ${e.cause.errors[0].schemaPath}`;
      throw new EzdError(errMsg, 'EZD_1.1', {
        cause: e,
      });
    }
    return decoded;
  };
}
