
import { Static, Type } from 'typebox';
import { describe, test, expect } from 'vitest';
import { tbUtil } from './tb-util';
import { EzdError } from '../lib/models/error/ezd-error';
import assert from 'node:assert';
import { DecodeError } from 'typebox/value';

const TSchemaMock = Type.Object({
  a: Type.String(),
  b: Type.Number(),
});
type TSchemaMock = Static<typeof TSchemaMock>;

describe('tb-util', () => {
  test('decodes properly', () => {
    let mockObj: TSchemaMock;
    let rawVal = {
      a: 'str',
      b: 1,
    } as const;
    mockObj = tbUtil.decodeWithSchema(TSchemaMock, rawVal);
    expect(mockObj.a).toBe(rawVal.a);
    expect(mockObj.b).toBe(rawVal.b);
  });
  test('decode invalid raw value throws', () => {
    let rawVal = {
      notExist: 'etc',
    } as const;
    expect(() => {
      tbUtil.decodeWithSchema(TSchemaMock, rawVal);
    }).toThrow(EzdError);
  });
  test('decode error throws validation info', () => {
    let err: EzdError | undefined;
    let rawVal = {
      notExist: 'etc',
    } as const;
    try {
      tbUtil.decodeWithSchema(TSchemaMock, rawVal);
    } catch(e) {
      if(!(e instanceof EzdError) || e.code !== 'EZD_1.1') {
        throw e;
      }
      err = e;
    } finally {
      assert(err !== undefined);
    }
    expect(err.cause).toBeDefined();
    assert(err.cause !== undefined && err.cause instanceof DecodeError);
    expect(err.cause.cause.errors[0].params).toHaveProperty('requiredProperties');
    assert('requiredProperties' in err.cause.cause.errors[0].params);
    expect(err.cause.cause.errors[0].params.requiredProperties).toContain('a');
    expect(err.cause.cause.errors[0].params.requiredProperties).toContain('b');
  });
});
