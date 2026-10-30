
import 'source-map-support/register';

import { parentPort, Worker } from 'node:worker_threads';
import timersp from 'node:timers/promises';
import { EventEmitter } from 'node:stream';
import { tbFormat } from '../lib/lib/tb-format';
import { jobService } from '../lib/service/job-service';
import { EzdError } from '../lib/models/error/ezd-error';
import { JobDto } from '../lib/models/job/job-dto';
import { logger } from '../lib/logger/logger';
import { perf } from '../lib/lib/perf';
import { jobMsg } from '../lib/models/job/job-msg';

type JobRunRes = void;
const job_worker_filename_map: Map<string, string> = new Map([
  [ 'jcd_img_proc', './dist/job/jcd/jcd-img-proc-worker.js' ]
]);

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
    let clock = perf.getClock().start();
    await runJob(job);
    console.log(`job: ${job.job_type}:${job.job_id} took: ${clock.stop().toFixed(3)}ms`);
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

async function runJob(job: JobDto) {
  let deferred = Promise.withResolvers<void>();
  let filename = job_worker_filename_map.get(job.job_type);
  if(filename === undefined) {
    throw new EzdError(`Invalid job type: ${job.job_type}, job_id: ${job.job_id}`, 'EZD_6.0');
  }
  let worker = new Worker(filename);
  worker.once('error', deferred.reject);
  worker.postMessage({ job });
  worker.on('message', msgHandler);

  await deferred.promise;

  await worker.terminate();

  function msgHandler(val: unknown) {
    if(val === jobMsg.done) {
      deferred.resolve();
      worker.off('message', msgHandler);
    }
  }
}

function setProcName() {
  process.title = 'ezd-api-rc2_jobs';
}
