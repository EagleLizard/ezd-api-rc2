
import 'source-map-support/register';

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
}

function setProcName() {
  process.title = 'ezd-api-rc2';
}
