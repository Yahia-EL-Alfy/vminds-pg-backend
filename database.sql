CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tokens_used INTEGER,
    available_tokens INTEGER,
    max_tokens INTEGER
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
    streak_start_date TIMESTAMP, 
    last_prize_date TIMESTAMP, 
    ai_tools_used INTEGER DEFAULT 0, 
    used_ai_tools TEXT[] DEFAULT '{}', 
    consecutive_days INTEGER DEFAULT 1, 
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    number_of_pdf_or_pptx INTEGER DEFAULT 0,
    number_of_images INTEGER DEFAULT 0
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



CREATE TABLE image_storage (
    name VARCHAR(255) PRIMARY KEY,
    image_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL
);






CREATE TABLE rewards (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    numbers INT NOT NULL,
    points INT NOT NULL,
    badge_name VARCHAR(50) NOT NULL
);


CREATE TABLE token_rewards (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  tokens_rookie BOOLEAN DEFAULT FALSE,
  tokens_novice BOOLEAN DEFAULT FALSE,
  tokens_specialist BOOLEAN DEFAULT FALSE,
  tokens_master BOOLEAN DEFAULT FALSE,
  tokens_pioneer BOOLEAN DEFAULT FALSE,
  reward_month DATE NOT NULL
);

CREATE TABLE streak_rewards (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    first_step_login BOOLEAN DEFAULT FALSE,
    getting_warmed_up BOOLEAN DEFAULT FALSE,
    daily_devotee BOOLEAN DEFAULT FALSE,
    routine_regular BOOLEAN DEFAULT FALSE,
    steady_supporter BOOLEAN DEFAULT FALSE,
    reliable_regular BOOLEAN DEFAULT FALSE,
    streak_specialist BOOLEAN DEFAULT FALSE
);

CREATE TABLE export_rewards (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    file_rookie BOOLEAN DEFAULT FALSE,
    content_custodian BOOLEAN DEFAULT FALSE,
    stellar_organizer BOOLEAN DEFAULT FALSE,
    cosmic_architect BOOLEAN DEFAULT FALSE
);
CREATE TABLE image_rewards (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    light_seizer BOOLEAN DEFAULT FALSE,
    starry_novice BOOLEAN DEFAULT FALSE,
    stellar_artist BOOLEAN DEFAULT FALSE,
    universe_virtuoso BOOLEAN DEFAULT FALSE
);

CREATE TABLE used_ai_rewards (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    asteroid_explorer BOOLEAN DEFAULT FALSE,
    planetary_explorer BOOLEAN DEFAULT FALSE,
    galactic_explorer BOOLEAN DEFAULT FALSE,
    quasar_explorer BOOLEAN DEFAULT FALSE,
    cosmic_explorer BOOLEAN DEFAULT FALSE
);

CREATE TABLE ai_parents (
    id SERIAL PRIMARY KEY,
    parent_name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    category_id integer NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    background_color VARCHAR(7),
    text_color VARCHAR(7)
);

CREATE TABLE ai_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    model_string VARCHAR(255) NOT NULL,
    category_id integer NOT NULL,
    context_length INT,  
    parent_id INT REFERENCES ai_parents(id),
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE report (
    id SERIAL PRIMARY KEY,
    log_id INT REFERENCES usage_logs(id),
    user_id INT REFERENCES users(id),
    model VARCHAR(255),
    comment TEXT
);

CREATE TABLE packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    tokens INTEGER NOT NULL
);
CREATE TABLE promocodes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount DECIMAL(5, 2),    -- Discount in percentage or fixed value
    extra_tokens INTEGER,      -- Additional tokens if promo applies
    expiry_date TIMESTAMP      -- Expiry date for the promo code
);
 CREATE TABLE user_packages (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    package_id INT REFERENCES packages(id) ON DELETE CASCADE,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + interval '1 month')
 );
 CREATE TABLE cart (
    id SERIAL PRIMARY KEY,
    price DECIMAL(10, 2) NOT NULL,
    tokens INTEGER NOT NULL,
    package_id INT REFERENCES packages(id) ON DELETE CASCADE,
    promo_code_id INT REFERENCES promocodes(id) ON DELETE SET NULL
);
CREATE TABLE transaction_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    tran_ref VARCHAR(255) NOT NULL,
    response_code VARCHAR(50),
    response_status VARCHAR(2) NOT NULL, 
    response_message TEXT,
    transaction_time TIMESTAMP NOT NULL,
    payment_info JSONB,
    cart_id INT REFERENCES cart(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL
);
CREATE TABLE tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
