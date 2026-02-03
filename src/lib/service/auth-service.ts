
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

function getJwt(userId: UserDto['user_id'], opts: GetJwtOpts = {}): string {
  let payload: JwtPayload = {
    iss: opts.iss ?? jwtConfig.ezdApiIssuer,
    aud: opts.aud ?? 'ezd-user',
    exp: opts.exp ?? Math.ceil(Date.now() / 1000) + 7200,
    userId: userId,
  };
  let token = jwt.sign(payload, ezdConfig.EZD_JWT_SECRET);
  return token;
}

function checkJwt(token: string): DecodedJwt | undefined {
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
