import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Facebook, Globe2, Instagram, Mail, ShieldCheck } from "lucide-react";
import { dsButtonVariants } from "@/components/ds/Button";
import { Card } from "@/components/ds/Card";
import { Wordmark } from "@/components/ds/Wordmark";

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const socialLinks = [
  {
    label: "Website",
    href: "https://www.finotaur.com",
    Icon: Globe2,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/finotaur/",
    Icon: Instagram,
  },
  {
    label: "X",
    href: "https://x.com/_Finotaur_",
    Icon: XIcon,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61586588400298",
    Icon: Facebook,
  },
];

const LinksPage = () => {
  useEffect(() => {
    document.title = "FINOTAUR Links | Official";
  }, []);

  return (
    <main className="min-h-screen bg-surface-base text-ink-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-ds-5 py-ds-7 sm:px-ds-6">
        <header className="flex flex-col items-center text-center">
          <Link to="/" aria-label="Finotaur home" className="inline-flex">
            <Wordmark size="large" interactive />
          </Link>
          <p className="mt-ds-3 text-sm leading-relaxed text-ink-secondary">
            Official FINOTAUR platforms and compliance disclosures.
          </p>
        </header>

        <section className="mt-ds-7 space-y-ds-4" aria-label="Official links">
          <Link
            to="/legal/risk-disclosure"
            className={dsButtonVariants({ variant: "gold", size: "full" })}
          >
            Risk Disclosure
          </Link>

          <Card variant="featured" padding="default">
            <div className="flex items-start gap-ds-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-gold-border bg-gold-border/20 text-gold-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-primary">Important risk notice</p>
                <p className="mt-ds-2 text-xs leading-relaxed text-ink-secondary">
                  Futures and forex trading are risky; use risk capital only. Losses may exceed
                  investment. Past results do not predict outcomes.
                </p>
              </div>
            </div>
          </Card>

          {socialLinks.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-14 items-center justify-between rounded-[12px] border border-border-ds-subtle bg-surface-1 px-ds-5 py-ds-4 text-ink-primary transition-colors duration-base ease-out hover:border-gold-border hover:bg-surface-2"
            >
              <span className="flex items-center gap-ds-3 text-sm font-medium">
                <Icon className="h-5 w-5 text-gold-primary" />
                {label}
              </span>
              <ArrowUpRight className="h-4 w-4 text-ink-tertiary transition-colors duration-base ease-out group-hover:text-gold-primary" />
            </a>
          ))}

          <a
            href="mailto:support@finotaur.com"
            className="group flex min-h-14 items-center justify-between rounded-[12px] border border-border-ds-subtle bg-surface-1 px-ds-5 py-ds-4 text-ink-primary transition-colors duration-base ease-out hover:border-gold-border hover:bg-surface-2"
          >
            <span className="flex items-center gap-ds-3 text-sm font-medium">
              <Mail className="h-5 w-5 text-gold-primary" />
              support@finotaur.com
            </span>
            <ArrowUpRight className="h-4 w-4 text-ink-tertiary transition-colors duration-base ease-out group-hover:text-gold-primary" />
          </a>
        </section>

        <footer className="mt-auto pt-ds-7 text-center text-[11px] leading-relaxed text-ink-tertiary">
          <p>Trading involves substantial risk of loss and is not suitable for every investor.</p>
          <p className="mt-ds-2">&copy; {new Date().getFullYear()} Finotaur. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
};

export default LinksPage;
