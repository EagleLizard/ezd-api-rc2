import Type, { Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

const JcdProjKeyDtoTSchema = Type.Object({
  projectKey: Type.String(),
  active: Type.Boolean(),
});
export type JcdProjKeyDto = Static<typeof JcdProjKeyDtoTSchema>;
export const JcdProjKeyDto = {
  schema: JcdProjKeyDtoTSchema,
  decode: function decodeJcdProjKeyDto(rawVal: unknown): JcdProjKeyDto {
    return tbUtil.decodeWithSchema<
      typeof JcdProjKeyDtoTSchema,
      JcdProjKeyDto
    >(JcdProjKeyDtoTSchema, rawVal);
  }
} as const;
