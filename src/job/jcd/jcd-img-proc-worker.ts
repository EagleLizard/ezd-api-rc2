
import 'source-map-support/register';

import { EventEmitter } from 'node:stream';
import { tbFormat } from '../../lib/lib/tb-format';
import { parentPort } from 'node:worker_threads';
import { prim } from '../../util/validate-primitives';
import { JobDto } from '../../lib/models/job/job-dto';
import { JcdImgProcJobData } from '../../lib/models/job/jcd-img-proc-job-data';
import { jcdImgProcJob } from './jcd-img-proc-job';
import { jobMsg } from '../../lib/models/job/job-msg';

(async () => {
  init();
  await imgProcMain();
})();

async function imgProcMain() {
  let [ job, ] = await waitForJobData();
  await jcdImgProcJob.run(job);
  parentPort?.postMessage(jobMsg.done);
}

async function waitForJobData(): Promise<[ JobDto, JcdImgProcJobData ]> {
  let deferred = Promise.withResolvers<[ JobDto, JcdImgProcJobData ]>();
  const msgHandler = (val: unknown) => {
    if(prim.isObject(val) && prim.isObject(val.job)) {
      let job = JobDto.parse(val.job);
      let jobData = JcdImgProcJobData.parse(job.data);
      deferred.resolve([ job, jobData ]);
      parentPort?.off('message' ,msgHandler);
    }
  };
  parentPort?.on('message', msgHandler);
  let jobTuple: [ JobDto, JcdImgProcJobData ] = await deferred.promise;
  return jobTuple;
}

function init() {
  EventEmitter.setMaxListeners(12);
  tbFormat.init();
}
