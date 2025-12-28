
import { Type, Static } from '@sinclair/typebox';
import { tbUtil } from '../../util/tb-util';

const PasswordDtoTSchema = Type.Object({
  password_id: Type.Number(),
  password_hash: Type.String(),
  salt: Type.String(),

  user_id: Type.String(), // FK

  created_at: Type.String({ format: 'pg-date-time' }),
  modified_at: Type.String({ format: 'pg-date-time' }),
});

export type PasswordDto = Static<typeof PasswordDtoTSchema>;

export const PasswordDtoSchema = {
  decode: decodePasswordDto,
} as const;

function decodePasswordDto(rawVal: unknown): PasswordDto {
  return tbUtil.decodeWithSchema(PasswordDtoTSchema, rawVal);
}
