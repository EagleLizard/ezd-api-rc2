
import { FastifyReply, FastifyRequest } from 'fastify';
import { UserDto } from '../../lib/models/user-dto';
import { UserInfo } from '../../lib/models/user-info';

type GetWhoamiRequest = {
  Reply: {
    401?: undefined;
    200: {
      user: UserInfo,
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
    user: user,
  });
  return res;
}
