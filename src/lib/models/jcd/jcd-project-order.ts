
import { Type, Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

const JcdProjectOrderTSchema = Type.Object({
  projectKey: Type.String(),
  orderIdx: Type.Number(),
});
export type JcdProjectOrder = Static<typeof JcdProjectOrderTSchema>;
export const JcdProjectOrder = {
  schema: JcdProjectOrderTSchema,
  decode: decodeJcdProjectOrder,
} as const;

function decodeJcdProjectOrder(rawVal: unknown): JcdProjectOrder {
  return tbUtil.decodeWithSchema(JcdProjectOrderTSchema, rawVal);
}
