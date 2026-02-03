import { Datastore, Query } from '@google-cloud/datastore';

const _datastore = new Datastore;

export const gcpDb = new class GcpDb {
  createQuery(kind?: string): Query
  createQuery(kind?: string[] | undefined): Query
  createQuery(namespace: string, kind?: string): Query
  createQuery(namespace: string, kind?: string[]): Query
  createQuery(kindOrNamespace?: string | string[], kindOrNot?: string | string[]): Query {
    let ns: string | undefined;
    if(kindOrNot !== undefined) {
      /* first param is namespace _*/
      ns = kindOrNamespace as string;
      return (typeof kindOrNot === 'string')
        ? _datastore.createQuery(ns, kindOrNot)
        : _datastore.createQuery(ns, kindOrNot)
      ;
    }
    return (typeof kindOrNamespace === 'string')
      ? _datastore.createQuery(kindOrNamespace)
      : _datastore.createQuery(kindOrNamespace)
    ;
  }
};
