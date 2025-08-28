
import { FastifyReply, FastifyRequest } from 'fastify';
import { RegisterUserBody, RegisterUserBodySchema } from '../../lib/models/register-user-body';
import { userService } from '../../lib/service/user-service';
import { ValidationError } from '../../lib/models/error/validation-error';

export async function postRegisterUserCtrl(
  req: FastifyRequest<{
    Body: {
      userName?: string;
      email?: string;
      password?: string;
    }
  }>,
  res: FastifyReply
) {
  let body: RegisterUserBody;
  if(!RegisterUserBodySchema.check(req.body)) {
    return res.code(403);
  }
  body = RegisterUserBodySchema.decode(req.body);
  let registerUserRes = await userService.registerUser(body);
  if(registerUserRes !== undefined) {
    let errMsg: string;
    errMsg = 'Error creating user';
    if(registerUserRes instanceof ValidationError) {
      errMsg = registerUserRes.message;
    }
    req.log.info(errMsg);
    res.code(403);
    return res.send({
      errMsg,
    });
  }
  console.log('after registerUser');
  res.code(200);
}
