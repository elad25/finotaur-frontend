export type JournalSide = "LONG" | "SHORT";

export interface JournalUpload {
  id: string;
  url: string;
  type?: string; // 'chart' | 'entry' | 'exit' | 'mistake' | etc.
}

export interface JournalTrade {
  id?: string;
  userId: string;
  symbol: string;
  side: JournalSide;
  entryPrice: number;
  stopPrice: number;
  exitPrice?: number;
  quantity: number;
  fees?: number;
  session?: string;
  strategy?: string[];
  tags?: string[];
  notes?: string;
  uploads?: JournalUpload[];
  emotion?: number;  // 1..5
  mistake?: string;
  nextTime?: string;
  createdAt?: string;
  updatedAt?: string;
}
