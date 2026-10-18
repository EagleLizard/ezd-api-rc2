
import Type, { Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

const JcdImgProcJobDataTSchema = Type.Object({
  srcPath: Type.String(),
  destPath: Type.String(), // e.g. bucketFile
  env: Type.String(),
  jcdImageKey: Type.String(),
  projectKey: Type.String(),
});
export type JcdImgProcJobData = Static<typeof JcdImgProcJobDataTSchema>;
export const JcdImgProcJobData = {
  schema: JcdImgProcJobDataTSchema,
  parse: tbUtil.parseFn<
    typeof JcdImgProcJobDataTSchema,
    JcdImgProcJobData
  >(JcdImgProcJobDataTSchema),
} as const;
