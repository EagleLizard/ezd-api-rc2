import { jobRepo, JobType } from '../db/job-repo';
import { PgClient } from '../db/pg-client';
import { JobDto } from '../models/job/job-dto';

export const jobService = {
  enqueue: enqueue,
} as const;

async function enqueue(jobType: JobType, data: string): Promise<JobDto> {
  let insRes = await jobRepo.insertJob(PgClient, jobType, data);
  return insRes;
}
