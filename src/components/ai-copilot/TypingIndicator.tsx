import React, { memo } from 'react';
import { motion } from 'framer-motion';

export const TypingIndicator = memo(function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 pl-1 py-2"
      aria-label="AI Assistant is thinking"
    >
      <motion.span
        className="h-3 w-3 rounded-full bg-[#C9A646] shadow-[0_0_18px_rgba(201,166,70,0.48)]"
        animate={{
          y: [0, -8, 0],
          scale: [0.96, 1.14, 0.96],
          opacity: [0.55, 1, 0.55],
        }}
        transition={{
          duration: 0.9,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
});

export default TypingIndicator;
