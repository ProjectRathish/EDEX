'use strict';

require('dotenv').config();

// Central export of all environment-derived configuration.
// Import this file instead of reading process.env directly throughout the app.

const config = {
  env      : process.env.NODE_ENV   || 'development',
  port     : parseInt(process.env.PORT) || 5000,
  apiVersion: process.env.API_VERSION || 'v1',

  db: {
    host           : process.env.DB_HOST            || '127.0.0.1',
    port           : parseInt(process.env.DB_PORT)  || 3306,
    user           : process.env.DB_USER            || 'root',
    password       : process.env.DB_PASSWORD        || '',
    name           : process.env.DB_NAME            || 'edex_db',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  },

  jwt: {
    secret            : process.env.JWT_SECRET             || 'dev_secret',
    expiresIn         : process.env.JWT_EXPIRES_IN          || '8h',
    refreshSecret     : process.env.JWT_REFRESH_SECRET      || 'dev_refresh_secret',
    refreshExpiresIn  : process.env.JWT_REFRESH_EXPIRES_IN  || '7d',
  },

  storage: {
    path: process.env.STORAGE_PATH || 'D:/EDEX/storage',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
};

module.exports = config;
