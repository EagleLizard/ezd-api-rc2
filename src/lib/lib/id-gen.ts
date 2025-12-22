
import crypto from 'node:crypto';

const charset_rd1 = 'acdefhjmnrtvwxyAEFHJLMNRT2345678';
const charset_rd2 = 'abcdefghjmnortvwxyABDEFGHIJKLMNPQRSTU23456789';
const charset_nanoid = '_-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const idGen = {
  charset_rd1: charset_rd1,
  charset_rd2: charset_rd2,
  charset_nanoid: charset_nanoid,
  nanoid: genNanoid,
  rd1: genRd1,
  rd2: genRd2,
  genId: genId,
} as const;

/*
rd1 = readable1
  Encodes based on a charset I came up with that optimizes for:
    1. Alphanumeric characters
    2. Reduced ambiguity for human readability

  We want to get random bytes that the charset can fit into.
  For a charset of length 32, the maximum byte value is: 100000

  See:
    - nanoid: https://github.com/ai/nanoid/blob/9d574d2c9706f5cf82e2a043450c62664ea1fcf1/index.js
    - c# base32 converter: https://olegignat.com/base32/
    - https://github.com/EagleLizard/septem-ezd-2/blob/main/docs/id-gen-encoding.md
_*/

function genRd1(len: number): string {
  return genId(len, charset_rd1);
}

/*
  With charset of 45 chars and len = 17, probability of collision is 1% after ~2 million years
    generating 1000 ids per hour. That's ~17,520,000,000,000, or 17.5 trillion
    With len = 15, it's ~350,400,000,000, 350 billion
_*/
function genRd2(len: number = 17): string {
  return genId(len, charset_rd2);
}

function genNanoid(len: number = 21): string {
  return genId(len, charset_nanoid);
}

function genId(len: number, charset: string): string {
  /*
  see: https://github.com/ai/nanoid/blob/9d574d2c9706f5cf82e2a043450c62664ea1fcf1/index.js#L38C13-L38C69
  _*/
  let mask = (2 << (31 - Math.clz32((charset.length - 1) | 1))) - 1;
  /* we might skip bytes, so create more than we will need _*/
  let buf = crypto.randomBytes(len * 2);
  let res = '';
  let bufPos = 0;
  while(res.length < len) {
    if(bufPos > (buf.length - 1)) {
      buf = crypto.randomBytes(len * 2);
      bufPos = 0;
    }
    let byte = buf[bufPos++] & mask;
    let c = charset[byte];
    if(c !== undefined) {
      res += charset[byte];
    }
  }
  return res;
}
