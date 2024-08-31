CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE verification_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE, 
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    verification_code INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);



CREATE TABLE user_points (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_prize_date TIMESTAMP,
    streak_start_date TIMESTAMP
);


CREATE TABLE usage_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    bot_type VARCHAR(50) NOT NULL, 
    request TEXT NOT NULL,          
    response TEXT,                 
    tokens_used INTEGER NOT NULL,   
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE user_music (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    music_ids JSONB NOT NULL
);

CREATE TABLE modelTokens (
    id SERIAL PRIMARY KEY,
    model VARCHAR(255) UNIQUE NOT NULL,
    tokens INTEGER NOT NULL
);

INSERT INTO modelTokens (model, tokens) VALUES
('flux-realism', 73500),
('stable-diffusion-v3-medium', 73500),
('flux-pro', 105000),
('flux/schnell', 6300),
('flux/dev', 105000);

INSERT INTO modelTokens (model, tokens) VALUES
('prompthero/openjourney', 50000),
('runwayml/stable-diffusion-v1-5', 50000),
('SG161222/Realistic_Vision_V3.0_VAE', 50000),
('stabilityai/stable-diffusion-2-1', 50000),
('stabilityai/stable-diffusion-xl-base-1.0', 50000),
('wavymulder/Analog-Diffusion', 50000);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE modeltokens TO mashlabm_yahia;

CREATE TABLE image_storage (
    name VARCHAR(255) PRIMARY KEY,
    image_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL
);

INSERT INTO image_storage (name, image_name, location, category) VALUES
('day1image', 'day1.png', 'images/points/DailyLogins/day1.png', 'daily login'),
('day2image', 'day2.png', 'images/points/DailyLogins/day2.png', 'daily login'),
('day3image', 'day3.png', 'images/points/DailyLogins/day3.png', 'daily login'),
('day4image', 'day4.png', 'images/points/DailyLogins/day4.png', 'daily login'),
('day5image', 'day5.png', 'images/points/DailyLogins/day5.png', 'daily login'),
('day6image', 'day6.png', 'images/points/DailyLogins/day6.png', 'daily login');

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE image_storage TO mashlabm_yahia;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_music_id_seq TO mashlabm_yahia;
