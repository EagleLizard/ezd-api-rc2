
import crypto from 'node:crypto';

import { EzdError } from '../models/error/ezd-error';
import { ezdErrorCodes } from '../models/error/ezd-error-codes';
import { JwtHeader, JwtHeaderSchema } from '../models/jwt-header';
import { JwtPayload, JwtPayloadSchema } from '../models/jwt-payload';

type DecodedJwt = {
  header: JwtHeader;
  payload: JwtPayload;
  signature: string;
};

/*
see:
  - https://stackoverflow.com/a/38552302/4677252
    - simple jwt decode in nodejs
  - https://github.com/auth0/jwt-decode/blob/ff2c4b21b8fcb501f32fc26120a6a7e734a6f388/lib/index.ts
    - auth0 repo, referenced for typedefs
_*/
export const jwt = {
  decode: decode,
  sign: sign,
  verify: verify,
} as const;

function verify(token: string, secret: string) {
  let headerPart: string;
  let payloadPart: string;
  let sigPart: string;
  let tokenParts: string[];
  tokenParts = token.split('.');
  if(tokenParts.length !== 3) {
    throw new EzdError(
      `Invalid JWT - expected 3 parts, receieved: ${tokenParts.length}`,
      ezdErrorCodes.INVALID_JWT
    );
  }
  [ headerPart, payloadPart, sigPart ] = tokenParts;
  let verifySigBuf: Buffer<ArrayBufferLike> = crypto.createHmac('sha256', secret)
    .update(`${headerPart}.${payloadPart}`)
    .digest()
  ;
  let sigBuf = Buffer.from(sigPart, 'base64url');
  let sigsEqual = crypto.timingSafeEqual(verifySigBuf, sigBuf);
  return sigsEqual;
}

function sign(payload: JwtPayload, secret: string) {
  let jwtHeader: JwtHeader;
  let jwtPaylaod: JwtPayload;
  let encHeader: string;
  let encPayload: string;
  let jwtSig: string;
  let token: string;
  /* default */
  jwtHeader = {
    alg: 'HS256',
    typ: 'JWT',
  };
  jwtPaylaod = Object.assign({
    exp: Math.ceil(Date.now() / 1000) + 5
  }, payload);
  encHeader = Buffer.from(JSON.stringify(jwtHeader)).toString('base64url');
  encPayload = Buffer.from(JSON.stringify(jwtPaylaod)).toString('base64url');
  jwtSig = crypto.createHmac('sha256', secret)
    .update(`${encHeader}.${encPayload}`)
    .digest()
    .toString('base64url')
  ;
  token = `${encHeader}.${encPayload}.${jwtSig}`;
  return token;
}

function decode(token: string): DecodedJwt {
  let tokenParts: string[];
  let headerPart: string;
  let payloadPart: string;
  let headerBuf: Buffer;
  let payloadBuf: Buffer;
  let signaturePart: string;
  let jwtHeader: JwtHeader;
  let jwtPayload: JwtPayload;

  let decodedJwt: DecodedJwt;

  tokenParts = token.split('.');
  if(tokenParts.length < 3) {
    throw new EzdError(
      `Invalid JWT - expected 3 parts, receieved: ${tokenParts.length}`,
      ezdErrorCodes.INVALID_JWT
    );
  }
  [ headerPart, payloadPart, signaturePart ] = tokenParts;
  try {
    headerBuf = Buffer.from(headerPart, 'base64');
    jwtHeader = JwtHeaderSchema.decode(JSON.parse(headerBuf.toString()));
  } catch(e) {
    throw new EzdError('Invalid JWT Header', ezdErrorCodes.INVALID_JWT, {
      cause: e,
    });
  }
  try {
    payloadBuf = Buffer.from(payloadPart, 'base64');
    jwtPayload = JwtPayloadSchema.decode(JSON.parse(payloadBuf.toString()));
  } catch(e) {
    throw new EzdError('Invalid JWT Payload', ezdErrorCodes.INVALID_JWT, {
      cause: e,
    });
  }
  decodedJwt = {
    header: jwtHeader,
    payload: jwtPayload,
    signature: signaturePart,
  };
  return decodedJwt;
}
