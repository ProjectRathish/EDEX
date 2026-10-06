'use strict';

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');

const config                        = require('./config/config');
const { testConnection }            = require('./config/db');
const apiRouter                     = require('./routes/index');
const { errorHandler, notFound }    = require('./middleware/errorHandler');

const app = express();

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = typeof config.cors.origin === 'string'
  ? config.cors.origin.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods    : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request Logger ───────────────────────────────────────────────────────────
if (config.env !== 'test') {
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
}

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name   : 'EDEX API',
    version: config.apiVersion,
    status : 'running',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use(`/api/${config.apiVersion}`, apiRouter);
app.use('/api', apiRouter);

// ─── 404 & Error Handlers ─────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const start = async () => {
  await testConnection();   // Exits process if DB unreachable
  app.listen(config.port, () => {
    console.log(`🚀  EDEX API started`);
    console.log(`    ENV  : ${config.env}`);
    console.log(`    PORT : ${config.port}`);
    console.log(`    URL  : http://localhost:${config.port}/api/${config.apiVersion}`);
  });
};

start();

module.exports = app;   // For future testing
