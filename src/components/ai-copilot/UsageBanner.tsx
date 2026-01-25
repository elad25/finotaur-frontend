// src/components/ai-copilot/UsageBanner.tsx
// Usage limit banner for free/basic users

import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, AlertTriangle, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { UsageInfo } from '@/hooks/useAICopilot';
import { cn } from '@/lib/utils';

interface UsageBannerProps {
  usage: UsageInfo;
}

export function UsageBanner({ usage }: UsageBannerProps) {
  const { 
    questions_today, 
    daily_limit, 
    remaining, 
    limit_reached, 
    user_tier 
  } = usage;
  
  const percentUsed = Math.min((questions_today / daily_limit) * 100, 100);
  const isWarning = percentUsed >= 80;
  
  if (user_tier === 'PREMIUM') {
    return null; // No banner for premium users
  }

  return (
    <div
      className={cn(
        "px-4 py-2 border-b flex items-center justify-between gap-4",
        limit_reached 
          ? "bg-destructive/10 border-destructive/20" 
          : isWarning 
            ? "bg-yellow-500/10 border-yellow-500/20"
            : "bg-muted/50"
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        {limit_reached ? (
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
        ) : (
          <Zap className="h-4 w-4 text-primary flex-shrink-0" />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">
              {limit_reached 
                ? "Daily limit reached" 
                : `${remaining} questions remaining today`
              }
            </span>
            <span className="text-xs text-muted-foreground">
              {questions_today}/{daily_limit}
            </span>
          </div>
          
          <Progress 
            value={percentUsed} 
            className={cn(
              "h-1.5",
              limit_reached && "[&>div]:bg-destructive",
              isWarning && !limit_reached && "[&>div]:bg-yellow-500"
            )}
          />
        </div>
      </div>
      
      <Button
        asChild
        size="sm"
        variant={limit_reached ? "default" : "outline"}
        className={cn(
          "flex-shrink-0",
          limit_reached && "bg-primary hover:bg-primary/90"
        )}
      >
        <Link to="/pricing">
          <Crown className="h-4 w-4 mr-2" />
          {limit_reached ? "Upgrade Now" : "Get Unlimited"}
        </Link>
      </Button>
    </div>
  );
}
