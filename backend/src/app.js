import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { ENV } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { generalLimiter } from './middlewares/rateLimiter.middleware.js';
import { uploadDir } from './middlewares/upload.middleware.js';
import { ApiError } from './utils/apiError.js';

const app = express();

// Trust reverse proxies (Render / Cloudflare) to ensure correct req.protocol (HTTPS)
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS Configuration - Permissive for all client platforms, PWAs & Vercel/Render deployments
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression & Body parsers
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// HTTP Request logging
if (ENV.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// General Rate Limiting
app.use('/api', generalLimiter);

// Serve static uploads folder with permissive CORS headers
app.use('/uploads', express.static(uploadDir));
if (uploadDir !== path.resolve('uploads') && fs.existsSync(path.resolve('uploads'))) {
  app.use('/uploads', express.static(path.resolve('uploads')));
}

// Mount API routes
app.use('/api', routes);

// Serve production frontend assets if available
const publicDir = path.resolve('public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
      return next();
    }
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
}

// 404 handler for unmatched API routes
app.use((req, res, next) => {
  next(new ApiError(404, `Cannot find ${req.method} ${req.originalUrl}`));
});

// Global Error Handler
app.use(errorHandler);

export default app;
