
import { FastifyReply, FastifyRequest } from 'fastify';
import { UserDto } from '../models/user-dto';
import { userService } from '../service/user-service';

export const authHooks = {
  authNPreHandler: authNPreHandler,
} as const;

async function authNPreHandler(req: FastifyRequest, res: FastifyReply) {
  let userDto: UserDto | undefined;
  let seshUserId: UserDto['user_id'] | undefined;
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
