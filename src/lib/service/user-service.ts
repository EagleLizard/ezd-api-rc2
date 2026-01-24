
import { FastifySessionObject } from '@fastify/session';

import { inputFormats } from '../../util/input-formats';
import { userRepo } from '../db/user-repo';
import { ValidationError } from '../models/error/validation-error';
import { PasswordDto } from '../models/password-dto';
import { RegisterUserBody } from '../models/register-user-body';
import { UserDto } from '../models/user-dto';
import { NotFoundEzdError } from '../models/error/not-found-ezd-error';
import { authUtil } from '../lib/auth-util';
import { EzdError } from '../models/error/ezd-error';
import { ezdErrorCodes } from '../models/error/ezd-error-codes';
import { authRepo } from '../db/auth-repo';
import { PgClient } from '../db/pg-client';
import { sessionRepo } from '../db/session-repo';
import { UserLoginDto } from '../models/user-login-dto';
import { ezdConfig } from '../config';
import { authzRepo } from '../db/authz-repo';

export const userService = {
  getLoggedInUser: getLoggedInUserBySid,
  logoutUser: logoutUser,
  logInUser: logInUser,
  registerUser: registerUser,
  createUser: createUser,
  deleteUser: deleteUser,
  getUserById: getUserById,
  getUserByName: getUserByName,
  checkUserPassword: checkUserPassword,
} as const;

async function deleteUser(userId: string) {
  return userRepo.deleteUser(PgClient, userId);
}

function getLoggedInUserBySid(sid: string): Promise<string | undefined> {
  return authRepo.getUserIdFromLoginBySid(PgClient, sid);
}

async function logoutUser(sid: string, user: UserDto) {
  return authRepo.logoutSession(PgClient, sid, user.user_id);
}

async function logInUser(
  user: UserDto,
  session: FastifySessionObject,
  ipAddr: string,
): Promise<UserLoginDto> {
  /*
    check if login entry exists for current session.
      If exists:
        > update modified_at, expiry
      If not exist:
        > create new entry
  _*/
  let dbSesh = await sessionRepo.getSession(PgClient, session.sessionId);
  if(dbSesh === undefined) {
    /*
      If this is the first request, the session may not exist in the database
        Save the session in this case before attempting user login insert.
    _*/
    await session.save();
  }
  /*
    check if a login exists for the current user and session
  _*/
  let userLogin: UserLoginDto | undefined = await authRepo.getUserLogin(
    PgClient,
    user.user_id,
    session.sessionId,
  );
  if(userLogin !== undefined) {
    return userLogin;
  }
  userLogin = await authRepo.insertUserLogin(
    PgClient,
    user.user_id,
    session.sessionId,
    ipAddr
  );
  return userLogin;
}

async function getUserById(userId: UserDto['user_id']) {
  return userRepo.getUserById(PgClient, userId);
}

async function getUserByName(userName: string) {
  return userRepo.getUserByName(userName);
}

async function checkUserPassword(userName: string, password: string): Promise<UserDto | EzdError> {
  let user: UserDto | undefined;
  let passwordDto: PasswordDto | undefined;
  let pwMatch: boolean;

  user = await userService.getUserByName(userName);
  if(user === undefined) {
    return new NotFoundEzdError(`User not found: '${userName}'`);
  }
  passwordDto = await userRepo.getPasswordByUserId(user.user_id);
  if(passwordDto === undefined) {
    return new NotFoundEzdError(`No password for user: '${userName}'`);
  }
  pwMatch = await authUtil.checkPasswordsEqual(
    passwordDto.password_hash,
    passwordDto.salt,
    password
  );
  if(!pwMatch) {
    return new EzdError(
      `Invalid password for user: '${user.user_name}'`,
      ezdErrorCodes.INVALID_PASSWORD
    );
  }
  return user;
}

async function createUser(name: string, email: string, password?: string): Promise<UserDto> {
  if(!inputFormats.checkUserName(name)) {
    throw new ValidationError(`Invalid username: '${name}'`);
  }
  if(!inputFormats.checkEmailAddr(email)) {
    throw new ValidationError(`Invalid email: ${email}`);
  }
  if(password !== undefined && !inputFormats.checkPassword(password)) {
    throw new ValidationError('Invalid password');
  }
  let roleNames: string[] = [ ezdConfig.EZD_DEFAULT_ROLE_NAME ];
  /*
    Some initial users have elevated roles out of necessity for when the
      server initializes for the first time
  _*/
  if(
    name === ezdConfig.EZD_SUPER_USER_USERNAME
    || name === ezdConfig.EZD_API_USER_USERNAME
  ) {
    roleNames.push(ezdConfig.EZD_SUPER_USER_ROLE_NAME);
  }
  let userDto: UserDto;
  let txnClient = await PgClient.initClient();
  try {
    userDto = await userRepo.insertUser(txnClient, name, email);
    if(password !== undefined) {
      await userRepo.insertPassword(txnClient, userDto.user_id, password);
    }
    for(let i = 0; i < roleNames.length; i++) {
      let roleName = roleNames[i];
      let roleDto = await authzRepo.getRoleByName(txnClient, roleName);
      await authzRepo.insertUsersUserRole(txnClient, userDto.user_id, roleDto.role_id);
    }
    await txnClient.query('COMMIT');
  } catch(e) {
    await txnClient.query('ROLLBACK');
    throw e;
  } finally {
    txnClient.release();
  }
  return userDto;
}

/*
returns undefined if successful, otherwise some error
_*/
async function registerUser(
  registerUserBody: RegisterUserBody
): Promise<ValidationError | UserDto> {
  let validUserName: boolean;
  let validEmail: boolean;
  let validPassword: boolean;
  // let errors: string[] = [];
  /* static/format validation _*/
  validUserName = inputFormats.checkUserName(registerUserBody.userName);
  if(!validUserName) {
    return new ValidationError(`Invalid username: '${registerUserBody.userName}'`);
  }
  validEmail = inputFormats.checkEmailAddr(registerUserBody.email);
  if(!validEmail) {
    return new ValidationError(`Invalid email: ${registerUserBody.email}`);
  }
  validPassword = inputFormats.checkPassword(registerUserBody.password);
  if(!validPassword) {
    return new ValidationError('Invalid password');
  }
  let roleNames: string[] = [
    ezdConfig.EZD_DEFAULT_ROLE_NAME,
  ];
  /*
    Some initial users have elevated roles out of necessity for when the
      server initializes for the first time
  _*/
  if(
    registerUserBody.userName === ezdConfig.EZD_SUPER_USER_USERNAME
    || registerUserBody.userName === ezdConfig.EZD_API_USER_USERNAME
  ) {
    roleNames.push(ezdConfig.EZD_SUPER_USER_ROLE_NAME);
  }
  let createUserRes: UserDto = await userRepo.createUser(
    registerUserBody.userName,
    registerUserBody.email,
    registerUserBody.password,
    roleNames,
  );
  /*
  TODO: collect reasons why not valid for returning to the client
  _*/
  return createUserRes;
}
