// src/components/ai-copilot/TypingIndicator.tsx
// =====================================================
// ⏳ TYPING INDICATOR - Premium Gold Design v2.0
// =====================================================

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Bot, Sparkles } from 'lucide-react';

export const TypingIndicator = memo(function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
        <Bot className="h-5 w-5 text-[#8B8B8B]" />
      </div>
      
      {/* Bubble */}
      <div className="rounded-2xl rounded-tl-md px-5 py-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
        {/* Top accent */}
        <div className="absolute top-0 left-0 w-full h-[2px]"
          style={{ background: 'linear-gradient(90deg, rgba(201,166,70,0.5), transparent)' }} />
        
        <div className="flex items-center gap-3">
          {/* Sparkle icon */}
          <Sparkles className="h-4 w-4 text-[#C9A646] animate-pulse" />
          
          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ background: '#C9A646' }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
          
          {/* Text */}
          <span className="text-sm text-[#6B6B6B] ml-1">Thinking...</span>
        </div>
      </div>
    </motion.div>
  );
});

export default TypingIndicator;