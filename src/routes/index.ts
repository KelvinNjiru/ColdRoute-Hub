import { Router, Request, Response, NextFunction } from 'express';
import { ussdHandler } from '../controllers/ussdController';
import { hubTelemetry, transitTelemetry } from '../controllers/telemetryController';
import { createDispatch, listDispatches } from '../controllers/dispatchController';
import { listHubs, hubSummary, hubBatches, walkInCheckin, demoReset, demoBook } from '../controllers/hubController';
import { requireKey } from '../middleware/auth';


// Wrap async handlers so rejections reach Express' error handler.
const a = (fn: (q: Request, s: Response) => Promise<unknown>) => (q: Request, s: Response, n: NextFunction) => fn(q, s).catch(n);

const r = Router();
r.post('/ussd', a(ussdHandler)); // called by Africa's Talking; restrict by IP allow-list in production
r.use(requireKey);
import { outbox } from '../services/sms';
// ...
if (process.env.DEMO_MODE === 'true')
  r.get('/outbox', (req, res) => res.json(outbox.filter((m) => !req.query.to || m.to === req.query.to).slice(0, 10)));
r.post('/telemetry/hub', a(hubTelemetry));
r.post('/telemetry/transit', a(transitTelemetry));
r.get('/hubs', a(listHubs));
r.get('/hubs/:id/summary', a(hubSummary));
r.get('/hubs/:id/batches', a(hubBatches));
r.post('/hubs/:id/checkin', a(walkInCheckin));
r.post('/dispatch', a(createDispatch));
r.get('/dispatch', a(listDispatches));
r.post('/hubs/:id/demo-reset', a(demoReset));
r.post('/hubs/:id/demo-book', a(demoBook));
export default r;
