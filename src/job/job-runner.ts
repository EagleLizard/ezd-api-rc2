
import 'source-map-support/register';

import { parentPort } from 'node:worker_threads';
import timersp from 'node:timers/promises';
import { EventEmitter } from 'node:stream';
import { tbFormat } from '../lib/lib/tb-format';
import { jobService } from '../lib/service/job-service';
import { EzdError } from '../lib/models/error/ezd-error';
import { jcdImgProcJob } from './jcd/jcd-img-proc-job';
import { JobDto } from '../lib/models/job/job-dto';
import { logger } from '../lib/logger/logger';

type JobRunRes = void;
type JobHandlerFn = {
  (job: JobDto): Promise<JobRunRes>;
} & {};
const job_handler_map: Map<string, JobHandlerFn> = new Map();

const poll_interval_ms = 1e3;

(async () => {
  try {
    await jobRunnerMain();
  } catch(e) {
    console.error(e);
    throw e;
  }
})();

async function jobRunnerMain() {
  console.log('~ jobs-worker');
  init();
  parentPort?.postMessage('ack');
  await startPoll();
}

function init() {
  EventEmitter.setMaxListeners(12);
  setProcName();
  tbFormat.init();
  initJobHandlers();
}

function initJobHandlers() {
  job_handler_map.set('jcd_img_proc', jcdImgProcJob.run);
}

async function startPoll() {
  for(;;) {
    let startMs = Date.now();
    await doPoll();
    let pollDeltaMs = poll_interval_ms - (Date.now() - startMs);
    if(pollDeltaMs > 0) {
      await timersp.setTimeout(pollDeltaMs);
    }
  }
}
async function doPoll() {
  let job = await jobService.getNextJob();
  if(job === undefined) {
    return;
  }
  let runJobFn = job_handler_map.get(job.job_type);
  if(runJobFn === undefined) {
    throw new EzdError(`Invalid job type: ${job.job_type}, job_id: ${job.job_id}`, 'EZD_6.0');
  }
  let jobRunRes: JobRunRes;
  try {
    /*
    TODO:xxx: formalize job logging
    _*/
    logger.info({
      job: {
        job_id: job.job_id,
        job_type: job.job_type,
        run_at: job.run_at,
      }
    }, 'starting job');
    await jobService.updateJobStatus(job.job_id, 'in_progress');
    jobRunRes = await runJobFn(job);
  } catch(e) {
    /*
      Uncaught errors should fail the job in database
    _*/
    console.error(e);
    await jobService.updateJobStatus(job.job_id, 'failed');
    throw e;
  }
  logger.info({
    job: {
      job_id: job.job_id,
      job_type: job.job_type,
      run_at: job.run_at,
    }
  }, 'finished job');
  console.log('jobRunRes: ', jobRunRes);
  await jobService.updateJobStatus(job.job_id, 'completed');
}

function setProcName() {
  process.title = 'ezd-api-rc2_jobs';
}
