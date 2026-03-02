
import { gcpDb } from '../client/gcp-db';
import { GcpKind } from '../models/gcp/gcp-kind';

export const jcdService = {
  getExport: getExport,
} as const;

/*
Provided export/import behavior in google cloud datastore writes
  export to a Cloud Storage bucket in an opaque binary format that is hard to parse.
  This will create an export using the Datastore client by:
    1. getting all kinds
    2. for each kind, get all entities
    3. return all kind entities as json
_*/
async function getExport() {
  /*
  https://stackoverflow.com/a/42284293/4677252
  _*/
  let kindsQueryRes = await gcpDb.createQuery('__kind__').run();
  let kinds = kindsQueryRes[0].map((v) => GcpKind.decode({ ...v[gcpDb.KEY] }));
  let entityMap: Record<string, unknown[]> = {};
  for(let i = 0; i < kinds.length; i++) {
    let kind = kinds[i];
    if(!kind.name.startsWith('__')) {
      let queryRes = await gcpDb.createQuery(kind.name).run();
      entityMap[kind.name] = queryRes[0];
    }
  }
  return entityMap;
}
