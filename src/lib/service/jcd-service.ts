
import { gcpDb } from '../client/gcp-db';
import { GcpKind } from '../models/gcp/gcp-kind';
import { GcpNamespace } from '../models/gcp/gcp-namespace';
import { JcdEntityExportDto } from '../models/jcd/jcd-export';

export const jcdService = {
  getNamespace: getNamespaces,
  getExport: getExport,
} as const;

async function getNamespaces(): Promise<GcpNamespace[]> {
  let nsQueryRes = await gcpDb.createQuery('__namespace__')
    .select('__key__')
    .run();
  let jcdNss: GcpNamespace[] = nsQueryRes[0].map(rawNs => {
    let decodedNs = GcpNamespace.decode(Object.assign({}, {
      id: '',
      name: '',
    }, rawNs[gcpDb.KEY]));
    if(decodedNs.id === '1') {
      decodedNs.name = '_default';
    }
    return decodedNs;
  });
  return jcdNss;
}

/*
Provided export/import behavior in google cloud datastore writes
  export to a Cloud Storage bucket in an opaque binary format that is hard to parse.
  This will create an export using the Datastore client by:
    1. getting all kinds
    2. for each kind, get all entities
    3. return all kind entities as json
_*/
async function getExport(): Promise<JcdEntityExportDto[]> {
  /*
  https://stackoverflow.com/a/42284293/4677252
  _*/
  let kindsQueryRes = await gcpDb.createQuery('__kind__').run();
  let kinds = kindsQueryRes[0].map((v) => GcpKind.decode({ ...v[gcpDb.KEY] }));
  let entityExports: JcdEntityExportDto[] = [];
  for(let i = 0; i < kinds.length; i++) {
    let kind = kinds[i];
    if(!kind.name.startsWith('__')) {
      /*
        Kinds with names beginning with '__' are system kinds, such as '__Stat_Ns_Total__'
      _*/
      let queryRes = await gcpDb.createQuery(kind.name).run();
      entityExports.push({
        kind_name: kind.name,
        entities: queryRes[0],
      });
    } else {
      console.log({kind});
    }
  }
  return entityExports;
}
