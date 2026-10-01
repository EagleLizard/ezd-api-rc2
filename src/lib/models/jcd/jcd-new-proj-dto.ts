
import Type, { Static } from 'typebox';
import { JcdProject } from './jcd-project';
import { tbUtil } from '../../../util/tb-util';

const JcdNewProjDtoTSchema = Type.Object({
  ...JcdProject.schema.properties,
  playwright: Type.Optional(JcdProject.schema.properties.playwright),
  description: Type.Optional(JcdProject.schema.properties.description),
  productionCredits: Type.Optional(JcdProject.schema.properties.productionCredits),
  mediaAndPress: Type.Optional(JcdProject.schema.properties.mediaAndPress),
});
export type JcdNewProjDto = Static<typeof JcdNewProjDtoTSchema>;
export const JcdNewProjDto = {
  schema: JcdNewProjDtoTSchema,
  decode: function decodeJcdNewProjDto(rawVal: unknown): JcdNewProjDto {
    return tbUtil.decodeWithSchema<
      typeof JcdNewProjDtoTSchema,
      JcdNewProjDto
    >(JcdNewProjDtoTSchema, rawVal);
  }
};
