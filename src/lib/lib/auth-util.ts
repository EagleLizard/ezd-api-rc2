
import crypto from 'node:crypto';

const pw_keylen = 64;
const pw_cost = 2**17;
const pw_block_size = 8;
const pw_maxmem = 129 * 1024 * 1024;

export const authUtil = {
  getPasswordHash: getPasswordHash,
  checkPasswordsEqual: checkPasswordsEqual,
} as const;

async function checkPasswordsEqual(
  userPwHash: string,
  salt: string,
  pwToCheck: string
): Promise<boolean> {
  let pwToCheckBuf: Buffer<ArrayBufferLike>;
  let userPwBuf: Buffer<ArrayBufferLike>;
  let pwMatch: boolean;
  pwToCheckBuf = await authUtil.getPasswordHash(pwToCheck, salt);
  userPwBuf = Buffer.from(userPwHash, 'base64');
  pwMatch = crypto.timingSafeEqual(pwToCheckBuf, userPwBuf);
  return pwMatch;
}

async function getPasswordHash(password: string, salt: string): Promise<Buffer<ArrayBufferLike>> {
  let passwordHash: Buffer<ArrayBufferLike>;
  let pwHashPromise: Promise<Buffer<ArrayBufferLike>>;
  pwHashPromise = new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, pw_keylen, {
      cost: pw_cost,
      blockSize: pw_block_size,
      maxmem: pw_maxmem,
    }, (err, derivedKey) => {
      if(err) {
        return reject(err);
      }
      resolve(derivedKey);
    });
  });
  passwordHash = await pwHashPromise;
  return passwordHash;
}
