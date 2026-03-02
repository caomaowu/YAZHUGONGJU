import cors from 'cors';
import { CORS_ORIGIN } from '../config/index.js';

const allowedOrigins = CORS_ORIGIN.split(',').map((item) => item.trim()).filter(Boolean);

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (!allowedOrigins.length || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  }
});
