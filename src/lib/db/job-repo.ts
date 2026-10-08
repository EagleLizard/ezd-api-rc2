
import { JobDto } from '../models/job/job-dto';
import { IPgClient } from './pg-client';

export type JobType = 'jcd_img_proc';

export const jobRepo = {
  insertJob: insertJob,
} as const;

async function insertJob(pgClient: IPgClient, jobType: JobType, data: string): Promise<JobDto> {
  let queryStr = `
    insert into job (job_type, data) values ($1, $2)
    returning *
  `;
  let queryRes = await pgClient.query(queryStr, [ jobType, data ]);
  let jobDto = JobDto.parse(queryRes.rows[0]);
  return jobDto;
}
