
import { tbUtil } from '../../../util/tb-util';
import { Type, Static } from 'typebox';

const JcdEntityExportDtoTSchema = Type.Object({
  kind_name: Type.String(),
  entities: Type.Array(Type.Unknown()),
});
export type JcdEntityExportDto = Static<typeof JcdEntityExportDtoTSchema>;
export const JcdEntityExportDto = {
  schema: JcdEntityExportDtoTSchema,
  decode: function decodeJcdExportDto(rawVal: unknown): JcdEntityExportDto {
    return tbUtil.decodeWithSchema(JcdEntityExportDtoTSchema, rawVal);
  },
} as const;
