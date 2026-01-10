
export const ezdErrorCodes = {
  DEFAULT: 'EZD_0.0',
  INVALID_PASSWORD: 'EZD_0.1',
  INVALID_JWT: 'EZD_0.2',
  system_secret_expired: 'EZD_0.3',
  system_secret_not_found: 'EZD_0.4',
  // INVALID_LOG_IN_INPUT: 'EZD_1.0',
  schema_decode: 'EZD_1.1',

  NOT_FOUND: 'EZD_2.0',
  user_missing_from_ctx_in_authn_route: 'EZD_2.1',

  DB_ERROR: 'EZD_3.0',
  db_invalid_session_insert: 'EZD_3.1',
  db_invalid_return_type: 'EZD_3.2',

  SERVER_MISSING_CTX: 'EZD_4.0',
  SERVER_MISSING_CTX_STATIC: 'EZD_4.1',
} as const;

export type EzdErrorCode = typeof ezdErrorCodes[keyof typeof ezdErrorCodes];
