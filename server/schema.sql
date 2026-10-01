CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'player'
        CHECK (role IN ('admin', 'player')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    points INTEGER NOT NULL,
    flag VARCHAR(255) NOT NULL,
    attachment_path TEXT
);

ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS attachment_path TEXT;

CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
    submitted_flag VARCHAR(255) NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, challenge_id)
);

-- Demo event
INSERT INTO events (name, start_time, end_time)
SELECT
    'Demo CTF Event',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '30 days'
WHERE NOT EXISTS (
    SELECT 1 FROM events WHERE name = 'Demo CTF Event'
);

-- Demo users
-- Passwords will be configured through the application authentication layer.
INSERT INTO users (username, password_hash, role)
SELECT 'admin', 'PLACEHOLDER_ADMIN_HASH', 'admin'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'admin'
);

INSERT INTO users (username, password_hash, role)
SELECT 'player', 'PLACEHOLDER_PLAYER_HASH', 'player'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'player'
);

-- Demo challenges
INSERT INTO challenges
(event_id, title, description, category, points, flag)
SELECT
    e.id,
    'Welcome Challenge',
    'Find the flag hidden in this challenge.',
    'Web',
    100,
    'CTF{welcome_to_ctf_builder}'
FROM events e
WHERE e.name = 'Demo CTF Event'
AND NOT EXISTS (
    SELECT 1 FROM challenges WHERE title = 'Welcome Challenge'
);

INSERT INTO challenges
(event_id, title, description, category, points, flag)
SELECT
    e.id,
    'Caesar''s Secret',
    'Decode the secret message.',
    'Crypto',
    150,
    'CTF{caesar_was_here}'
FROM events e
WHERE e.name = 'Demo CTF Event'
AND NOT EXISTS (
    SELECT 1 FROM challenges WHERE title = 'Caesar''s Secret'
);

INSERT INTO challenges
(event_id, title, description, category, points, flag)
SELECT
    e.id,
    'Lost Evidence',
    'Investigate the evidence and find the flag.',
    'Forensics',
    200,
    'CTF{forensics_master}'
FROM events e
WHERE e.name = 'Demo CTF Event'
AND NOT EXISTS (
    SELECT 1 FROM challenges WHERE title = 'Lost Evidence'
);

INSERT INTO challenges
(event_id, title, description, category, points, flag)
SELECT
    e.id,
    'Hidden Path',
    'Discover the hidden path.',
    'Web',
    250,
    'CTF{hidden_path_found}'
FROM events e
WHERE e.name = 'Demo CTF Event'
AND NOT EXISTS (
    SELECT 1 FROM challenges WHERE title = 'Hidden Path'
);

INSERT INTO challenges
(event_id, title, description, category, points, flag)
SELECT
    e.id,
    'Final Challenge',
    'Solve the final challenge.',
    'Crypto',
    300,
    'CTF{final_challenge_complete}'
FROM events e
WHERE e.name = 'Demo CTF Event'
AND NOT EXISTS (
    SELECT 1 FROM challenges WHERE title = 'Final Challenge'
);