
import { Type, Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

const JcdMediaAndPressTSchema = Type.Object({
  publication: Type.String(),
  description: Type.Optional(Type.String()),
  link: Type.Object({
    label: Type.String(),
    uri: Type.String(),
  }),
});

const JcdProjectTSchema = Type.Object({
  projectKey: Type.String(),
  route: Type.String(),
  title: Type.String(),
  venue: Type.String(),
  producer: Type.String(),
  month: Type.Number(),
  year: Type.Number(),
  playwright: Type.Array(Type.String()),
  description: Type.Array(Type.String()),
  productionCredits: Type.Array(Type.String()),
  mediaAndPress: Type.Array(JcdMediaAndPressTSchema),
});
export type JcdProject = Static<typeof JcdProjectTSchema>;
export const JcdProject = {
  schema: JcdProjectTSchema,
  decode: decodeJcdProject,
} as const;

function decodeJcdProject(rawVal: unknown): JcdProject {
  return tbUtil.decodeWithSchema(JcdProjectTSchema, rawVal);
}
