
import { Type, Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

const PermissionDtoTSchema = Type.Object({
  permission_id: Type.Integer(),
  permission_name: Type.String(),

  created_at: Type.String({ format: 'pg-date-time' }),
  modified_at: Type.String({ format: 'pg-date-time' }),
});
export type PermissionDto = Static<typeof PermissionDtoTSchema>;

export const PermissionDtoSchema = {
  schema: PermissionDtoTSchema,
  decode: decodePermissionRole,
} as const;

function decodePermissionRole(val: unknown): PermissionDto {
  return tbUtil.decodeWithSchema(PermissionDtoTSchema, val);
}
