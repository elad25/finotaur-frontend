import { Router } from 'express';
import { prisma } from '../lib/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/my', requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const membership = await prisma.userOrg.findFirst({
    where: { userId },
    include: { org: true },
  });
  if (!membership) return res.status(404).json({ error: 'No org found' });
  res.json({ org: membership.org });
});

export default router;
