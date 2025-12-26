
export const ezdErrorCodes = {
  DEFAULT: 'EZD_0.0',
  INVALID_PASSWORD: 'EZD_0.1',
  INVALID_JWT: 'EZD_0.2',
  INVALID_LOG_IN_INPUT: 'EZD_1.0',
  NOT_FOUND: 'EZD_2.0',
  DB_ERROR: 'EZD_3.0',
  db_invalid_session_insert: 'EZD_3.1',
  db_invalid_return_type: 'EZD_3.2',

  SERVER_MISSING_CTX: 'EZD_4.0',
  SERVER_MISSING_CTX_STATIC: 'EZD_4.1',
} as const;
