// =====================================================
// ⚡ FLOW SCANNER - Live Signal Feed Section
// =====================================================

import { memo } from 'react';
import { Zap, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { FlowItem } from '../shared/types';
import { Card, SectionHeader } from '../shared/Ui';

const SignalFeedItem = memo(({ item, index }: { item: FlowItem; index: number }) => {
  const directionColor =
    item.direction === 'bullish' ? '#22C55E' :
    item.direction === 'bearish' ? '#EF4444' : '#8B8B8B';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5"
    >
      <div className="flex items-center gap-2 text-[#6B6B6B]">
        <Clock className="h-4 w-4" />
        <span className="text-xs">{item.time}</span>
      </div>
      <div className="w-px h-8 bg-[#C9A646]/20" />
      <span className="font-bold text-[#C9A646] min-w-[60px]">{item.ticker}</span>
      <p className="text-sm text-[#A0A0A0] flex-1 line-clamp-1">{item.signal}</p>
      <div className="flex items-center gap-1">
        {item.direction === 'bullish' && <ArrowUpRight className="h-4 w-4" style={{ color: directionColor }} />}
        {item.direction === 'bearish' && <ArrowDownRight className="h-4 w-4" style={{ color: directionColor }} />}
        <span className="text-sm font-semibold" style={{ color: directionColor }}>
          {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
        </span>
      </div>
    </motion.div>
  );
});

export const SignalFeedSection = memo(({ flowData }: { flowData: FlowItem[] }) => (
  <Card>
    <div className="p-6 md:p-8">
      <SectionHeader
        icon={Zap}
        title="Live Signal Feed"
        subtitle="Real-time alerts from flow analysis"
        iconColor="#F59E0B"
      />
      <div className="space-y-3">
        {flowData.slice(0, 5).map((item, idx) => (
          <SignalFeedItem key={item.id} item={item} index={idx} />
        ))}
      </div>
    </div>
  </Card>
));
