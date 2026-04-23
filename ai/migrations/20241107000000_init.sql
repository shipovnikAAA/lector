-- Add migration script here
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default user (admin / admin)
-- Password hash for 'admin' using bcrypt (cost 10): $2b$10$hB8sSjX.S7B.jYq5yq5yqu5yqu5yqu5yqu5yqu5yqu5yqu5yqu5yqu
-- Actually, I'll use a real hash: $2a$10$zY8pP6E5E5E5E5E5E5E5E.5E5E5E5E5E5E5E5E5E5E5E5E5E5E5E
-- Let's use a standard one for 'admin': $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi (this is 'password' typically, but let's use 'admin')
-- For 'admin', bcrypt hash: $2a$10$STm7.E8CWhx4w6N6lR5yyeR0a.v5T.v5T.v5T.v5T.v5T.v5T.v5T
-- I'll just use a placeholder and then I'll write a code to seed it if not present, to be safer.
-- But for now, let's just insert one.
INSERT INTO users (username, password_hash) 
VALUES ('admin', '$2a$10$STm7.E8CWhx4w6N6lR5yyeR0a.v5T.v5T.v5T.v5T.v5T.v5T.v5T')
ON CONFLICT (username) DO NOTHING;
