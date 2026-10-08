
import Type, { Static } from 'typebox';
import Value from 'typebox/value';
import { tbUtil } from '../../../util/tb-util';

const JcdImageTSchema = Type.Object({
  active: Type.Boolean(),
  id: Type.String(),
  projectKey: Type.String(),
  bucketFile: Type.String(),
  /*
    unsure if used
    TODO: check to deprecate
  _*/
  orderIdx: Type.Number(),
  // imageType: Type.String(),
  imageType: Type.Union([
    Type.Literal('GALLERY'),
    Type.Literal('TITLE'),
  ]),
});
export type JcdImage = Static<typeof JcdImageTSchema>
export const JcdImage = {
  schema: JcdImageTSchema,
  clone: (jcdImage: JcdImage): JcdImage => {
    return Value.Clone<JcdImage>(jcdImage);
  },
  parse: tbUtil.parseFn<typeof JcdImageTSchema, JcdImage>(JcdImageTSchema),
  decode: decodeJcdImage,
} as const;

function decodeJcdImage(rawVal: unknown): JcdImage {
  return tbUtil.decodeWithSchema<typeof JcdImageTSchema, JcdImage>(JcdImageTSchema, rawVal);
}
