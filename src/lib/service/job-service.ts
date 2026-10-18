import { jobRepo, JobType } from '../db/job-repo';
import { PgClient } from '../db/pg-client';
import { JobDto } from '../models/job/job-dto';

export const jobService = {
  enqueue: enqueue,
  getNextJob: getNextJob,
  updateJobStatus: updateJobStatus,
} as const;

async function enqueue(jobType: JobType, data: string): Promise<JobDto> {
  let insRes = await jobRepo.insertJob(PgClient, jobType, data);
  return insRes;
}

async function updateJobStatus(job_id: JobDto['job_id'], status: JobDto['status']) {
  let updateRes = await jobRepo.setJobStatus(PgClient, job_id, status);
  return updateRes;
}

async function getNextJob(): Promise<JobDto | undefined> {
  return jobRepo.getNextJob(PgClient);
}
