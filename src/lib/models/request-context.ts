
import { StaticPlugUtils } from '../middleware/static-plug/static-plug';
import { UserDto } from './user-dto';

export type RequestContext = {
  user?: UserDto;
  staticUtils?: StaticPlugUtils;
  getUser: () => UserDto;
};
