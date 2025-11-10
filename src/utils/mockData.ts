import dayjs from "dayjs";
import type { Trade } from "@/utils/statistics";

/**
 * Mock data for testing the Statistics page
 * Use this if you don't have real trades yet
 */
export const mockTrades: Trade[] = [
  // Winning trades
  {
    id: "1",
    symbol: "EURUSD",
    side: "LONG",
    entry_price: 1.0850,
    exit_price: 1.0920,
    stop_price: 1.0820,
    quantity: 10000,
    fees: 5,
    open_at: dayjs().subtract(10, "day").toISOString(),
    close_at: dayjs().subtract(10, "day").add(2, "hour").toISOString(),
    outcome: "WIN",
    strategy: "ICT MSS",
    trade_type: "Breakout",
    session: "London",
    metrics: {
      riskUSD: 300,
      rewardUSD: 700,
      rr: 2.33,
      riskPts: 0.0030,
      rewardPts: 0.0070,
    },
  },
  {
    id: "2",
    symbol: "GBPUSD",
    side: "SHORT",
    entry_price: 1.2650,
    exit_price: 1.2580,
    stop_price: 1.2690,
    quantity: 10000,
    fees: 5,
    open_at: dayjs().subtract(9, "day").toISOString(),
    close_at: dayjs().subtract(9, "day").add(3, "hour").toISOString(),
    outcome: "WIN",
    strategy: "FVG Entry",
    trade_type: "Pullback",
    session: "NY",
    metrics: {
      riskUSD: 400,
      rewardUSD: 700,
      rr: 1.75,
      riskPts: 0.0040,
      rewardPts: 0.0070,
    },
  },
  {
    id: "3",
    symbol: "EURUSD",
    side: "LONG",
    entry_price: 1.0870,
    exit_price: 1.0960,
    stop_price: 1.0840,
    quantity: 10000,
    fees: 5,
    open_at: dayjs().subtract(8, "day").toISOString(),
    close_at: dayjs().subtract(8, "day").add(4, "hour").toISOString(),
    outcome: "WIN",
    strategy: "ICT MSS",
    trade_type: "Breakout",
    session: "Asia",
    metrics: {
      riskUSD: 300,
      rewardUSD: 900,
      rr: 3.0,
      riskPts: 0.0030,
      rewardPts: 0.0090,
    },
  },

  // Losing trades
  {
    id: "4",
    symbol: "USDJPY",
    side: "LONG",
    entry_price: 148.50,
    exit_price: 148.20,
    stop_price: 148.20,
    quantity: 10000,
    fees: 5,
    open_at: dayjs().subtract(7, "day").toISOString(),
    close_at: dayjs().subtract(7, "day").add(1, "hour").toISOString(),
    outcome: "LOSS",
    strategy: "Order Block",
    trade_type: "Support",
    session: "London",
    metrics: {
      riskUSD: 300,
      rewardUSD: -300,
      rr: -1.0,
      riskPts: 0.30,
      rewardPts: -0.30,
    },
  },
  {
    id: "5",
    symbol: "GBPUSD",
    side: "SHORT",
    entry_price: 1.2700,
    exit_price: 1.2750,
    stop_price: 1.2750,
    quantity: 10000,
    fees: 5,
    open_at: dayjs().subtract(6, "day").toISOString(),
    close_at: dayjs().subtract(6, "day").add(2, "hour").toISOString(),
    outcome: "LOSS",
    strategy: "FVG Entry",
    trade_type: "Pullback",
    session: "NY",
    metrics: {
      riskUSD: 500,
      rewardUSD: -500,
      rr: -1.0,
      riskPts: 0.0050,
      rewardPts: -0.0050,
    },
  },

  // More wins
  {
    id: "6",
    symbol: "EURUSD",
    side: "SHORT",
    entry_price: 1.0900,
    exit_price: 1.0850,
    stop_price: 1.0930,
    quantity: 10000,
    fees: 5,
    open_at: dayjs().subtract(5, "day").toISOString(),
    close_at: dayjs().subtract(5, "day").add(3, "hour").toISOString(),
    outcome: "WIN",
    strategy: "ICT MSS",
    trade_type: "Breakout",
    session: "London",
    metrics: {
      riskUSD: 300,
      rewardUSD: 500,
      rr: 1.67,
      riskPts: 0.0030,
      rewardPts: 0.0050,
    },
  },
  {
    id: "7",
    symbol: "AUDUSD",
    side: "LONG",
    entry_price: 0.6550,
    exit_price: 0.6590,
    stop_price: 0.6530,
    quantity: 10000,
    fees: 5,
    open_at: dayjs().subtract(4, "day").toISOString(),
    close_at: dayjs().subtract(4, "day").add(5, "hour").toISOString(),
    outcome: "WIN",
    strategy: "Order Block",
    trade_type: "Support",
    session: "Asia",
    metrics: {
      riskUSD: 200,
      rewardUSD: 400,
      rr: 2.0,
      riskPts: 0.0020,
      rewardPts: 0.0040,
    },
  },

  // Breakeven trade
  {
    id: "8",
    symbol: "USDJPY",
    side: "SHORT",
    entry_price: 149.00,
    exit_price: 149.00,
    stop_price: 149.30,
    quantity: 10000,
    fees: 5,
    open_at: dayjs().subtract(3, "day").toISOString(),
    close_at: dayjs().subtract(3, "day").add(1, "hour").toISOString(),
    outcome: "BE",
    strategy: "FVG Entry",
    trade_type: "Pullback",
    session: "NY",
    metrics: {
      riskUSD: 300,
      rewardUSD: 0,
      rr: 0,
      riskPts: 0.30,
      rewardPts: 0,
    },
  },

  // Recent trades
  {
    id: "9",
    symbol: "EURUSD",
    side: "LONG",
    entry_price: 1.0880,
    exit_price: 1.0940,
    stop_price: 1.0860,
    quantity: 10000,
    fees: 5,
    open_at: dayjs().subtract(2, "day").toISOString(),
    close_at: dayjs().subtract(2, "day").add(2, "hour").toISOString(),
    outcome: "WIN",
    strategy: "ICT MSS",
    trade_type: "Breakout",
    session: "London",
    metrics: {
      riskUSD: 200,
      rewardUSD: 600,
      rr: 3.0,
      riskPts: 0.0020,
      rewardPts: 0.0060,
    },
  },
  {
    id: "10",
    symbol: "GBPUSD",
    side: "SHORT",
    entry_price: 1.2680,
    exit_price: 1.2730,
    stop_price: 1.2730,
    quantity: 10000,
    fees: 5,
    open_at: dayjs().subtract(1, "day").toISOString(),
    close_at: dayjs().subtract(1, "day").add(1, "hour").toISOString(),
    outcome: "LOSS",
    strategy: "Order Block",
    trade_type: "Support",
    session: "NY",
    metrics: {
      riskUSD: 500,
      rewardUSD: -500,
      rr: -1.0,
      riskPts: 0.0050,
      rewardPts: -0.0050,
    },
  },

  // Open trade (no exit)
  {
    id: "11",
    symbol: "EURUSD",
    side: "LONG",
    entry_price: 1.0890,
    stop_price: 1.0870,
    quantity: 10000,
    fees: 0,
    open_at: dayjs().toISOString(),
    outcome: "OPEN",
    strategy: "ICT MSS",
    trade_type: "Breakout",
    session: "London",
    metrics: {
      riskUSD: 200,
      riskPts: 0.0020,
    },
  },

  // Add more historical trades for better statistics
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `hist-${i}`,
    symbol: ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD"][i % 4],
    side: (i % 2 === 0 ? "LONG" : "SHORT") as "LONG" | "SHORT",
    entry_price: 1.0 + Math.random() * 0.5,
    exit_price: 1.0 + Math.random() * 0.5,
    stop_price: 1.0 + Math.random() * 0.5,
    quantity: 10000,
    fees: 5,
    open_at: dayjs()
      .subtract(30 + i, "day")
      .toISOString(),
    close_at: dayjs()
      .subtract(30 + i, "day")
      .add(Math.random() * 5, "hour")
      .toISOString(),
    outcome: (Math.random() > 0.4 ? "WIN" : "LOSS") as "WIN" | "LOSS",
    strategy: ["ICT MSS", "FVG Entry", "Order Block"][i % 3],
    trade_type: ["Breakout", "Pullback", "Support"][i % 3],
    session: (["Asia", "London", "NY"][i % 3] as "Asia" | "London" | "NY"),
    metrics: {
      riskUSD: 200 + Math.random() * 300,
      rewardUSD: Math.random() > 0.4 ? 300 + Math.random() * 500 : -(200 + Math.random() * 300),
      rr: Math.random() > 0.4 ? 1 + Math.random() * 2 : -1,
      riskPts: 0.002 + Math.random() * 0.003,
      rewardPts: Math.random() > 0.4 ? 0.003 + Math.random() * 0.005 : -(0.002 + Math.random() * 0.003),
    },
  })),
];

/**
 * Mock API function to replace getTrades()
 * Use this in StatisticsPage.tsx for testing:
 * 
 * import { mockGetTrades } from "@/utils/mockData";
 * 
 * // Replace getTrades() with:
 * const result = await mockGetTrades();
 */
export async function mockGetTrades() {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    ok: true,
    data: mockTrades,
  };
}