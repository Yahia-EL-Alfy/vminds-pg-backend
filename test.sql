CREATE TABLE refunds (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    tran_ref VARCHAR(255) NOT NULL,
    refund_amount DECIMAL(10, 2) NOT NULL,
    refund_reason TEXT,
    transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    refund_tran_ref VARCHAR(255)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE refunds TO mashlabm_yahia;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE refunds_id_seq TO mashlabm_yahia;

CREATE TABLE cancel_requests (
    id SERIAL PRIMARY KEY,
    agreement_id INT NOT NULL,
    user_id INT NOT NULL,
    cancelled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE cancel_requests TO mashlabm_yahia;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE cancel_requests_id_seq TO mashlabm_yahia;

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


GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users_cc_tokens TO mashlabm_yahia;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users_cc_tokens_id_seq TO mashlabm_yahia;

CREATE TABLE tokens_promo (
    id SERIAL PRIMARY KEY,
    used_by INT REFERENCES users(id) ON DELETE SET NULL,
    code VARCHAR(255) NOT NULL UNIQUE,
    tokens INT NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tokens_promo TO mashlabm_yahia;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tokens_promo_id_seq TO mashlabm_yahia;

CREATE TABLE reset_password (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reset_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE reset_password TO mashlabm_yahia;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE reset_password_id_seq TO mashlabm_yahia;

CREATE TABLE chat_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    chat_token VARCHAR(255),   
    bot_type VARCHAR(50) NOT NULL, 
    request TEXT NOT NULL,          
    response TEXT,
    log_id INTEGER REFERENCES usage_logs(id),             
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE chat_logs TO mashlabm_yahia;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE chat_logs_id_seq TO mashlabm_yahia;

CREATE TABLE bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message_id INTEGER REFERENCES chat_logs(id) ON DELETE CASCADE
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE bookmarks TO mashlabm_yahia;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE bookmarks_id_seq TO mashlabm_yahia;
