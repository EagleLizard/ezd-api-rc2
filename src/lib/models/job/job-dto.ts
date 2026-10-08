
import Type, { Static } from 'typebox';
import { tbUtil } from '../../../util/tb-util';

const JobDtoTSchema = Type.Object({
  job_id: Type.Number(),
  job_type: Type.String(),
  data: Type.String(),
  status: Type.Union([
    Type.Literal('pending'),
  ]),
  run_at: Type.String({ format: 'pg-date-time' }),
  created_at: Type.String({ format: 'pg-date-time' }),
  modified_at: Type.String({ format: 'pg-date-time' }),
});

export type JobDto = Static<typeof JobDtoTSchema>;
export const JobDto = {
  schema: JobDtoTSchema,
  parse: tbUtil.parseFn<typeof JobDtoTSchema, JobDto>(JobDtoTSchema),
} as const;
