
import Type, { Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

const JcdImgProcJobDataTSchema = Type.Object({
  srcPath: Type.String(),
});
export type JcdImgProcJobData = Static<typeof JcdImgProcJobDataTSchema>;
export const JcdImgProcJobData = {
  schema: JcdImgProcJobDataTSchema,
  parse: tbUtil.parseFn<
    typeof JcdImgProcJobDataTSchema,
    JcdImgProcJobData
  >(JcdImgProcJobDataTSchema),
} as const;
