CREATE TYPE user_role AS ENUM ('Administrator', 'Moderator', 'User');

CREATE TABLE
    users (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(250) NOT NULL UNIQUE,
        hashed_password TEXT NOT NULL,
        role user_role NOT NULL DEFAULT 'User',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
    )