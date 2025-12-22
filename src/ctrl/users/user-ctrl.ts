
import { FastifyReply, FastifyRequest } from 'fastify';

import { UserDto } from '../../lib/models/user-dto';
import { userService } from '../../lib/service/user-service';

type UserBasic = {
  user_id: UserDto['user_id'];
  user_name: UserDto['user_name'];
  created_at: UserDto['created_at'];
} & {};

type GetUserRequest = {
  Params: {
    username: string;
  }
  Reply: {
    401?: undefined,
    404?: undefined,
    200: {
      user: UserBasic;
    };
  };
} & {};

export async function getUserCtrl(
  req: FastifyRequest<GetUserRequest>,
  res: FastifyReply<GetUserRequest>
) {
  let user: UserDto | undefined;
  let username: string;
  username = req.params.username;
  user = await userService.getUserByName(username);
  if(user === undefined) {
    return res.status(404).send('404 - User not found');
  }
  /*
    Default) respond with basic user info
      - TODO: may want logic here to return more detailed user info for
        users with certain administrative privileges
  _*/
  let userInfo: UserBasic;
  userInfo = {
    user_id: user.user_id,
    user_name: user.user_name,
    created_at: user.created_at,
  };
  await res.status(200).send({
    user: userInfo,
  });
}
