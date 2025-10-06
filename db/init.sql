
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

create table users (
  user_id SERIAL PRIMARY KEY,
  user_name TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

create table session (
  sid TEXT PRIMARY KEY NOT NULL UNIQUE,
  sesh json NOT NULL,
  expire TIMESTAMP NOT NULL,

  user_id INT references users(user_id) ON DELETE SET NULL,

  ip_addr TEXT NOT NULL,
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

create table users_user_role (
  users_user_role_id SERIAL PRIMARY KEY,

  user_id INT references users(user_id) ON DELETE CASCADE,
  role_id INT references user_role(role_id) ON DELETE CASCADE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

create table password (
  password_id SERIAL PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,

  user_id INT references users(user_id) ON DELETE CASCADE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AuthN
