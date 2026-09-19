
import { Type, Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

const GcpKeyDtoBaseTSchema = Type.Object({
  namespace: Type.Optional(Type.String()),
  kind: Type.String(),
});
const GcpIdKeyDtoTSchema = Type.Object({
  ...GcpKeyDtoBaseTSchema.properties,
  id: Type.String(),
});
const GcpNameKeyDtoTSchema = Type.Object({
  ...GcpKeyDtoBaseTSchema.properties,
  name: Type.String(),
});
const GcpKeyDtoTSchema = Type.Union([
  GcpIdKeyDtoTSchema,
  GcpNameKeyDtoTSchema,
]);
export type GcpKeyDto = Static<typeof GcpKeyDtoTSchema>;
export const GcpKeyDto = {
  schema: GcpKeyDtoTSchema,
  decode: function decodeGcpKeyDto(rawVal: unknown): GcpKeyDto {
    return tbUtil.decodeWithSchema<typeof GcpKeyDtoTSchema, GcpKeyDto>(GcpKeyDtoTSchema, rawVal);
  }
} as const;
