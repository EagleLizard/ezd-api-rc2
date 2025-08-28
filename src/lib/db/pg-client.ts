
import { Pool, PoolClient, QueryConfig, QueryConfigValues, QueryResult } from 'pg';
import { ezdConfig } from '../config';

const pgPool = new Pool({
  host: ezdConfig.POSTGRES_HOST,
  port: ezdConfig.POSTGRES_PORT,
  user: ezdConfig.POSTGRES_USER,
  password: ezdConfig.POSTGRES_PASSWORD,
  database: ezdConfig.POSTGRES_DB,
});

export class PgClient {
  private _client: PoolClient;
  private constructor(_client: PoolClient) {
    this._client = _client;
  }
  /* should match static PgClient.query() signature _*/
  query(
    query: string | QueryConfig,
    vals?: QueryConfigValues<unknown[]>
  ): Promise<QueryResult> {
    return this._client.query(query, vals);
  }
  release(err?: Error | boolean) {
    return this._client.release(err);
  }

  /*
    default static uses pool.query()
      this should NOT be used for transactions.
      See: https://node-postgres.com/features/transactions
  _*/
  static query(
    query: string | QueryConfig,
    vals?: QueryConfigValues<unknown[]>
  ): Promise<QueryResult> {
    return pgPool.query(query, vals);
  }

  static async initClient(): Promise<PgClient> {
    let pgClient: PgClient;
    let client = await pgPool.connect();
    pgClient = new PgClient(client);
    return pgClient;
  }
}
