import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { cfg } from './config';
import routes from './routes';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Africa's Talking posts form-encoded
app.get('/health', (_, res) => res.json({ ok: true }));
app.use('/api/v1', routes);
const dist = path.join(process.cwd(), 'frontend/dist');
app.use(express.static(dist));
app.get('*', (_q, res) => res.sendFile(path.join(dist, 'index.html')));
app.use((err: Error, _q: Request, res: Response, _n: NextFunction) => { console.error(err); res.status(500).json({ error: 'Internal error' }); });
app.listen(cfg.port, () => console.log(`ColdRoute API on :${cfg.port}`));
