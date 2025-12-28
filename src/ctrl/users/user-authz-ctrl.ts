
import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRoleDto } from '../../lib/models/user/user-role-dto';
import { userService } from '../../lib/service/user-service';
import { EzdError } from '../../lib/models/error/ezd-error';

type PostUserRoleRequest = {
  Body: {
    userName: string;
  };
  Reply: {
    200: {
      roles: UserRoleDto[];
    };
  };
};

export async function postUserRole(
  req: FastifyRequest<PostUserRoleRequest>,
  res: FastifyReply<PostUserRoleRequest>,
) {
  if(req.ctx.user?.user_id === undefined) {
    throw new EzdError('user_id missing from request context', 'EZD_2.1');
  }
  let userRoles = await userService.getRoles(req.ctx.user.user_id);
  return res.status(200).send({
    roles: userRoles,
  });
}
