import { Router } from 'express';
import { listEvents } from '../adapters/macro/calendar.provider';

const router = Router();

router.get('/', async (req, res) => {
  const { from, to, country } = req.query as any;
  const data = await listEvents({
    from: from ?? '',
    to: to ?? '',
    country: country,
  });
  res.json(data);
});

export default router;
