
import { FastifyReply, FastifyRequest } from 'fastify';
import { UserDto } from '../../lib/models/user-dto';

type GetWhoamiRequest = {
  Reply: {
    401?: undefined;
    200: {
      user: {
        username: UserDto['user_name'];
        email: UserDto['email'];
      };
    };
  };
};

export async function getWhoamiCtrl(
  req: FastifyRequest<GetWhoamiRequest>,
  res: FastifyReply<GetWhoamiRequest>
) {
  let user: UserDto;
  if(req.ctx.user === undefined) {
    res.status(401).send();
    return res;
  }
  user = req.ctx.user;

  res.status(200).send({
    user: {
      username: user.user_name,
      email: user.email,
    },
  });
  return res;
}
