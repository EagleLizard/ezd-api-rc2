
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
  projectKey: Type.String({ minLength: 3 }),
  route: Type.String({ minLength: 3 }),
  title: Type.String({ minLength: 3 }),
  venue: Type.String({ minLength: 3 }),
  producer: Type.String({ minLength: 3 }),
  month: Type.Number({ minimum: 1, maximum: 12 }),
  year: Type.Number({ minimum: -472 }),
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
  return tbUtil.decodeWithSchema<typeof JcdProjectTSchema, JcdProject>(JcdProjectTSchema, rawVal);
}
