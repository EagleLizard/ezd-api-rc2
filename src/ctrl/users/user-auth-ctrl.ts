
import { FastifyRequest, FastifyReply } from 'fastify';
import { UserLoginBodySchema } from '../../lib/models/user-login-body';
import { userService } from '../../lib/service/user-service';
import { UserDto } from '../../lib/models/user-dto';

export async function postUserLogin(
  req: FastifyRequest<{
    Body: {
      userName?: string;
      password?: string;
    };
  }>,
  res: FastifyReply
) {
  let user: UserDto | Error | undefined;
  if(!UserLoginBodySchema.check(req.body)) {
    res.status(401);
    return;
  }
  user = await userService.checkUserPassword(req.body.userName, req.body.password);
  if(user instanceof Error) {
    let err = user;
    req.log.info(err.message);
    res.status(401);
    return;
  }
  if(user === undefined) {
    /* invalid password _*/
    res.status(401);
    return;
  }
  /*
  TODO: return valid session info. Like JWT.
  _*/
  res.status(200);
}
