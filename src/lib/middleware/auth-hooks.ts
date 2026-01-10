
import { FastifyReply, FastifyRequest } from 'fastify';
import { UserDto } from '../models/user-dto';
import { userService } from '../service/user-service';
import { authService } from '../service/auth-service';

const bearer_header_prefix = 'Bearer ';

export const authHooks = {
  authNPreHandler: authNPreHandler,
} as const;

async function authNPreHandler(req: FastifyRequest, res: FastifyReply) {
  let userDto: UserDto | undefined;
  let seshUserId: UserDto['user_id'] | undefined;

  if(
    req.headers.authorization !== undefined
    && req.headers.authorization.startsWith(bearer_header_prefix)
  ) {
    let token = req.headers.authorization.substring(bearer_header_prefix.length);
    let validToken = await authService.checkJwt(token);
    let tokenUserId = validToken?.payload.userId;
    if(!validToken || tokenUserId === undefined) {
      return res.status(401).send();
    }
    userDto = await userService.getUserById(tokenUserId);
    req.ctx.user = userDto;
    return;
  }

  seshUserId = await userService.getLoggedInUser(req.session.sessionId);
  if(seshUserId === undefined) {
    return res.status(401).send();
  }
  userDto = await userService.getUserById(seshUserId);
  if(userDto === undefined) {
    res.status(401).send();
    return res;
  }
  req.ctx.user = userDto;
}
