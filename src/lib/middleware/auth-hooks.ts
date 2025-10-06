
import { FastifyReply, FastifyRequest } from 'fastify';
import { UserDto } from '../models/user-dto';
import { userService } from '../service/user-service';

export const authHooks = {
  authNPreHandler: authNPreHandler,
} as const;

async function authNPreHandler(req: FastifyRequest, res: FastifyReply) {
  let userDto: UserDto | undefined;
  if(req.session.user_id === undefined) {
    res.status(401).send();
    return res;
  }
  userDto = await userService.getUserById(req.session.user_id);
  if(userDto === undefined) {
    res.status(401).send();
    return res;
  }
  req.ctx.user = userDto;
}
