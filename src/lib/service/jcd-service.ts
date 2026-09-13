
import assert from 'node:assert';
import { gcpDb } from '../client/gcp-db';
import { GcpKey } from '../models/gcp/gcp-kind';
import { GcpNamespace } from '../models/gcp/gcp-namespace';
import { JcdEntityExportDto } from '../models/jcd/jcd-export';
import { entity } from '@google-cloud/datastore/build/src/entity';
import { EzdError } from '../models/error/ezd-error';

const default_env_id = '1';

export const jcdService = {
  default_env_id: default_env_id,

  getNamespaces: getNamespaces,
  getEntityKinds: getEntityKinds,
  getEntitiesByKind: getEntitiesByKind,
  getKindEntityByName: getKindEntityByName,
  copyEnvKindEntity: copyEnvKindEntity,

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
      decodedNs.name = '[default]';
    }
    return decodedNs;
  });
  return jcdNss;
}

async function getEntityKinds(ns?: string): Promise<GcpKey[]> {
  let kindsQuery = (ns === undefined)
    ? gcpDb.createQuery('__kind__')
    : gcpDb.createQuery(ns, '__kind__')
  ;
  kindsQuery = kindsQuery.select('__key__');
  let kindsQueryRes = await kindsQuery.run();
  let kinds = kindsQueryRes[0]
    .map((v) => GcpKey.decode({ ...v[gcpDb.KEY] }))
    .filter(gcpKind => {
      return !('name' in gcpKind) || !gcpKind.name.startsWith('__'); // filters out system metadata keys like __Stats
    });
  return kinds;
}

/*
name is either a GCP key name or id.
_*/
async function getKindEntityByName(entityKey: string, name: string, ns?: string): Promise<unknown> {

  /*
  need to check if incoming name val could be an integer.
    If so, we need to convert it to the GCP internal value.
  _*/
  let intOrName: entity.Int | string = /^\d+$/g.test(name.trim())
    ? gcpDb.int(name)
    : name
  ;
  let key = gcpDb.key({
    namespace: ns,
    path: [ entityKey, intOrName ],
  });
  let res = await gcpDb.get(key);
  return res[0];
}

async function getEntitiesByKind(entityKey: string, ns?: string): Promise<GcpKey[]> {
  let query = (ns === undefined)
    ? gcpDb.createQuery(entityKey)
    : gcpDb.createQuery(ns, entityKey)
  ;
  query = query.select('__key__');
  let queryRes = await query.run();
  let rawEntityKeys = queryRes[0];
  let entityKeys = rawEntityKeys.map(rawVal => GcpKey.decode({ ...rawVal[gcpDb.KEY] }));
  return entityKeys;
}

/*
  Copy an entity from one env to another
_*/
async function copyEnvKindEntity(opts: {
  entityKind: string;
  name: string;
  fromEnv?: string;
  toEnv: string;
}) {
  if(opts.toEnv === default_env_id) {
    throw new EzdError('dont do that!');
  }
  if(
    opts.fromEnv === opts.toEnv
    || (
      opts.fromEnv === undefined
      && opts.toEnv === default_env_id
    )
  ) {
    /* copying to same env not supported _*/
    throw new EzdError('dont do that!');
  }
  let toKey = gcpDb.key({
    namespace: opts.toEnv,
    path: [ opts.entityKind, opts.name ],
  });
  let srcEntity = await jcdService.getKindEntityByName(opts.entityKind, opts.name, opts.fromEnv);
  let queryRes = await gcpDb.insert({
    key: toKey,
    data: srcEntity,
  });
  console.log(queryRes[0]);
  console.log(srcEntity);
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
  let kinds = kindsQueryRes[0].map((v) => GcpKey.decode({ ...v[gcpDb.KEY] }));
  let entityExports: JcdEntityExportDto[] = [];
  for(let i = 0; i < kinds.length; i++) {
    let kind = kinds[i];
    assert('name' in kind);
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
