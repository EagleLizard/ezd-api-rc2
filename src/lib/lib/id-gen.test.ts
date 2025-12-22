
import { describe, it, expect, vi, Mocked } from 'vitest';
import crypto from'node:crypto';
import { idGen } from './id-gen';

const cryptoMock = vi.hoisted(() => {

  return {
    randomBytes: vi.fn(),
  };
});
vi.mock('node:crypto',  async (importOriginal) => {
  const orig: Mocked<typeof crypto> = await importOriginal();
  cryptoMock.randomBytes.mockImplementation((size: number) => {
    return orig.randomBytes(size);
  });
  return {
    default: cryptoMock,
  };
});

describe('id-gen tests', () => {
  it('tests rd1() with sequential buffer values', () => {
    cryptoMock.randomBytes.mockImplementationOnce((size) => {
      return getSeqBuf(idGen.charset_rd1);
    });
    let idStr = idGen.rd1(idGen.charset_rd1.length);
    expect(idStr).toEqual(idGen.charset_rd1);
  });
  it('tests nanoid() with sequential buffer values', () => {
    cryptoMock.randomBytes.mockImplementationOnce((size) => {
      return getSeqBuf(idGen.charset_nanoid);
    });
    let idStr = idGen.nanoid(idGen.charset_nanoid.length);
    expect(idStr).toEqual(idGen.charset_nanoid);
  });
});

function getSeqBuf(charset: string): Buffer<ArrayBufferLike> {
  let ints: number[] = [];
  for(let i = 0; i < charset.length; i++) {
    ints.push(i);
  }
  return Buffer.from(ints);
}
