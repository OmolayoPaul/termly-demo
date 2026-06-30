import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import nombaRouter from './routes/nomba.js';
import webhooksRouter from './routes/webhooks.js';

const IS_PROD = process.env.NODE_ENV === 'production';
const NITRO_PORT = parseInt(process.env.NITRO_PORT || '3002', 10);

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(IS_PROD ? morgan('combined') : morgan('dev'));
app.use(cors());
app.use(express.json());

app.use('/api/nomba', nombaRouter);
app.use('/api/webhooks', webhooksRouter);
app.get('/health', (req, res) => res.json({ status: 'ok', env: process.env.NOMBA_ENV || 'test' }));

if (IS_PROD) {
  app.use((req, res) => {
    const options = {
      hostname: '127.0.0.1',
      port: NITRO_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `127.0.0.1:${NITRO_PORT}` },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    req.pipe(proxyReq, { end: true });

    proxyReq.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(503, { 'Content-Type': 'text/html' });
        res.end('<html><body><p>Starting up&hellip; please refresh in a moment.</p></body></html>');
      }
    });
  });
}

const PORT = IS_PROD ? (process.env.PORT || 5000) : (process.env.API_PORT || 3001);
const HOST = IS_PROD ? '0.0.0.0' : 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`[Termly] ${IS_PROD ? 'Production' : 'Dev API'} server running on port ${PORT}`);
  console.log(`[Termly] Environment: ${process.env.NOMBA_ENV || 'test'}`);
  if (IS_PROD) {
    console.log(`[Termly] Proxying SSR to Nitro on port ${NITRO_PORT}`);
  }
});
