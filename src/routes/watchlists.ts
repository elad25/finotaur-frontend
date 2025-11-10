import { Router } from 'express';
import { prisma } from '../lib/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const membership = await prisma.userOrg.findFirst({ where: { userId } });
  if (!membership) return res.status(404).json({ error: 'No org membership' });

  const lists = await prisma.watchlist.findMany({
    where: { orgId: membership.orgId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(lists);
});

router.post('/', requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { name } = req.body;
  const membership = await prisma.userOrg.findFirst({ where: { userId } });
  if (!membership) return res.status(404).json({ error: 'No org membership' });

  const wl = await prisma.watchlist.create({
    data: { orgId: membership.orgId, name },
  });
  res.status(201).json(wl);
});

router.post('/:watchlistId/items', requireAuth, async (req: any, res) => {
  const { watchlistId } = req.params;
  const { symbol, note } = req.body;
  const item = await prisma.watchlistItem.create({
    data: { watchlistId, symbol, note },
  });
  res.status(201).json(item);
});

router.delete('/:watchlistId/items/:itemId', requireAuth, async (req: any, res) => {
  const { itemId } = req.params;
  await prisma.watchlistItem.delete({ where: { id: itemId } });
  res.status(204).send();
});

export default router;
