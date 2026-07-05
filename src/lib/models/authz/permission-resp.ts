
import { Type, Static } from 'typebox';
import { PermissionDtoSchema } from './permission-dto';
import { tbUtil } from '../../../util/tb-util';

const PermissionRespTSchema = Type.Object({
  id: PermissionDtoSchema.schema.properties.permission_id,
  name: PermissionDtoSchema.schema.properties.permission_name,
});
export type PermissionResp = Static<typeof PermissionRespTSchema>;

export const PermissionRespSchema = {
  schema: PermissionRespTSchema,
  decode: decodePermissionResp,
} as const;

function decodePermissionResp(rawVal: unknown): PermissionResp {
  return tbUtil.decodeWithSchema(PermissionRespTSchema, rawVal);
}
