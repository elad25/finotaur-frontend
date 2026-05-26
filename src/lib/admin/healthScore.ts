// src/lib/admin/healthScore.ts
// ============================================
// Pure frontend Health Score — no DB changes, no new RPCs.
// Computes a 0-100 score per user from the fields already present
// on `UserWithStats` (last_login_at, subscription_status, trade_count,
// login_count, is_banned).
//
// This is intentionally simple v1. Phase 1.7 can evolve it into a
// server-side computation + cohort comparison once we have appetite.
// ============================================

import type { UserWithStats } from '@/types/admin';

export type HealthBucket = 'healthy' | 'watch' | 'at-risk' | 'churning';

export interface HealthScore {
  score: number;          // clamped 0-100
  bucket: HealthBucket;
  positives: string[];    // contributing factors that helped
  negatives: string[];    // contributing factors that hurt
}

const DAY_MS = 86_400_000;

export function computeHealthScore(u: UserWithStats): HealthScore {
  let score = 50; // baseline — neutral
  const positives: string[] = [];
  const negatives: string[] = [];

  // 1. Recency of last login (–30..+30)
  if (u.last_login_at) {
    const days = (Date.now() - new Date(u.last_login_at).getTime()) / DAY_MS;
    if (days < 1) {
      score += 30;
      positives.push('Logged in today');
    } else if (days < 7) {
      score += 20;
      positives.push(`Logged in ${Math.max(1, Math.floor(days))}d ago`);
    } else if (days < 30) {
      score += 5;
      positives.push(`Logged in ${Math.floor(days)}d ago`);
    } else if (days < 60) {
      score -= 15;
      negatives.push(`Inactive ${Math.floor(days)}d`);
    } else {
      score -= 30;
      negatives.push(`Inactive ${Math.floor(days)}d (>60)`);
    }
  } else {
    score -= 30;
    negatives.push('Never logged in');
  }

  // 2. Subscription state (–30..+20)
  switch (u.subscription_status) {
    case 'active':
      score += 20;
      positives.push('Active subscription');
      break;
    case 'trial':
      score += 5;
      positives.push('In trial');
      break;
    case 'past_due':
      score -= 20;
      negatives.push('Payment past due');
      break;
    case 'cancelled':
      score -= 30;
      negatives.push('Subscription cancelled');
      break;
    case 'expired':
      score -= 25;
      negatives.push('Subscription expired');
      break;
  }

  if (u.subscription_cancel_at_period_end) {
    score -= 15;
    negatives.push('Will cancel at period end');
  }

  // 3. Engagement — trade count (–10..+15)
  if (u.total_trades >= 50) {
    score += 15;
    positives.push(`Heavy trader (${u.total_trades} trades)`);
  } else if (u.total_trades >= 10) {
    score += 8;
    positives.push(`Active trader (${u.total_trades} trades)`);
  } else if (u.total_trades > 0) {
    score += 2;
  } else {
    score -= 10;
    negatives.push('No trades logged');
  }

  // 4. Login regularity (0..+5)
  if (u.login_count >= 30) {
    score += 5;
    positives.push(`${u.login_count} logins total`);
  } else if (u.login_count >= 10) {
    score += 2;
  }

  // 5. Hard penalties
  if (u.is_banned) {
    score -= 50;
    negatives.push('Banned');
  }

  // Clamp
  score = Math.max(0, Math.min(100, Math.round(score)));

  let bucket: HealthBucket;
  if (score >= 75) bucket = 'healthy';
  else if (score >= 50) bucket = 'watch';
  else if (score >= 25) bucket = 'at-risk';
  else bucket = 'churning';

  return { score, bucket, positives, negatives };
}

// ============================================
// Bucket presentation helpers
// ============================================

export interface BucketMeta {
  label: string;
  color: string;          // tailwind text color
  bg: string;             // tailwind bg color
  border: string;         // tailwind border color
  description: string;
}

export const BUCKET_META: Record<HealthBucket, BucketMeta> = {
  healthy: {
    label: 'Healthy',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    description: 'Engaged + paying + recent activity',
  },
  watch: {
    label: 'Watch',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    description: 'Mixed signals — keep an eye',
  },
  'at-risk': {
    label: 'At Risk',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    description: 'Drop-off or payment issue — reach out',
  },
  churning: {
    label: 'Churning',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    description: 'Ban, cancellation, or long inactivity',
  },
};

export function aggregateHealth(users: UserWithStats[]) {
  const counts: Record<HealthBucket, number> = {
    healthy: 0,
    watch: 0,
    'at-risk': 0,
    churning: 0,
  };
  const scored = users.map((u) => {
    const h = computeHealthScore(u);
    counts[h.bucket]++;
    return { user: u, health: h };
  });

  const total = users.length;
  const distribution = (Object.keys(counts) as HealthBucket[]).map((b) => ({
    bucket: b,
    count: counts[b],
    percent: total > 0 ? (counts[b] / total) * 100 : 0,
  }));

  return { scored, counts, distribution, total };
}
