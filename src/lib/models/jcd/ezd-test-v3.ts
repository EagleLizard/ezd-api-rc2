
import { Type, Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

const DateToString = Type.Codec(Type.String())
  .Decode(value => {
    return new Date(value);
  })
  .Encode(value => {
    return value.toISOString();
  });

const EzdTestV3TSchema = Type.Object({
  // id: Type.Number(),
  title: Type.String(),
  created_at: Type.String(),
  modified_at: Type.String(),
});
export type EzdTestV3 = Static<typeof EzdTestV3TSchema>;
export const EzdTestV3 = {
  schema: EzdTestV3TSchema,
  decode: decodeEzdTestV3,
} as const;
function decodeEzdTestV3(rawVal: unknown): EzdTestV3 {
  return tbUtil.decodeWithSchema(EzdTestV3TSchema, rawVal);
}
