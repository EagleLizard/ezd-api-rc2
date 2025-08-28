
import { inputFormats } from '../../util/input-formats';
import { userRepo } from '../db/user-repo';
import { ValidationError } from '../models/error/validation-error';
import { PasswordDto } from '../models/password-dto';
import { RegisterUserBody } from '../models/register-user-body';
import { UserDto } from '../models/user-dto';
import { NotFoundEzdError } from '../models/error/not-found-ezd-error';
import { authUtil } from '../module/auth-util';
import { EzdError } from '../models/error/ezd-error';
import { ezdErrorCodes } from '../models/error/ezd-error-codes';

export const userService = {
  registerUser: registerUser,
  getUserByName: getUserByName,
  checkUserPassword: checkUserPassword,
} as const;

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

/*
returns undefined if successful, otherwise some error
_*/
async function registerUser(
  registerUserBody: RegisterUserBody
): Promise<ValidationError | undefined> {
  let validUserName: boolean;
  let validEmail: boolean;
  let validPassword: boolean;
  let errors: string[] = [];
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
  let createUserRes = await userRepo.createUser(
    registerUserBody.userName,
    registerUserBody.email,
    registerUserBody.password,
  );
  /*
  TODO: collect reasons why not valid for returning to the client
  _*/

}
