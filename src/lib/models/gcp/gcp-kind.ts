
import { Type, Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

const GcpKeyBaseTSchema = Type.Object({
  namespace: Type.Optional(Type.String()),
  kind: Type.String(),
});
const GcpKeyTSchema = Type.Union([
  Type.Object({
    ...GcpKeyBaseTSchema.properties,
    name: Type.String(),
  }),
  Type.Object({
    ...GcpKeyBaseTSchema.properties,
    id: Type.String(),
  }),
]);
export type GcpKey = Static<typeof GcpKeyTSchema>;

export const GcpKey = {
  schema: GcpKeyTSchema,
  decode: function decodeGcpKey(rawVal: unknown): GcpKey {
    return tbUtil.decodeWithSchema<typeof GcpKeyTSchema, GcpKey>(GcpKeyTSchema, rawVal);
  },
} as const;
