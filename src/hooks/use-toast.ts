// src/hooks/use-toast.ts — simple store for toasts
import { useEffect, useState } from "react";

type ToastItem = {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const listeners: ((toasts: ToastItem[]) => void)[] = [];
let current: ToastItem[] = [];

export function toast(t: Omit<ToastItem, "id">) {
  const id = Math.random().toString(36).slice(2);
  current = [...current, { id, ...t }];
  listeners.forEach(l => l(current));
  setTimeout(() => dismiss(id), 4000);
  return { id };
}

export function dismiss(id?: string) {
  current = id ? current.filter(t => t.id !== id) : [];
  listeners.forEach(l => l(current));
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>(current);
  useEffect(() => {
    const l = (t: ToastItem[]) => setToasts(t);
    listeners.push(l);
    return () => {
      const i = listeners.indexOf(l);
      if (i >= 0) listeners.splice(i, 1);
    };
  }, []);
  return { toasts, toast, dismiss };
}
