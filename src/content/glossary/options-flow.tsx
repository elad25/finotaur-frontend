import { Link } from 'react-router-dom';

/**
 * Glossary content: Options Flow
 * Tone: conversational, opinion-bearing, with specific examples. Avoid bullet
 * lists for the main exposition — they read as AI-generated.
 */
export default function OptionsFlowContent() {
  return (
    <>
      <p>
        Options flow is the real-time record of every options contract traded on
        a given stock — strike, expiration, size, side, and the price the trade
        printed at. When people say "I follow the flow," they mean they're
        watching this stream to see where big money is positioning before the
        rest of the market notices.
      </p>

      <p>
        The reason it matters: a 5,000-contract sweep on{' '}
        <code>SPY 580 calls expiring Friday</code>, printed at the ask, isn't
        retail trading. That's a desk taking a directional bet with real size.
        When you see a cluster of those prints in the same direction across a
        15-minute window, it's the closest thing you'll get to looking over an
        institution's shoulder.
      </p>

      <h2>What I actually look for</h2>

      <p>
        Three things, in this order. First, <strong>sweep orders</strong> — when
        a single trader splits an order across multiple exchanges to fill it
        fast. Sweeps almost always mean urgency, and urgency usually means
        information. Second, <strong>premium spent</strong>. A $4M premium
        order on out-of-the-money calls tells a different story than 50 retail
        traders buying one contract each at the same strike, even if the open
        interest looks the same on paper. Third,{' '}
        <strong>where it printed</strong>. Trades at the ask are bullish
        intent; trades at the bid are bearish. Trades dead-center are noise.
      </p>

      <h2>The most common mistake</h2>

      <p>
        Treating volume as flow. Volume is a count. Flow is a story. A stock
        can have huge volume from market makers hedging their books — that's
        not directional information, it's mechanics. The skill is filtering
        the mechanics out so you're left with the bets that actually mean
        something. Most free "options volume" trackers don't make this
        distinction, which is why traders following them get whipsawed.
      </p>

      <h2>Where to track it</h2>

      <p>
        Finotaur's{' '}
        <Link to="/app/options/flow" className="text-primary hover:underline">
          Options Flow scanner
        </Link>{' '}
        runs the filter for you — sweeps, premium thresholds, side detection,
        unusual relative to a stock's normal book. Pair it with{' '}
        <Link to="/glossary/unusual-options-activity" className="text-primary hover:underline">
          unusual options activity
        </Link>{' '}
        for context on whether what you're seeing is actually out of the
        ordinary, or just the same flow that always shows up in heavily-traded
        names like SPY or QQQ.
      </p>
    </>
  );
}
