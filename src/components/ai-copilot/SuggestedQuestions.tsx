// src/components/ai-copilot/SuggestedQuestions.tsx
// =====================================================
// ❓ SUGGESTED QUESTIONS - Premium Gold Design v2.0
// =====================================================

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, LineChart, Shield, Bitcoin, Building2, BarChart3,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

const SUGGESTED_QUESTIONS = [
  {
    icon: TrendingUp,
    question: "What are the latest trade ideas from the ISM report?",
    category: "Trade Ideas",
    color: '#22C55E',
  },
  {
    icon: BarChart3,
    question: "Which sectors should I favor based on the weekly review?",
    category: "Sectors",
    color: '#3B82F6',
  },
  {
    icon: Bitcoin,
    question: "What's the current crypto market regime?",
    category: "Crypto",
    color: '#A855F7',
  },
  {
    icon: Shield,
    question: "What are the main risks identified in recent reports?",
    category: "Risk",
    color: '#EF4444',
  },
  {
    icon: Building2,
    question: "Summarize the latest company analysis",
    category: "Companies",
    color: '#F59E0B',
  },
  {
    icon: LineChart,
    question: "What's the macro outlook for the next month?",
    category: "Macro",
    color: '#C9A646',
  },
];

export const SuggestedQuestions = memo(function SuggestedQuestions({ 
  onSelect 
}: SuggestedQuestionsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
      {SUGGESTED_QUESTIONS.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelect(item.question)}
            className="group text-left p-4 rounded-xl transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
              border: '1px solid rgba(201,166,70,0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = `${item.color}50`;
              e.currentTarget.style.background = `linear-gradient(135deg, ${item.color}08, transparent)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(201,166,70,0.15)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))';
            }}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: `${item.color}15`,
                  border: `1px solid ${item.color}30`,
                }}>
                <Icon className="h-5 w-5" style={{ color: item.color }} />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                  style={{ color: item.color }}>
                  {item.category}
                </p>
                <p className="text-sm text-[#A0A0A0] group-hover:text-white transition-colors line-clamp-2 leading-relaxed">
                  {item.question}
                </p>
              </div>
              
              {/* Arrow */}
              <ChevronRight className="h-4 w-4 text-[#6B6B6B] group-hover:text-[#C9A646] group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
            </div>
          </motion.button>
        );
      })}
    </div>
  );
});

export default SuggestedQuestions;