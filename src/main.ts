
import 'source-map-support/register';
import { initServer } from './server';
import {  FormatRegistry  } from '@sinclair/typebox';
import { tbFormat } from './lib/lib/tb-format';

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
  initTypebox();
  await initServer();
}

function setProcName() {
  process.title = 'ezd-api-rc2';
}

function initTypebox() {
  FormatRegistry.Set('pg-date-time', tbFormat.isPgDateTime);
}
