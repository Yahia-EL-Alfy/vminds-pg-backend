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
    streak_days INTEGER DEFAULT 1, 
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
    code_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL
);






CREATE TABLE rewards (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    numbers INT NOT NULL,
    points INT NOT NULL,
    badge_name VARCHAR(50) NOT NULL,
    code_name VARCHAR(50) NOT NULL 
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
CREATE TABLE categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    image_url text
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
    tokens INTEGER NOT NULL,
    type INT
);

CREATE TABLE promocodes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount DECIMAL(5, 2),   
    extra_tokens INTEGER,      
    expiry_date TIMESTAMP      
);
 CREATE TABLE user_packages (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    package_id INT REFERENCES packages(id) ON DELETE CASCADE,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + interval '1 month')
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
    cart_id INT REFERENCES packages(id) ON DELETE CASCADE,  -- Updated foreign key reference
    amount DECIMAL(10, 2) NOT NULL
);

CREATE TABLE tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,              -- Auto-incremented ID
    user_id INT NOT NULL,               -- Reference to user
    trans_ref VARCHAR(255) NOT NULL,    -- Transaction reference
    cart_id INT NOT NULL,               -- Reference to cart
    price DECIMAL(10, 2) NOT NULL,      -- Price of the transaction
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp for invoice creation
    payment_method VARCHAR(50) NOT NULL -- Payment method (e.g., Credit Card, STC Pay)
);

CREATE TABLE user_agreements (
    id SERIAL PRIMARY KEY,            -- Auto-incremented ID
    user_id INT NOT NULL,             -- Reference to user
    agreement_id VARCHAR(255) NOT NULL -- Agreement ID (for recurring payments or other agreements)
);

CREATE TABLE refunds (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    tran_ref VARCHAR(255) NOT NULL,
    refund_amount DECIMAL(10, 2) NOT NULL,
    refund_reason TEXT,
    transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    refund_tran_ref VARCHAR(255)
);

CREATE TABLE cancel_requests (
    id SERIAL PRIMARY KEY,
    agreement_id INT NOT NULL,
    user_id INT NOT NULL,
    cancelled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users_cc_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    last4 VARCHAR(4) NOT NULL,
    payment_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


ALTER TABLE users_cc_tokens
ADD CONSTRAINT unique_token UNIQUE (token);

CREATE TABLE tokens_promo (
    id SERIAL PRIMARY KEY,
    used_by INT REFERENCES users(id) ON DELETE SET NULL,
    code VARCHAR(255) NOT NULL UNIQUE,
    tokens INT NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

CREATE TABLE popular_tools (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES ai_models(id),
    rank INT NOT NULL,   -- Rank 1 to 8
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reset_password (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reset_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE chat_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    chat_token VARCHAR(255),   
    bot_type VARCHAR(50) NOT NULL, 
    request TEXT NOT NULL,          
    response TEXT,                 
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

ALTER TABLE chat_logs
ADD COLUMN log_id INTEGER REFERENCES usage_logs(id);

CREATE TABLE bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message_id INTEGER REFERENCES chat_logs(id) ON DELETE CASCADE
);
