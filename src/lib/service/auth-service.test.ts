
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { authService } from './auth-service';
import { jwt } from '../lib/jwt/jwt';
import assert from 'node:assert/strict';

const { mockEzdConfig } = vi.hoisted(() => {
  return {
    mockEzdConfig: {
      EZD_JWT_SECRET: '',
      isDevEnv: vi.fn().mockReturnValue(true),
    },
  };
});
vi.mock('../config', () => {
  return {
    ezdConfig: mockEzdConfig
  };
});

describe('auth-service', () => {
  let userIdMock: string;
  let issMock: string;
  let audMock: string;
  let expMock: number;
  let jwtSecretMock: string;
  beforeEach(() => {
    userIdMock = 'mock_user_id';
    issMock = 'ezd-test';
    audMock = 'ezd-test';
    expMock = Math.ceil((new Date(Date.now() + (1000 * 60 * 60 * 24 * 7))).valueOf() / 1000);

    jwtSecretMock = 'mock_secret';
    mockEzdConfig.EZD_JWT_SECRET = jwtSecretMock;
  });
  test('getJwt() has expected payload', () => {
    let token = authService.getJwt(userIdMock, {
      iss: issMock,
      aud: audMock,
      exp: expMock,
    });
    let decoded = jwt.decode(token);
    expect(decoded.payload.userId).toBe(userIdMock);
    expect(decoded.payload.iss).toBe(issMock);
    expect(decoded.payload.aud).toBe(audMock);
    expect(decoded.payload.exp).toBe(expMock);
  });
  test('checkJwt() has expected payload', () => {
    let token = jwt.sign({
      iss: issMock,
      aud: audMock,
      exp: expMock,
      userId: userIdMock,
    }, mockEzdConfig.EZD_JWT_SECRET);
    let decoded = authService.checkJwt(token);
    assert(decoded !== undefined);
    expect(decoded.payload.userId).toBe(userIdMock);
    expect(decoded.payload.iss).toBe(issMock);
    expect(decoded.payload.aud).toBe(audMock);
    expect(decoded.payload.exp).toBe(expMock);
  });
});
