
import { Type, Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

const GcpNamespaceTSchema = Type.Object({
  // namespace: Type.String(),
  id: Type.String(),
  name: Type.String(),
  // kind: Type.String(),
});
export type GcpNamespace = Static<typeof GcpNamespaceTSchema>;
export const GcpNamespace = {
  schema: GcpNamespaceTSchema,
  decode: (rawVal: unknown): GcpNamespace => tbUtil.decodeWithSchema<
    typeof GcpNamespaceTSchema,
    GcpNamespace
  >(GcpNamespaceTSchema, rawVal),
} as const;
