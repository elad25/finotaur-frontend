// src/components/ds/CharacterAvatar.tsx
// 30 character avatar options — rendered as inline SVG in a circle.
// Usage: <CharacterAvatar id="wolf" size={40} />
//        <CharacterAvatar id="eagle" size={64} />
//
// Avatar IDs are stored in profiles.avatar_character.
// Null / unknown ID → returns null (caller renders fallback monogram).

import React from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AvatarMeta {
  label: string;
  category: 'animal' | 'character' | 'abstract';
}

// ── SVG inner content — each function receives viewBox "0 0 60 60" ─────────────

const AVATARS: Record<string, AvatarMeta & { svg: React.ReactElement }> = {

  // ── Animals ──────────────────────────────────────────────────────────────────

  fino_bull: {
    label: 'FINO',
    category: 'animal',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0D0D0D"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <ellipse cx="30" cy="34" rx="13" ry="11" fill="#8B5E3C"/>
        <ellipse cx="30" cy="40" rx="8" ry="5" fill="#6B4226"/>
        <circle cx="27" cy="41" r="2" fill="#3D1F0A"/>
        <circle cx="33" cy="41" r="2" fill="#3D1F0A"/>
        <ellipse cx="22" cy="25" rx="3.5" ry="7" fill="#8B5E3C" transform="rotate(-20 22 25)"/>
        <ellipse cx="38" cy="25" rx="3.5" ry="7" fill="#8B5E3C" transform="rotate(20 38 25)"/>
        <circle cx="25" cy="30" r="3.5" fill="#1A0A00"/>
        <circle cx="35" cy="30" r="3.5" fill="#1A0A00"/>
        <circle cx="26" cy="29" r="1" fill="#fff"/>
        <circle cx="36" cy="29" r="1" fill="#fff"/>
        <path d="M17 46 Q30 52 43 46" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round"/>
      </>
    ),
  },

  wolf: {
    label: 'Wolf',
    category: 'animal',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0D0D0D"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <ellipse cx="30" cy="34" rx="13" ry="11" fill="#888"/>
        <polygon points="20,24 24,34 16,34" fill="#aaa"/>
        <polygon points="40,24 36,34 44,34" fill="#aaa"/>
        <polygon points="20,24 24,34 27,30" fill="#777"/>
        <polygon points="40,24 36,34 33,30" fill="#777"/>
        <ellipse cx="30" cy="39" rx="7" ry="4.5" fill="#ccc"/>
        <circle cx="25" cy="30" r="3" fill="#1A1A2E"/>
        <circle cx="35" cy="30" r="3" fill="#1A1A2E"/>
        <circle cx="26" cy="29" r=".9" fill="#fff"/>
        <circle cx="36" cy="29" r=".9" fill="#fff"/>
        <path d="M27 43 Q30 46 33 43" fill="none" stroke="#888" strokeWidth="1"/>
      </>
    ),
  },

  eagle: {
    label: 'Eagle',
    category: 'animal',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0D0D0D"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <ellipse cx="30" cy="33" rx="12" ry="11" fill="#4A3010"/>
        <ellipse cx="30" cy="23" rx="9" ry="8" fill="#2E1C08"/>
        <path d="M26 34 Q30 40 34 34 Q30 42 26 34Z" fill="#C9A84C"/>
        <circle cx="25" cy="25" r="3" fill="#F5F5DC"/>
        <circle cx="35" cy="25" r="3" fill="#F5F5DC"/>
        <circle cx="25.5" cy="25" r="1.8" fill="#1A1A00"/>
        <circle cx="35.5" cy="25" r="1.8" fill="#1A1A00"/>
        <circle cx="25.8" cy="24.5" r=".6" fill="#fff"/>
        <circle cx="35.8" cy="24.5" r=".6" fill="#fff"/>
        <path d="M14 32 Q22 27 30 32 Q38 27 46 32" fill="none" stroke="#4A3010" strokeWidth="2.5" strokeLinecap="round"/>
      </>
    ),
  },

  fox: {
    label: 'Fox',
    category: 'animal',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0D0D0D"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <ellipse cx="30" cy="34" rx="12" ry="11" fill="#D2691E"/>
        <polygon points="21,25 17,14 27,23" fill="#D2691E"/>
        <polygon points="39,25 43,14 33,23" fill="#D2691E"/>
        <polygon points="21,25 17,14 24,20" fill="#fff"/>
        <polygon points="39,25 43,14 36,20" fill="#fff"/>
        <ellipse cx="30" cy="39" rx="8" ry="5" fill="#fff"/>
        <circle cx="24" cy="30" r="3" fill="#1A0A00"/>
        <circle cx="36" cy="30" r="3" fill="#1A0A00"/>
        <circle cx="25" cy="29" r=".9" fill="#fff"/>
        <circle cx="37" cy="29" r=".9" fill="#fff"/>
        <ellipse cx="30" cy="37" rx="2.5" ry="1.5" fill="#cc7755"/>
      </>
    ),
  },

  bear: {
    label: 'Bear',
    category: 'animal',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0D0D0D"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <circle cx="20" cy="24" r="7" fill="#5C4033"/>
        <circle cx="40" cy="24" r="7" fill="#5C4033"/>
        <ellipse cx="30" cy="36" rx="15" ry="13" fill="#5C4033"/>
        <ellipse cx="30" cy="43" rx="9" ry="5" fill="#8B6350"/>
        <circle cx="24" cy="30" r="3.5" fill="#1A0A00"/>
        <circle cx="36" cy="30" r="3.5" fill="#1A0A00"/>
        <circle cx="25" cy="29" r="1" fill="#fff"/>
        <circle cx="37" cy="29" r="1" fill="#fff"/>
        <ellipse cx="30" cy="37" rx="3" ry="2" fill="#3D2218"/>
      </>
    ),
  },

  lion: {
    label: 'Lion',
    category: 'animal',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0D0D0D"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <circle cx="30" cy="32" r="16" fill="#C8941A" opacity=".3"/>
        <ellipse cx="30" cy="34" rx="11" ry="10" fill="#D4A034"/>
        <ellipse cx="30" cy="40" rx="7" ry="4" fill="#B8842A"/>
        <circle cx="25" cy="30" r="3" fill="#1A0A00"/>
        <circle cx="35" cy="30" r="3" fill="#1A0A00"/>
        <circle cx="26" cy="29" r=".9" fill="#fff"/>
        <circle cx="36" cy="29" r=".9" fill="#fff"/>
        <ellipse cx="30" cy="37" rx="3" ry="2" fill="#9C6C1A"/>
      </>
    ),
  },

  shark: {
    label: 'Shark',
    category: 'animal',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <ellipse cx="30" cy="36" rx="16" ry="10" fill="#4A6FA5"/>
        <polygon points="30,14 34,28 26,28" fill="#5A7FB5"/>
        <ellipse cx="22" cy="34" rx="5" ry="3" fill="#3A5F95" transform="rotate(-10 22 34)"/>
        <ellipse cx="38" cy="34" rx="5" ry="3" fill="#3A5F95" transform="rotate(10 38 34)"/>
        <circle cx="25" cy="32" r="2.5" fill="#0A0A14"/>
        <circle cx="35" cy="32" r="2.5" fill="#0A0A14"/>
        <circle cx="25.5" cy="31.5" r=".8" fill="#fff"/>
        <circle cx="35.5" cy="31.5" r=".8" fill="#fff"/>
        <path d="M22 42 L25 39 L28 42 L31 39 L34 42 L37 39 L38 42" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
      </>
    ),
  },

  panda: {
    label: 'Panda',
    category: 'animal',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0D0D0D"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <ellipse cx="30" cy="34" rx="13" ry="12" fill="#eee"/>
        <circle cx="21" cy="23" r="6" fill="#222"/>
        <circle cx="39" cy="23" r="6" fill="#222"/>
        <circle cx="22" cy="30" r="4" fill="#222"/>
        <circle cx="38" cy="30" r="4" fill="#222"/>
        <circle cx="23" cy="30" r="2.5" fill="#fff"/>
        <circle cx="37" cy="30" r="2.5" fill="#fff"/>
        <circle cx="23.5" cy="30" r="1.4" fill="#111"/>
        <circle cx="37.5" cy="30" r="1.4" fill="#111"/>
        <ellipse cx="30" cy="38" rx="2.5" ry="1.5" fill="#bbb"/>
      </>
    ),
  },

  dragon: {
    label: 'Dragon',
    category: 'animal',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <ellipse cx="30" cy="35" rx="13" ry="10" fill="#2D6A2D"/>
        <ellipse cx="30" cy="26" rx="10" ry="8" fill="#3D8A3D"/>
        <polygon points="24,18 20,8 28,16" fill="#2D6A2D"/>
        <polygon points="36,18 40,8 32,16" fill="#2D6A2D"/>
        <circle cx="25" cy="28" r="3" fill="#FFD700"/>
        <circle cx="35" cy="28" r="3" fill="#FFD700"/>
        <circle cx="25.8" cy="27.5" r="1.2" fill="#1A0A00"/>
        <circle cx="35.8" cy="27.5" r="1.2" fill="#1A0A00"/>
        <path d="M24,38 L28,36 L30,39 L32,36 L36,38" fill="none" stroke="#FFD700" strokeWidth="1"/>
        <path d="M14,32 Q30,52 46,32" fill="none" stroke="#2D6A2D" strokeWidth="3" strokeLinecap="round"/>
      </>
    ),
  },

  owl: {
    label: 'Owl',
    category: 'animal',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <ellipse cx="30" cy="36" rx="14" ry="13" fill="#6B4226"/>
        <ellipse cx="30" cy="23" rx="12" ry="10" fill="#7B5236"/>
        <polygon points="24,16 22,24 28,22" fill="#7B5236"/>
        <polygon points="36,16 38,24 32,22" fill="#7B5236"/>
        <circle cx="24" cy="26" r="5" fill="#F5DEB3"/>
        <circle cx="36" cy="26" r="5" fill="#F5DEB3"/>
        <circle cx="24" cy="26" r="3.5" fill="#1A0A00"/>
        <circle cx="36" cy="26" r="3.5" fill="#1A0A00"/>
        <circle cx="24.8" cy="25.2" r="1.2" fill="#fff"/>
        <circle cx="36.8" cy="25.2" r="1.2" fill="#fff"/>
        <ellipse cx="30" cy="33" rx="3" ry="2" fill="#C9A84C"/>
      </>
    ),
  },

  tiger: {
    label: 'Tiger',
    category: 'animal',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0D0D0D"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <ellipse cx="30" cy="34" rx="13" ry="11" fill="#E8892A"/>
        <ellipse cx="30" cy="24" rx="11" ry="9" fill="#F0952E"/>
        <path d="M20,18 Q25,22 30,18 Q35,22 40,18" fill="none" stroke="#333" strokeWidth="1.8"/>
        <ellipse cx="30" cy="40" rx="7" ry="4" fill="#F0C890"/>
        <circle cx="24" cy="29" r="3.5" fill="#1A0A00"/>
        <circle cx="36" cy="29" r="3.5" fill="#1A0A00"/>
        <circle cx="25" cy="28.5" r="1" fill="#fff"/>
        <circle cx="37" cy="28.5" r="1" fill="#fff"/>
        <line x1="22" y1="34" x2="17" y2="33" stroke="#333" strokeWidth="1"/>
        <line x1="22" y1="36" x2="16" y2="36" stroke="#333" strokeWidth="1"/>
        <line x1="38" y1="34" x2="43" y2="33" stroke="#333" strokeWidth="1"/>
        <line x1="38" y1="36" x2="44" y2="36" stroke="#333" strokeWidth="1"/>
      </>
    ),
  },

  snake: {
    label: 'Snake',
    category: 'animal',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <path d="M18,44 Q14,36 18,28 Q22,20 30,20 Q38,20 42,26 Q46,32 40,36 Q34,40 28,36 Q22,32 26,26 Q29,22 33,24" fill="none" stroke="#3A8A3A" strokeWidth="5" strokeLinecap="round"/>
        <ellipse cx="33" cy="24" rx="5" ry="4" fill="#3A8A3A"/>
        <circle cx="31" cy="22.5" r="1.5" fill="#FFD700"/>
        <circle cx="35" cy="22.5" r="1.5" fill="#FFD700"/>
        <circle cx="31.4" cy="22.5" r=".7" fill="#000"/>
        <circle cx="35.4" cy="22.5" r=".7" fill="#000"/>
        <path d="M31,26 L29,28 M33,26 L35,28" stroke="#C00" strokeWidth="1" strokeLinecap="round"/>
      </>
    ),
  },

  scorpion: {
    label: 'Scorpion',
    category: 'animal',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <ellipse cx="30" cy="30" rx="8" ry="7" fill="#8B1A1A"/>
        <ellipse cx="30" cy="22" rx="6" ry="5" fill="#A02020"/>
        <circle cx="27" cy="21" r="1.8" fill="#FFD700"/>
        <circle cx="33" cy="21" r="1.8" fill="#FFD700"/>
        <circle cx="27.5" cy="21" r=".8" fill="#000"/>
        <circle cx="33.5" cy="21" r=".8" fill="#000"/>
        <path d="M38,30 Q44,24 46,18 Q48,12 44,12" fill="none" stroke="#8B1A1A" strokeWidth="3" strokeLinecap="round"/>
        <path d="M43,12 Q42,9 45,9" fill="none" stroke="#8B1A1A" strokeWidth="2" strokeLinecap="round"/>
        <line x1="22" y1="30" x2="14" y2="26" stroke="#8B1A1A" strokeWidth="2"/>
        <line x1="22" y1="33" x2="13" y2="32" stroke="#8B1A1A" strokeWidth="2"/>
        <line x1="38" y1="30" x2="46" y2="26" stroke="#8B1A1A" strokeWidth="2"/>
        <line x1="38" y1="33" x2="47" y2="32" stroke="#8B1A1A" strokeWidth="2"/>
      </>
    ),
  },

  phoenix: {
    label: 'Phoenix',
    category: 'animal',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <path d="M30,46 L16,28 Q22,26 26,30 Q24,20 30,14 Q36,20 34,30 Q38,26 44,28 Z" fill="#E85D04" opacity=".85"/>
        <path d="M30,42 L20,30 Q24,28 27,32 Q26,24 30,18 Q34,24 33,32 Q36,28 40,30 Z" fill="#FFBA08" opacity=".9"/>
        <circle cx="30" cy="17" r="3" fill="#fff"/>
      </>
    ),
  },

  panther: {
    label: 'Panther',
    category: 'animal',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <ellipse cx="30" cy="34" rx="13" ry="11" fill="#1A1A2E"/>
        <ellipse cx="30" cy="24" rx="11" ry="9" fill="#232335"/>
        <circle cx="24" cy="28" r="3.5" fill="#7B00FF" opacity=".9"/>
        <circle cx="36" cy="28" r="3.5" fill="#7B00FF" opacity=".9"/>
        <circle cx="24.8" cy="27.5" r="1.2" fill="#fff"/>
        <circle cx="36.8" cy="27.5" r="1.2" fill="#fff"/>
        <ellipse cx="30" cy="40" rx="7" ry="3.5" fill="#1A1A2E"/>
        <path d="M26 44 Q30 48 34 44" fill="none" stroke="#444" strokeWidth="1.2"/>
      </>
    ),
  },

  // ── Characters ────────────────────────────────────────────────────────────────

  ninja: {
    label: 'Ninja',
    category: 'character',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <ellipse cx="30" cy="34" rx="13" ry="14" fill="#1A1A2E"/>
        <ellipse cx="30" cy="23" rx="12" ry="9" fill="#2A2A3E"/>
        <rect x="18" y="31" width="24" height="8" rx="2" fill="#1A1A2E"/>
        <ellipse cx="30" cy="35" rx="9" ry="3.5" fill="#2A2A3E"/>
        <circle cx="25" cy="28" r="2.8" fill="#4FC3F7"/>
        <circle cx="35" cy="28" r="2.8" fill="#4FC3F7"/>
        <circle cx="25.8" cy="27.5" r="1" fill="#0A0A0A"/>
        <circle cx="35.8" cy="27.5" r="1" fill="#0A0A0A"/>
      </>
    ),
  },

  samurai: {
    label: 'Samurai',
    category: 'character',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <ellipse cx="30" cy="35" rx="13" ry="12" fill="#2A1A1A"/>
        <ellipse cx="30" cy="24" rx="11" ry="9" fill="#3A2A2A"/>
        <path d="M19,20 Q30,14 41,20 L38,28 Q30,24 22,28 Z" fill="#C9A84C" opacity=".8"/>
        <circle cx="25" cy="30" r="2.8" fill="#FF6B6B"/>
        <circle cx="35" cy="30" r="2.8" fill="#FF6B6B"/>
        <circle cx="25.8" cy="29.5" r="1" fill="#1A0000"/>
        <circle cx="35.8" cy="29.5" r="1" fill="#1A0000"/>
        <path d="M27 38 Q30 41 33 38" fill="none" stroke="#666" strokeWidth="1"/>
        <line x1="44" y1="16" x2="52" y2="8" stroke="#C9A84C" strokeWidth="1.5"/>
      </>
    ),
  },

  astronaut: {
    label: 'Astronaut',
    category: 'character',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <ellipse cx="30" cy="34" rx="14" ry="16" fill="#ccc"/>
        <ellipse cx="30" cy="25" rx="10" ry="9" fill="#1A1A2E"/>
        <ellipse cx="30" cy="25" rx="8" ry="7.5" fill="#1E2A3A"/>
        <circle cx="26" cy="23" r="2" fill="#4FC3F7" opacity=".8"/>
        <circle cx="34" cy="23" r="2" fill="#4FC3F7" opacity=".8"/>
        <rect x="25" y="27" width="10" height="2.5" rx="1" fill="#C9A84C" opacity=".9"/>
        <circle cx="30" cy="46" r="4.5" fill="#bbb"/>
        <path d="M14 40 Q30 46 46 40" fill="none" stroke="#aaa" strokeWidth="1.5"/>
      </>
    ),
  },

  wizard: {
    label: 'Wizard',
    category: 'character',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <ellipse cx="30" cy="36" rx="13" ry="11" fill="#6B3FA0"/>
        <ellipse cx="30" cy="25" rx="11" ry="9" fill="#7B4FB0"/>
        <polygon points="30,6 22,26 38,26" fill="#9B6FD0"/>
        <circle cx="25" cy="29" r="3" fill="#1A0A20"/>
        <circle cx="35" cy="29" r="3" fill="#1A0A20"/>
        <circle cx="26" cy="28.5" r=".9" fill="#fff"/>
        <circle cx="36" cy="28.5" r=".9" fill="#fff"/>
        <ellipse cx="30" cy="37" rx="5" ry="2.5" fill="#5A2E8A"/>
        <text x="30" y="47" textAnchor="middle" fontSize="8" fill="#C9A84C">★ ✦ ★</text>
      </>
    ),
  },

  robot: {
    label: 'Robot',
    category: 'character',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <rect x="19" y="23" width="22" height="20" rx="4" fill="#1A1A2E" stroke="#C9A84C" strokeWidth=".8"/>
        <rect x="23" y="27" width="5" height="5" rx="1" fill="#4FC3F7"/>
        <rect x="32" y="27" width="5" height="5" rx="1" fill="#4FC3F7"/>
        <rect x="25" y="35" width="10" height="2" rx="1" fill="#C9A84C"/>
        <line x1="30" y1="17" x2="30" y2="23" stroke="#C9A84C" strokeWidth="1.5"/>
        <circle cx="30" cy="16" r="2" fill="#C9A84C"/>
        <line x1="19" y1="30" x2="13" y2="34" stroke="#C9A84C" strokeWidth="1.2"/>
        <line x1="41" y1="30" x2="47" y2="34" stroke="#C9A84C" strokeWidth="1.2"/>
      </>
    ),
  },

  viking: {
    label: 'Viking',
    category: 'character',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <ellipse cx="30" cy="35" rx="12" ry="11" fill="#D4A034"/>
        <ellipse cx="30" cy="25" rx="10" ry="8" fill="#E8B444"/>
        <path d="M18,22 Q20,14 30,12 Q40,14 42,22 L38,25 Q34,18 30,18 Q26,18 22,25 Z" fill="#888"/>
        <path d="M18,22 L14,26 Q13,30 16,31 L20,28" fill="#C9A84C"/>
        <path d="M42,22 L46,26 Q47,30 44,31 L40,28" fill="#C9A84C"/>
        <circle cx="25" cy="28" r="2.5" fill="#1A0A00"/>
        <circle cx="35" cy="28" r="2.5" fill="#1A0A00"/>
        <path d="M20,38 Q25,34 30,36 Q35,34 40,38" fill="none" stroke="#B87333" strokeWidth="2"/>
      </>
    ),
  },

  hacker: {
    label: 'Hacker',
    category: 'character',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#00FF41" strokeWidth="1"/>
        <ellipse cx="30" cy="34" rx="13" ry="12" fill="#0D1A0D"/>
        <ellipse cx="30" cy="23" rx="11" ry="9" fill="#0A140A"/>
        <rect x="18" y="30" width="24" height="9" rx="2" fill="#0D1A0D" stroke="#00FF41" strokeWidth=".5"/>
        <circle cx="24" cy="27" r="3" fill="#00FF41" opacity=".8"/>
        <circle cx="36" cy="27" r="3" fill="#00FF41" opacity=".8"/>
        <circle cx="24.8" cy="26.5" r="1.2" fill="#0A0A0A"/>
        <circle cx="36.8" cy="26.5" r="1.2" fill="#0A0A0A"/>
        <text x="30" y="37" textAnchor="middle" fontSize="5" fill="#00FF41">01101010</text>
      </>
    ),
  },

  detective: {
    label: 'Detective',
    category: 'character',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <ellipse cx="30" cy="35" rx="12" ry="11" fill="#2A2A2A"/>
        <ellipse cx="30" cy="25" rx="10" ry="8" fill="#333"/>
        <path d="M18,22 Q20,14 30,13 Q40,14 42,22 L40,24 Q36,18 30,18 Q24,18 20,24 Z" fill="#1A1A1A"/>
        <circle cx="24" cy="27" r="3" fill="#1A1A1A"/>
        <circle cx="36" cy="27" r="3" fill="#1A1A1A"/>
        <circle cx="24.8" cy="26.8" r="1.5" fill="#5CA8D4"/>
        <circle cx="36.8" cy="26.8" r="1.5" fill="#5CA8D4"/>
        <circle cx="40" cy="38" r="5" fill="none" stroke="#C9A84C" strokeWidth="1.5"/>
        <line x1="44" y1="42" x2="48" y2="46" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round"/>
      </>
    ),
  },

  // ── Abstract ─────────────────────────────────────────────────────────────────

  diamond: {
    label: 'Diamond',
    category: 'abstract',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <polygon points="30,12 46,28 30,50 14,28" fill="none" stroke="#C9A84C" strokeWidth="1.5"/>
        <polygon points="30,12 46,28 30,28 14,28" fill="#C9A84C" opacity=".15"/>
        <line x1="14" y1="28" x2="46" y2="28" stroke="#C9A84C" strokeWidth=".8" opacity=".6"/>
        <line x1="30" y1="12" x2="30" y2="50" stroke="#C9A84C" strokeWidth=".5" opacity=".3"/>
      </>
    ),
  },

  flame: {
    label: 'Flame',
    category: 'abstract',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <path d="M30,48 C18,44 14,34 18,26 C20,20 24,18 24,18 C22,26 28,28 28,28 C26,22 30,14 34,12 C32,20 36,22 38,28 C40,22 42,18 42,18 C44,26 42,36 36,42 C34,44 32,46 30,48Z" fill="#E85D04" opacity=".9"/>
        <path d="M30,46 C22,42 20,34 22,28 C24,24 26,22 26,22 C25,28 28,30 28,30 C27,26 29,20 31,18 C30,24 33,26 34,30 C36,24 38,22 38,22 C39,28 37,36 33,41 C32,43 31,45 30,46Z" fill="#FFBA08"/>
      </>
    ),
  },

  lightning: {
    label: 'Lightning',
    category: 'abstract',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <polygon points="34,10 22,32 30,32 26,50 42,26 32,26" fill="#C9A84C"/>
      </>
    ),
  },

  crown: {
    label: 'Crown',
    category: 'abstract',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <polygon points="10,44 10,28 19,36 30,18 41,36 50,28 50,44" fill="#C9A84C" opacity=".9"/>
        <rect x="10" y="44" width="40" height="5" rx="1" fill="#C9A84C"/>
        <circle cx="30" cy="18" r="3" fill="#fff"/>
        <circle cx="10" cy="28" r="2.5" fill="#fff"/>
        <circle cx="50" cy="28" r="2.5" fill="#fff"/>
      </>
    ),
  },

  eye: {
    label: 'Eye',
    category: 'abstract',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <path d="M10,30 Q20,16 30,16 Q40,16 50,30 Q40,44 30,44 Q20,44 10,30Z" fill="none" stroke="#C9A84C" strokeWidth="1.5"/>
        <circle cx="30" cy="30" r="7" fill="none" stroke="#C9A84C" strokeWidth="1.2"/>
        <circle cx="30" cy="30" r="4" fill="#C9A84C"/>
        <circle cx="27" cy="27" r="1.5" fill="#fff" opacity=".6"/>
      </>
    ),
  },

  target: {
    label: 'Target',
    category: 'abstract',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <circle cx="30" cy="30" r="18" fill="none" stroke="#C9A84C" strokeWidth="1.2"/>
        <circle cx="30" cy="30" r="12" fill="none" stroke="#C9A84C" strokeWidth="1.2"/>
        <circle cx="30" cy="30" r="6" fill="none" stroke="#C9A84C" strokeWidth="1.2"/>
        <circle cx="30" cy="30" r="3" fill="#C9A84C"/>
        <line x1="10" y1="30" x2="20" y2="30" stroke="#C9A84C" strokeWidth="1.2"/>
        <line x1="40" y1="30" x2="50" y2="30" stroke="#C9A84C" strokeWidth="1.2"/>
        <line x1="30" y1="10" x2="30" y2="20" stroke="#C9A84C" strokeWidth="1.2"/>
        <line x1="30" y1="40" x2="30" y2="50" stroke="#C9A84C" strokeWidth="1.2"/>
      </>
    ),
  },

  compass: {
    label: 'Compass',
    category: 'abstract',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <circle cx="30" cy="30" r="16" fill="none" stroke="#C9A84C" strokeWidth="1.2"/>
        <polygon points="30,16 33,30 30,24 27,30" fill="#C9A84C"/>
        <polygon points="30,44 27,30 30,36 33,30" fill="#888"/>
        <circle cx="30" cy="30" r="2.5" fill="#C9A84C"/>
        <text x="30" y="12" textAnchor="middle" fontSize="7" fill="#C9A84C" fontWeight="bold">N</text>
      </>
    ),
  },

  yin_yang: {
    label: 'Yin Yang',
    category: 'abstract',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <circle cx="30" cy="30" r="16" fill="#fff"/>
        <path d="M30,14 A16,16 0 0,1 30,46 A8,8 0 0,1 30,30 A8,8 0 0,0 30,14Z" fill="#1A1A1A"/>
        <circle cx="30" cy="22" r="3" fill="#fff"/>
        <circle cx="30" cy="38" r="3" fill="#1A1A1A"/>
        <circle cx="30" cy="30" r="16" fill="none" stroke="#C9A84C" strokeWidth=".8"/>
      </>
    ),
  },

  anchor: {
    label: 'Anchor',
    category: 'abstract',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <circle cx="30" cy="22" r="5" fill="none" stroke="#C9A84C" strokeWidth="1.8"/>
        <line x1="30" y1="27" x2="30" y2="48" stroke="#C9A84C" strokeWidth="1.8"/>
        <line x1="20" y1="34" x2="40" y2="34" stroke="#C9A84C" strokeWidth="1.8"/>
        <path d="M20,48 Q22,42 30,48 Q38,42 40,48" fill="none" stroke="#C9A84C" strokeWidth="1.8" strokeLinecap="round"/>
      </>
    ),
  },

  shield: {
    label: 'Shield',
    category: 'abstract',
    svg: (
      <>
        <circle cx="30" cy="30" r="30" fill="#0A0A14"/>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#C9A84C" strokeWidth="1"/>
        <path d="M30,12 L46,20 L46,34 Q46,44 30,50 Q14,44 14,34 L14,20 Z" fill="none" stroke="#C9A84C" strokeWidth="1.5"/>
        <path d="M30,18 L40,24 L40,34 Q40,40 30,44 Q20,40 20,34 L20,24 Z" fill="#C9A84C" opacity=".15"/>
        <path d="M24,30 L28,34 L36,26" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </>
    ),
  },
};

// ── Exports ────────────────────────────────────────────────────────────────────

export const AVATAR_IDS = Object.keys(AVATARS) as (keyof typeof AVATARS)[];

export const AVATAR_META = AVATARS as Record<string, AvatarMeta>;

/** Render a character avatar SVG at any size. Returns null for unknown IDs. */
export function CharacterAvatar({ id, size = 40, className }: { id: string; size?: number; className?: string }) {
  const entry = AVATARS[id];
  if (!entry) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={entry.label}
      className={className}
      style={{ borderRadius: '50%', display: 'block' }}
    >
      {entry.svg}
    </svg>
  );
}

/** Returns the display label for an avatar ID, or empty string if unknown. */
export function getAvatarLabel(id: string): string {
  return AVATARS[id]?.label ?? '';
}
