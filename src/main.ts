
import 'source-map-support/register';
import { Worker } from 'node:worker_threads';
import { initServer } from './server';
import { tbFormat } from './lib/lib/tb-format';

let worker: Worker;

(async () => {
  try {
    await init();
  } catch(e) {
    console.error(e);
    throw e;
  }
})();

async function init() {
  setProcName();
  tbFormat.init();
  await initJobs();
  await initServer();
  worker.on('error', (err) => {
    /*
    todo:xxx: handle worker errors gracefully, e.g. restart job runner worker
    _*/
    throw new Error('worker error', { cause: err });
  });
}

async function initJobs() {
  let deferred = Promise.withResolvers<void>();
  worker = new Worker('./dist/job/job-runner.js');

  worker.once('error', deferred.reject);
  const _handleAckMsg = (msg: unknown) => {
    if(msg === 'ack') {
      worker.off('message', _handleAckMsg);
      deferred.resolve();
    }
  };
  worker.on('message', _handleAckMsg);

  return deferred.promise;
}

function setProcName() {
  process.title = 'ezd-api-rc2';
}
