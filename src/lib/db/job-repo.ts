
import { JobDto } from '../models/job/job-dto';
import { IPgClient } from './pg-client';

export type JobType = 'jcd_img_proc';

export const jobRepo = {
  getNextJob: getNextJob,
  insertJob: insertJob,
  setJobStatus: setJobStatus,
} as const;

async function getNextJob(pgClient: IPgClient): Promise<JobDto | undefined> {
  let queryStr = `
    select * from job j
      where j.status = 'pending'
    order by j.run_at asc
    limit 1
  `;
  let queryRes = await pgClient.query(queryStr);
  if(queryRes.rows.length < 1) {
    return undefined;
  }
  return JobDto.parse(queryRes.rows[0]);
}

async function insertJob(pgClient: IPgClient, jobType: JobType, data: string): Promise<JobDto> {
  let queryStr = `
    insert into job (job_type, data) values ($1, $2)
    returning *
  `;
  let queryRes = await pgClient.query(queryStr, [ jobType, data ]);
  let jobDto = JobDto.parse(queryRes.rows[0]);
  return jobDto;
}

async function setJobStatus(
  pgClient: IPgClient,
  job_id: JobDto['job_id'],
  status: JobDto['status']
) {
  let queryStr = `
    update job
      set status = $1,
      modified_at = CURRENT_TIMESTAMP
    where job_id = $2
  `;
  await pgClient.query(queryStr, [ status, job_id ]);
}
