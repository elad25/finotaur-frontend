import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface TradeNotification {
  id: string;
  type: "buy" | "sell" | "tp" | "sl";
  price: number;
  quantity?: number;
  symbol?: string;
  timestamp: number;
}

interface TradeExecutionNotificationProps {
  notification: TradeNotification | null;
  onComplete?: () => void;
}

export function TradeExecutionNotification({ 
  notification, 
  onComplete 
}: TradeExecutionNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          onComplete?.();
        }, 300); // Wait for fade out animation
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [notification, onComplete]);

  if (!notification) return null;

  const getNotificationConfig = () => {
    switch (notification.type) {
      case "buy":
        return {
          icon: "🔵",
          label: "BUY",
          color: "emerald",
          bgClass: "bg-emerald-500/20 border-emerald-500/50",
          textClass: "text-emerald-300",
          pulseClass: "bg-emerald-400",
        };
      case "sell":
        return {
          icon: "🔴",
          label: "SELL",
          color: "rose",
          bgClass: "bg-rose-500/20 border-rose-500/50",
          textClass: "text-rose-300",
          pulseClass: "bg-rose-400",
        };
      case "tp":
        return {
          icon: "✅",
          label: "TAKE PROFIT",
          color: "emerald",
          bgClass: "bg-emerald-500/30 border-emerald-400/60",
          textClass: "text-emerald-200",
          pulseClass: "bg-emerald-300",
        };
      case "sl":
        return {
          icon: "⛔",
          label: "STOP LOSS",
          color: "rose",
          bgClass: "bg-rose-500/30 border-rose-400/60",
          textClass: "text-rose-200",
          pulseClass: "bg-rose-300",
        };
    }
  };

  const config = getNotificationConfig();

  return (
    <div 
      className={cn(
        "fixed top-1/4 left-1/2 -translate-x-1/2 z-[99999] transition-all duration-300",
        visible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 -translate-y-4 pointer-events-none"
      )}
    >
      <div className={cn(
        "border backdrop-blur-xl rounded-xl px-6 py-4 shadow-2xl",
        config.bgClass
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "h-3 w-3 rounded-full animate-pulse",
            config.pulseClass
          )} />
          <span className={cn("font-medium text-lg", config.textClass)}>
            {config.icon} {config.label}
            {notification.quantity && ` ${notification.quantity}`}
            {notification.symbol && ` ${notification.symbol}`}
            {' '}@ ${notification.price.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// Trade execution data interface
export interface TradeExecutionData {
  price: number;
  quantity?: number;
  symbol?: string;
}

// Hook for managing trade notifications
export function useTradeNotifications() {
  const [notification, setNotification] = useState<TradeNotification | null>(null);

  const showBuyNotification = (data: TradeExecutionData) => {
    setNotification({
      id: Date.now().toString(),
      type: "buy",
      price: data.price,
      quantity: data.quantity,
      symbol: data.symbol,
      timestamp: Date.now(),
    });
  };

  const showSellNotification = (data: TradeExecutionData) => {
    setNotification({
      id: Date.now().toString(),
      type: "sell",
      price: data.price,
      quantity: data.quantity,
      symbol: data.symbol,
      timestamp: Date.now(),
    });
  };

  const showTPNotification = (price: number) => {
    setNotification({
      id: Date.now().toString(),
      type: "tp",
      price,
      timestamp: Date.now(),
    });
  };

  const showSLNotification = (price: number) => {
    setNotification({
      id: Date.now().toString(),
      type: "sl",
      price,
      timestamp: Date.now(),
    });
  };

  const clearNotification = () => {
    setNotification(null);
  };

  return {
    notification,
    showBuyNotification,
    showSellNotification,
    showTPNotification,
    showSLNotification,
    clearNotification,
  };
}