
import { UserDto } from '../models/user-dto';
import { ezdConfig } from '../config';
import { JwtPayload } from '../models/jwt-payload';
import { jwtConfig } from '../lib/jwt/jwt-config';
import { DecodedJwt, jwt } from '../lib/jwt/jwt';
import { logger } from '../logger/logger';

export const authService = {
  getJwt: getJwt,
  checkJwt: checkJwt,
} as const;

type GetJwtOpts = {
  iss?: string;
  aud?: string;
  exp?: number;
} & {};

async function getJwt(user: UserDto, opts: GetJwtOpts = {}): Promise<string> {
  let token: string;
  let payload: JwtPayload;
  let iss = opts.iss ?? jwtConfig.ezdApiIssuer;
  let aud = opts.aud ?? 'ezd-user';
  let exp = opts.exp ?? Math.ceil(Date.now() / 1000) + 7200;
  payload = {
    iss: iss,
    aud: aud,
    exp: exp,
    userId: user.user_id,
  };
  token = jwt.sign(payload, ezdConfig.EZD_JWT_SECRET);
  return token;
}

async function checkJwt(token: string): Promise<DecodedJwt | undefined> {
  let valid: boolean;
  try {
    valid = jwt.verify(token, ezdConfig.EZD_JWT_SECRET);
  } catch(e) {
    logger.error(e);
    valid = false;
  }
  if(!valid) {
    return undefined;
  }
  let decodedJwt = jwt.decode(token);
  return decodedJwt;
}
