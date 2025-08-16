
import { Pool, QueryConfig, QueryConfigValues, QueryResult } from 'pg';
import { ezdConfig } from '../config';

const pgPool = new Pool({
  host: ezdConfig.POSTGRES_HOST,
  port: ezdConfig.POSTGRES_PORT,
  user: ezdConfig.POSTGRES_USER,
  password: ezdConfig.POSTGRES_PASSWORD,
  database: ezdConfig.POSTGRES_DB,
});

export class PgClient {
  static async query(
    query: string | QueryConfig,
    vals?: QueryConfigValues<unknown[]>
  ): Promise<QueryResult> {
    return await pgPool.query(query, vals);
  }
}
