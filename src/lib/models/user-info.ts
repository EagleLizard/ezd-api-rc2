
import { Type, Static } from 'typebox';
import { tbUtil } from '../../util/tb-util';

import { UserDtoSchema } from './user-dto';

const UserInfoTSchema = Type.Object({
  ...UserDtoSchema.schema.properties,
});

export type UserInfo = Static<typeof UserInfoTSchema>;

export const UserInfoSchema = {
  decode: userInfoDecode,
  schema: UserInfoTSchema,
};

function userInfoDecode(rawVal: unknown): UserInfo {
  return tbUtil.decodeWithSchema(UserInfoTSchema, rawVal);
}
