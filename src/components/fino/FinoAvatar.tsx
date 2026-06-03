// src/components/fino/FinoAvatar.tsx
// =====================================================
// FINO AI — the animated avatar.
// A small looping video of FINO (the silent Pixar-style bull mascot)
// that reacts to the chat's state. Four clips, all silent (muted),
// generated from the FINO Higgsfield Element.
//
//   GREETING   — one-shot warm wave when the chat opens, then IDLE.
//   IDLE       — calm breathing/blink loop (default resting state).
//   THINKING   — head-tilt + hoof-to-chin loop while the AI answers.
//   CELEBRATE  — one-shot joyful bounce on the FIRST AI answer of a
//                conversation, then back to IDLE.
//
// FINO never speaks on screen — the clips carry no audio and we render
// them `muted` regardless, so this is decorative (aria-hidden).
// =====================================================

import { useEffect, useRef, useState } from 'react';

type Clip = 'idle' | 'thinking' | 'greeting' | 'celebrate';

const SRC: Record<Clip, string> = {
  idle: '/fino/fino-idle.mp4',
  thinking: '/fino/fino-thinking.mp4',
  greeting: '/fino/fino-greeting.mp4',
  celebrate: '/fino/fino-celebrate.mp4',
};

const POSTER = '/fino/fino-idle-poster.png';

// Only these clips loop; greeting/celebrate are one-shots that resolve to idle.
const LOOPING: ReadonlyArray<Clip> = ['idle', 'thinking'];

interface FinoAvatarProps {
  /** True while the AI is generating a response (drives the THINKING loop). */
  thinking: boolean;
  /** Count of completed assistant messages — drives the one-shot CELEBRATE on the first answer. */
  assistantCount: number;
  /** Rendered square size in px. Default 36 (matches the old h-9 w-9 avatar). */
  size?: number;
  className?: string;
}

export default function FinoAvatar({
  thinking,
  assistantCount,
  size = 36,
  className = '',
}: FinoAvatarProps) {
  // Greet on first mount, then the effects below take over.
  const [clip, setClip] = useState<Clip>('greeting');

  // One-shot guard: celebrate fires at most once per conversation.
  const celebratedRef = useRef(false);
  // Track the previous `thinking` value to detect the moment it turns off.
  const prevThinkingRef = useRef(thinking);

  // A fresh conversation (messages cleared) re-arms the celebrate.
  useEffect(() => {
    if (assistantCount === 0) celebratedRef.current = false;
  }, [assistantCount]);

  // Core state machine: thinking has priority; on its falling edge we either
  // celebrate the first answer or settle back to idle.
  useEffect(() => {
    const wasThinking = prevThinkingRef.current;
    prevThinkingRef.current = thinking;

    if (thinking) {
      setClip('thinking');
      return;
    }

    // `thinking` just turned off — an answer (or an error) finished.
    if (wasThinking) {
      if (assistantCount >= 1 && !celebratedRef.current) {
        celebratedRef.current = true;
        setClip('celebrate');
      } else {
        setClip('idle');
      }
    }
  }, [thinking, assistantCount]);

  // One-shot clips fall back to the resting loop when they finish.
  const handleEnded = () => {
    if (!LOOPING.includes(clip)) setClip('idle');
  };

  return (
    <video
      // Remounting per clip gives a clean autoplay restart without manual load()/play().
      key={clip}
      src={SRC[clip]}
      poster={POSTER}
      width={size}
      height={size}
      muted
      autoPlay
      playsInline
      loop={LOOPING.includes(clip)}
      onEnded={handleEnded}
      aria-hidden="true"
      className={className}
      style={{ width: size, height: size, objectFit: 'cover' }}
    />
  );
}
