
import { describe, it, expect } from 'vitest';
import { permUtil } from './perm';

describe('perm tests', () => {

  it('leaf-level permission returns self', () => {
    let testPerm = 'test.read';
    let res = permUtil.resolve(testPerm);
    expect(res.length).toBe(1);
    expect(res[0]).toBe(testPerm);
  });

  it('write resolves to CRUD ops', () => {
    let testPerm = 'test.write';
    let res = permUtil.resolve(testPerm);
    expect(res.length).toBe(3);
    expect(res).toEqual(expect.arrayContaining([
      'test.create',
      'test.update',
      'test.delete',
    ]));
  });

  it('mgmt resolved to all ops', () => {
    let testPerm = 'test.mgmt';
    let res = permUtil.resolve(testPerm);
    expect(res).toEqual(expect.arrayContaining([
      'test.read',
      'test.create',
      'test.update',
      'test.delete',
    ]));
  });

});
