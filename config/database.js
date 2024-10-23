const { Pool } = require('pg');
const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'database.log' }),
    new winston.transports.Console(),
  ],
});

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  max: 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log additional connection details
pool.on('connect', (client) => {
  logger.info('A new client has connected to the database.', {
    timestamp: new Date().toISOString(),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
  });
});

// Log when a client is acquired from the pool
pool.on('acquire', (client) => {
  logger.info('A client has been acquired from the pool.', {
    timestamp: new Date().toISOString(),
    clientId: client.processID,
  });
});

// Log when a client is removed from the pool
pool.on('remove', (client) => {
  logger.info('A client has been removed from the pool.', {
    timestamp: new Date().toISOString(),
    clientId: client.processID,
  });
});

// Log any errors with the client
pool.on('error', (error, client) => {
  logger.error('Error with the client.', {
    timestamp: new Date().toISOString(),
    clientId: client ? client.processID : 'N/A',
    error: error.message,
  });
});

// Override the query method to log executed queries
const originalQuery = pool.query.bind(pool);
pool.query = (text, params) => {
  logger.info('Executing query', {
    timestamp: new Date().toISOString(),
    query: text,
    parameters: params,
  });
  return originalQuery(text, params);
};

module.exports = pool;
