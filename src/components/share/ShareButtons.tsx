/**
 * <ShareButtons> — social share row.
 *
 * Uses native platform share URLs — no new dependencies.
 * Tracks each click via the existing analytics `track()` helper.
 */

import { Twitter, Linkedin, MessageCircle, Send, Mail } from 'lucide-react';
import { track } from '@/lib/analytics';

export interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  className?: string;
}

interface ShareTarget {
  id: string;
  label: string;
  Icon: React.ElementType;
  buildHref: (url: string, title: string, description?: string) => string;
}

const SHARE_TARGETS: ShareTarget[] = [
  {
    id: 'x',
    label: 'X (Twitter)',
    Icon: Twitter,
    buildHref: (url, title) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    Icon: Linkedin,
    buildHref: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    Icon: MessageCircle,
    buildHref: (url, title) =>
      `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    Icon: Send,
    buildHref: (url, title) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    id: 'email',
    label: 'Email',
    Icon: Mail,
    buildHref: (url, title, description) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
        (description ? description + '\n\n' : '') + url
      )}`,
  },
];

export function ShareButtons({ url, title, description, className }: ShareButtonsProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <span className="text-xs text-white/30 mr-1 hidden sm:block">Share</span>
      {SHARE_TARGETS.map(({ id, label, Icon, buildHref }) => (
        <a
          key={id}
          href={buildHref(url, title, description)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${label}`}
          onClick={() => track('share_clicked', { network: id })}
          className="inline-flex items-center justify-center w-8 h-8 rounded
                     border border-white/[0.08] text-white/40
                     hover:border-[#C9A646]/40 hover:text-[#C9A646]
                     transition-all duration-200"
        >
          <Icon className="w-3.5 h-3.5" />
        </a>
      ))}
    </div>
  );
}
