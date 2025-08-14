
import 'source-map-support/register';
import { initServer } from './server';

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
  await initServer();
}

function setProcName() {
  process.title = 'ezd-api-rc2';
}
