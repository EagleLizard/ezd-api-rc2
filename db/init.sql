
CREATE EXTENSION pgcrypto;

create table user_role (
  role_id SERIAL PRIMARY KEY,
  role_name TEXT NOT NULL UNIQUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- super user
insert into user_role (role_name) values('ServerAdmin');
-- the default role
insert into user_role (role_name) values('Default');
-- for api tests
insert into user_role (role_name) values('Test');

create table permission (
  permission_id SERIAL PRIMARY KEY,
  permission_name TEXT NOT NULL UNIQUE,
  -- permission_description TEXT NOT NULL UNIQUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

insert into permission (permission_name) values('user.mgmt');
insert into permission (permission_name) values('user.basic');
insert into permission (permission_name) values('users.read');
insert into permission (permission_name) values('test.read');

create table role_permission (
  role_id INT references user_role(role_id) ON DELETE CASCADE,
  permission_id INT references permission(permission_id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

insert into role_permission (role_id, permission_id) values(
  (select ur.role_id from user_role ur where ur.role_name = 'Default'),
  (select p.permission_id from permission p where p.permission_name = 'user.basic')
);
insert into role_permission (role_id, permission_id) values(
  (select ur.role_id from user_role ur where ur.role_name = 'Default'),
  (select p.permission_id from permission p where p.permission_name = 'users.read')
);
insert into role_permission (role_id, permission_id) values(
  (select ur.role_id from user_role ur where ur.role_name = 'ServerAdmin'),
  (select p.permission_id from permission p where p.permission_name = 'user.mgmt')
);
insert into role_permission (role_id, permission_id) values (
  (select ur.role_id from user_role ur where ur.role_name = 'Test'),
  (select p.permission_id from permission p where p.permission_name = 'test.read')
);

create table users (
  user_id TEXT NOT NULL UNIQUE PRIMARY KEY,
  user_name TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

create table session (
  sid TEXT PRIMARY KEY NOT NULL UNIQUE,
  sesh json NOT NULL,
  expire TIMESTAMP NOT NULL,
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/*
  Record user login info, even if the session entry is deleted.
_*/
create table user_login (
  user_login_id SERIAL PRIMARY KEY NOT NULL UNIQUE,
  logged_out BOOLEAN NOT NULL DEFAULT FALSE,
  logged_out_at TIMESTAMP,
  ip_addr TEXT NOT NULL,

  sid TEXT references session(sid) ON DELETE SET NULL,
  user_id TEXT references users(user_id) ON DELETE CASCADE NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

create table users_user_role (
  user_id TEXT references users(user_id) ON DELETE CASCADE,
  role_id INT references user_role(role_id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

create table password (
  password_id SERIAL PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,

  user_id TEXT references users(user_id) ON DELETE CASCADE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AuthN
