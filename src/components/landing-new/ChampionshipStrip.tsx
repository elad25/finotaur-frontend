// src/components/landing-new/ChampionshipStrip.tsx
// ================================================
// 🔥 CHAMPIONSHIP STRIP — thin full-width band promoting The Floor
// Sits directly after TraderSection. Intentionally NOT a SectionShell —
// a restrained hairline-bordered strip, not a full section.
// ================================================

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ds/Button';

const ChampionshipStrip = () => {
  return (
    <section className="relative border-t border-b border-gold-border bg-surface-1">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto px-6 lg:px-8 py-ds-6 flex flex-col md:flex-row items-center md:items-center justify-between gap-6"
      >
        <div className="text-center md:text-left">
          <p className="font-sans font-medium text-[11px] tracking-[0.3em] uppercase text-gold-eyebrow mb-2">
            The Floor — Live
          </p>
          <p className="font-sans text-ink-primary text-base md:text-lg leading-snug">
            The FINOTAUR Championship is live: traders ranked by profit factor, every month.
          </p>
          <p className="font-sans font-light text-ink-secondary text-sm mt-1">
            Top spot takes $500 and a year of FINOTAUR.
          </p>
        </div>

        <Link to="/register" className="shrink-0">
          <Button variant="goldOutline" size="default">
            Join the Championship
          </Button>
        </Link>
      </motion.div>
    </section>
  );
};

export default ChampionshipStrip;
