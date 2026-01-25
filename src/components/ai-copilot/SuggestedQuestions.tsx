// src/components/ai-copilot/SuggestedQuestions.tsx
// Suggested questions for empty state

import React from 'react';
import { 
  TrendingUp, 
  LineChart, 
  Shield, 
  Bitcoin,
  Building2,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

const SUGGESTED_QUESTIONS = [
  {
    icon: TrendingUp,
    question: "What are the latest trade ideas from the ISM report?",
    category: "Trade Ideas",
  },
  {
    icon: BarChart3,
    question: "Which sectors should I favor based on the weekly review?",
    category: "Sectors",
  },
  {
    icon: Bitcoin,
    question: "What's the current crypto market regime?",
    category: "Crypto",
  },
  {
    icon: Shield,
    question: "What are the main risks identified in recent reports?",
    category: "Risk",
  },
  {
    icon: Building2,
    question: "Summarize the latest company analysis",
    category: "Companies",
  },
  {
    icon: LineChart,
    question: "What's the macro outlook for the next month?",
    category: "Macro",
  },
];

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
      {SUGGESTED_QUESTIONS.map((item, index) => {
        const Icon = item.icon;
        return (
          <Button
            key={index}
            variant="outline"
            className="h-auto p-4 justify-start text-left hover:bg-primary/5 hover:border-primary/20 transition-all"
            onClick={() => onSelect(item.question)}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">
                  {item.category}
                </p>
                <p className="text-sm font-medium line-clamp-2">
                  {item.question}
                </p>
              </div>
            </div>
          </Button>
        );
      })}
    </div>
  );
}
