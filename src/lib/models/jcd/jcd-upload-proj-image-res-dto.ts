
import Type, { Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';
import { JobDto } from '../job/job-dto';
import { JcdImage } from './jcd-image';

const JcdUploadProjImageResDtoTSchema = Type.Object({
  job_id: JobDto.schema.properties.job_id,
  jcdImage: JcdImage.schema,
});
export type JcdUploadProjImageResDto = Static<typeof JcdUploadProjImageResDtoTSchema>;
export const JcdUploadProjImageResDto = {
  schema: JcdUploadProjImageResDtoTSchema,
  parse: tbUtil.parseFn<
    typeof JcdUploadProjImageResDtoTSchema,
    JcdUploadProjImageResDto
  >(JcdUploadProjImageResDtoTSchema),
} as const;
