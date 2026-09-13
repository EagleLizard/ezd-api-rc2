
/* typebox utils */

import type { StaticDecode, StaticType, TSchema } from 'typebox';
import Value, { DecodeError } from 'typebox/value';
import { Compile } from 'typebox/compile';
import { EzdError } from '../lib/models/error/ezd-error';

export const tbUtil = {
  getSchemaDecodeFn: getSchemaDecodeFn,
  decodeWithSchema: decodeWithSchema,
} as const;

function decodeWithSchema<
  S extends TSchema,
  /* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
  T extends StaticType<[], 'Decode', {}, {}, S> = StaticDecode<S>
>(
  tschema: S,
  rawVal: unknown
): StaticDecode<S> {
  let decoded: T;
  try {
    decoded = Value.Decode<S>(tschema, rawVal);
  } catch(e) {
    if(!(e instanceof DecodeError)) {
      throw e;
    }
    let errs = Value.Errors(tschema, rawVal);
    [ ...errs ].forEach((err) => {
      console.log(err);
    });
    let errMsg = `${e.cause.errors[0].message}, path: ${e.cause.errors[0].schemaPath}`;
    throw new EzdError(errMsg, 'EZD_1.1', {
      cause: e,
    });
  }
  return decoded;
}

function getSchemaDecodeFn<S extends TSchema>(tschema: S): (rawVal: unknown) => StaticDecode<S> {
  let cSchema = Compile(tschema);
  return function schemaDecodeFn(rawVal: unknown) {
    // let decoded: Static<S>;
    let decoded: StaticDecode<S>;
    try {
      // decoded = cSchema.Parse(rawVal);
      decoded = cSchema.Decode(rawVal);
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
