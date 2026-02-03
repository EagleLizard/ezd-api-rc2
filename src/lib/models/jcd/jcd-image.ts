
import { Type, Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

const JcdImageTSchema = Type.Object({
  id: Type.String(),
  projectKey: Type.String(),
  bucketFile: Type.String(),
  /*
    unsure if used
    TODO: check to deprecate
  _*/
  orderIdx: Type.String(),
  imageType: Type.String(),
});
export type JcdImage = Static<typeof JcdImageTSchema>
export const JcdImage = {
  schema: JcdImageTSchema,
  decode: decodeJcdImage,
} as const;

function decodeJcdImage(rawVal: unknown): JcdImage {
  return tbUtil.decodeWithSchema(JcdImageTSchema, rawVal);
}
