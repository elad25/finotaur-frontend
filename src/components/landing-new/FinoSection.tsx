// src/components/landing-new/FinoSection.tsx
// ================================================
// 🔥 MEET FINO — standalone AI-analyst section
// Extracted out of the former JournalToolsTabs "Meet FINO" tab so FINO gets
// its own dedicated moment on the page, right after The Trader showcase.
// ================================================

import { motion } from 'framer-motion';
import { SectionShell } from './_shared/SectionShell';
import { SectionEyebrow } from './_shared/SectionEyebrow';
import { SectionTitle } from './_shared/SectionTitle';
import finoThinking from '@/assets/landing/fino-thinking.webp';

// Real chat mock built from the in-app FINO avatar — shows an actual example
// exchange instead of an idle mascot loop. Dark bubble card, gold accents,
// mono for numbers per DS §2 number formatting rules.
const finoChatExchange: Array<{ from: 'user' | 'fino'; text: string }> = [
  { from: 'user', text: 'Why do my Wednesdays keep bleeding?' },
  {
    from: 'fino',
    text:
      "You've lost −$7,490 on Wednesdays — 36% win rate vs 65% on Thursdays. Your losses cluster after 2 consecutive reds. Consider halving size mid-week.",
  },
  { from: 'user', text: 'Set that as a rule.' },
  {
    from: 'fino',
    text: "Done. I'll flag any Wednesday trade after 2 losses in your reports.",
  },
];

// Highlights dollar amounts / percentages in mono tabular-nums per DS §2
// number-formatting rules, leaving surrounding prose in font-sans.
const NUMBER_SPLIT_PATTERN = /(−?\$[\d,]+(?:\.\d+)?|\d+%)/g;
const NUMBER_TEST_PATTERN = /^(−?\$[\d,]+(?:\.\d+)?|\d+%)$/;
function renderChatText(text: string) {
  return text.split(NUMBER_SPLIT_PATTERN).map((part, idx) =>
    NUMBER_TEST_PATTERN.test(part) ? (
      <span key={idx} className="font-mono tabular-nums">
        {part}
      </span>
    ) : (
      <span key={idx}>{part}</span>
    ),
  );
}

/** Static half-body FINO, "thinking" — gazing up-left. Sits toward the
 * right edge of the left column so it visually bridges toward the chat
 * mock. A staggered thought-bubble trail rises toward the upper-left,
 * following FINO's gaze, to signal "thinking". */
const FinoThinking = () => {
  return (
    <div className="relative mt-ds-6 flex items-start gap-3 self-end ml-auto mx-auto md:mx-0 md:ml-auto md:mr-[-24px] lg:mr-[-48px]">
      <style>{`
        @keyframes fino-thought-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.8; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fino-thought-dot { animation: none !important; opacity: 0.6 !important; }
        }
      `}</style>

      {/* Thought-bubble trail — three dots of increasing size, rising
          toward FINO's upper-left gaze (his head is at the top of the
          bust image, hence items-start on the row above). Smallest sits
          nearest the head (bottom of this column), growing outward toward
          the upper-left, each pulsing in sequence outward. Hidden below md
          where the diagonal positioning gets cramped next to the copy. */}
      <div
        aria-hidden="true"
        className="hidden md:flex flex-col items-end gap-2.5 mt-2"
      >
        <span
          className="fino-thought-dot rounded-full bg-gold-primary/30 border border-gold-primary/40 mr-5"
          style={{
            width: 13,
            height: 13,
            animation: 'fino-thought-pulse 2.2s ease-in-out infinite',
            animationDelay: '0.8s',
          }}
        />
        <span
          className="fino-thought-dot rounded-full bg-gold-primary/30 border border-gold-primary/40 mr-3"
          style={{
            width: 9,
            height: 9,
            animation: 'fino-thought-pulse 2.2s ease-in-out infinite',
            animationDelay: '0.4s',
          }}
        />
        <span
          className="fino-thought-dot rounded-full bg-gold-primary/30 border border-gold-primary/40"
          style={{
            width: 6,
            height: 6,
            animation: 'fino-thought-pulse 2.2s ease-in-out infinite',
            animationDelay: '0s',
          }}
        />
      </div>

      <img
        src={finoThinking}
        alt=""
        aria-hidden="true"
        draggable={false}
        loading="lazy"
        decoding="async"
        className="h-56 lg:h-64 w-auto select-none"
      />
    </div>
  );
};

const FinoChatMock = () => {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-gold-border shadow-card-featured bg-section-card-deep">
      <div className="relative flex flex-col px-4 py-6 sm:px-6 sm:py-8 overflow-hidden">
        <div className="flex flex-col gap-4 max-w-xl mx-auto w-full">
          {finoChatExchange.map((message, i) => {
            const isFino = message.from === 'fino';
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                className={`flex items-start gap-2.5 ${isFino ? '' : 'flex-row-reverse'}`}
              >
                {isFino && (
                  <img
                    src="/fino-avatar.png"
                    alt="FINO"
                    width={32}
                    height={32}
                    loading="lazy"
                    decoding="async"
                    className="w-8 h-8 rounded-full border border-gold-primary/40 shrink-0 mt-0.5"
                  />
                )}
                <div
                  className={`rounded-[12px] px-4 py-2.5 text-sm leading-relaxed max-w-[85%] font-sans ${
                    isFino
                      ? 'bg-section-card-rest border border-gold-border text-ink-primary'
                      : 'bg-gold-primary/10 border border-gold-primary/30 text-ink-primary'
                  }`}
                >
                  {renderChatText(message.text)}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// FinoSection
// ---------------------------------------------------------------------------
const FinoSection = () => {
  return (
    <SectionShell id="meet-fino" atmosphere="subtle" beam={false}>
      <div className="text-center mb-12">
        <SectionEyebrow>Meet FINO</SectionEyebrow>
        <SectionTitle gradient="split" size="default" className="mb-4">
          Your AI analyst,{' '}
          <span className="text-gold-primary">everywhere you trade.</span>
        </SectionTitle>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center"
      >
        <div>
          <p className="font-sans font-light text-ink-secondary text-base leading-relaxed mb-5">
            Ask FINO anything — break down a trade in your journal, decode an options chain, or
            get context on any ticker. It's one tap away on every page of FINOTAUR.
          </p>
          <ul className="space-y-2.5">
            {[
              'Lives in your journal and across the whole site',
              'Ask about any trade, ticker, or setup',
              'Plain-English answers in seconds',
              'Always one tap away',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-ink-secondary">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-gold-primary shrink-0" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <FinoThinking />
        </div>
        <FinoChatMock />
      </motion.div>
    </SectionShell>
  );
};

export default FinoSection;
