
import { Type, Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

const GcpKindTSchema = Type.Object({
  namespace: Type.Union([ Type.Undefined(), Type.String() ]),
  name: Type.String(),
  kind: Type.String(),
});
export type GcpKind = Static<typeof GcpKindTSchema>;

export const GcpKind = {
  schema: GcpKindTSchema,
  decode: function decodeGcpKind(rawVal: unknown): GcpKind {
    return tbUtil.decodeWithSchema(GcpKindTSchema, rawVal);
  },
} as const;
