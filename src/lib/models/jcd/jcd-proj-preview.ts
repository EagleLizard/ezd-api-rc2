
import { Type, Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

const JcdProjPreviewTSchema = Type.Object({
  projectKey: Type.String(),
  route: Type.String(),
  title: Type.String(),
  titleUri: Type.String(),
  orderIndex: Type.Number(),
});
export type JcdProjPreview = Static<typeof JcdProjPreviewTSchema>;
export const JcdProjPreview = {
  schema: JcdProjPreviewTSchema,
  decode: decodeJcdProjPreview,
} as const;

function decodeJcdProjPreview(rawVal: unknown): JcdProjPreview {
  return tbUtil.decodeWithSchema(JcdProjPreviewTSchema, rawVal);
}
