import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import nombaRouter from './routes/nomba.js';
import webhooksRouter from './routes/webhooks.js';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

app.use('/api/nomba', nombaRouter);
app.use('/api/webhooks', webhooksRouter);

app.get('/health', (req, res) => res.json({ status: 'ok', env: process.env.NOMBA_ENV || 'test' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, 'localhost', () => {
  console.log(`[Termly] API server running on port ${PORT}`);
  console.log(`[Termly] Environment: ${process.env.NOMBA_ENV || 'test'}`);
});
