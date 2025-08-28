
import { Type, Static } from '@sinclair/typebox';
import { tbUtil } from '../../util/tb-util';

const PasswordDtoTSchema = Type.Object({
  password_id: Type.Number(),
  password_hash: Type.String(),
  salt: Type.String(),

  user_id: Type.Integer(), // FK

  created_at: Type.Date(),
  modified_at: Type.Date(),
});

export type PasswordDto = Static<typeof PasswordDtoTSchema>;

export const PasswordDtoSchema = {
  decode: decodePasswordDto,
} as const;

function decodePasswordDto(rawVal: unknown): PasswordDto {
  return tbUtil.decodeWithSchema(PasswordDtoTSchema, rawVal);
}
