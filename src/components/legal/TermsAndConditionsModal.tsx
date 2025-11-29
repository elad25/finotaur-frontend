// src/components/legal/TermsAndConditionsModal.tsx
// 📜 TERMS & CONDITIONS MODAL
// Popup version with all legal policies - opens from Register page

import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, AlertTriangle, FileText, Shield, Cookie, Copyright as CopyrightIcon, AlertCircle, CreditCard, Scale, Mail, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Section IDs for navigation
const SECTIONS = [
  { id: 'terms', label: 'Terms of Use', icon: FileText },
  { id: 'privacy', label: 'Privacy Policy', icon: Shield },
  { id: 'disclaimer', label: 'Disclaimer', icon: AlertCircle },
  { id: 'risk', label: 'Risk Disclosure', icon: AlertTriangle },
  { id: 'refund', label: 'Refund Policy', icon: CreditCard },
  { id: 'cookies', label: 'Cookie Policy', icon: Cookie },
  { id: 'copyright', label: 'Copyright', icon: CopyrightIcon },
  { id: 'dmca', label: 'DMCA', icon: Mail },
] as const;

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

const TermsAndConditionsModal = ({ 
  isOpen, 
  onClose, 
  onAccept,
  showAcceptButton = false 
}: TermsAndConditionsModalProps) => {
  const [activeSection, setActiveSection] = useState('terms');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Reset to top when modal opens
  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.scrollTop = 0;
      setActiveSection('terms');
    }
  }, [isOpen]);

  // Update active section on scroll
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const handleScroll = () => {
      const scrollPosition = content.scrollTop + 150;
      setShowScrollTop(content.scrollTop > 500);

      const sections = SECTIONS.map(s => ({
        id: s.id,
        element: document.getElementById(`modal-${s.id}`),
      })).filter(s => s.element);

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section.element) {
          const offsetTop = section.element.offsetTop - content.offsetTop;
          if (offsetTop <= scrollPosition) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    content.addEventListener('scroll', handleScroll);
    return () => content.removeEventListener('scroll', handleScroll);
  }, [isOpen]);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(`modal-${sectionId}`);
    if (element && contentRef.current) {
      const offsetTop = element.offsetTop - contentRef.current.offsetTop - 20;
      contentRef.current.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-5xl h-[90vh] bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-zinc-700 bg-zinc-900/95">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Scale className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Terms & Conditions</h2>
              <p className="text-xs text-zinc-400">Last updated: November 2025</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Sidebar */}
          <aside className="hidden md:block w-56 flex-shrink-0 border-r border-zinc-800 bg-zinc-900/50 overflow-y-auto">
            <nav className="p-4 space-y-1">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">
                Contents
              </p>
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all duration-200 text-left",
                      activeSection === section.id
                        ? "bg-yellow-500/10 text-yellow-500 font-medium"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{section.label}</span>
                    {activeSection === section.id && (
                      <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <div 
            ref={contentRef}
            className="flex-1 overflow-y-auto scroll-smooth"
          >
            {/* Mobile Navigation */}
            <div className="md:hidden sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 p-3 overflow-x-auto">
              <div className="flex gap-2">
                {SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors",
                      activeSection === section.id
                        ? "bg-yellow-500 text-black font-medium"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    )}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 md:p-8 max-w-3xl">
              {/* Intro */}
              <p className="text-sm text-zinc-400 mb-8">
                By using Finotaur, you agree to all policies outlined below. Please read them carefully.
              </p>

              {/* ============================================ */}
              {/* SECTION 1: TERMS OF USE */}
              {/* ============================================ */}
              <section id="modal-terms" className="mb-12 scroll-mt-4">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <FileText className="w-5 h-5 text-yellow-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Terms of Use</h2>
                </div>

                <div className="space-y-4 text-sm">
                  <p className="text-zinc-300">
                    Welcome to Finotaur. By accessing or using this website, platform, or any associated services ("Services"), you agree to these Terms of Use. If you do not agree, please do not use our Services.
                  </p>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">1. Educational Purpose Only</h3>
                    <p className="text-zinc-400">
                      Finotaur provides market data, analytics, and trading tools for educational and informational purposes only. Nothing on this platform constitutes financial, investment, tax, or legal advice. All trades or financial decisions made based on information from Finotaur are at your own risk.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">2. Eligibility</h3>
                    <p className="text-zinc-400">
                      You must be at least 18 years old to use Finotaur.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">3. Intellectual Property</h3>
                    <p className="text-zinc-400">
                      All content, design, text, code, software, logos, and graphics are the property of Finotaur and protected by international copyright and trademark laws. You may not copy, reproduce, or distribute any content without written permission.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">4. Data Sources and Accuracy</h3>
                    <p className="text-zinc-400">
                      Finotaur aggregates data from third-party providers such as Polygon, SEC, and FRED. We do not guarantee the accuracy, completeness, or timeliness of this information.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">5. Limitation of Liability</h3>
                    <p className="text-zinc-400">
                      Finotaur and its affiliates shall not be liable for any direct, indirect, or consequential losses resulting from the use or inability to use the Services, including data errors or financial loss.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">6. User Conduct</h3>
                    <p className="text-zinc-400">
                      You agree not to use Finotaur for unlawful purposes, scraping, reverse-engineering, or reselling data. Any abuse will result in immediate account termination.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">7. Subscriptions and Payments</h3>
                    <p className="text-zinc-400">
                      All payments are processed securely via PayPlus. Finotaur does not store payment details. For billing, refunds, or disputes, refer to our Refund Policy section below.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">8. Governing Law</h3>
                    <p className="text-zinc-400">
                      These Terms are governed by the laws of Israel. Any dispute shall be subject to the exclusive jurisdiction of the courts in Tel Aviv, Israel.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">9. Updates</h3>
                    <p className="text-zinc-400">
                      We may update these Terms from time to time. Continued use of the platform constitutes acceptance of the latest version.
                    </p>
                  </div>
                </div>
              </section>

              <hr className="border-zinc-800 my-8" />

              {/* ============================================ */}
              {/* SECTION 2: PRIVACY POLICY */}
              {/* ============================================ */}
              <section id="modal-privacy" className="mb-12 scroll-mt-4">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <Shield className="w-5 h-5 text-yellow-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Privacy Policy</h2>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">1. Overview</h3>
                    <p className="text-zinc-400">
                      Finotaur respects your privacy. This policy explains how we collect, use, and protect your data.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">2. Data We Collect</h3>
                    <ul className="text-zinc-400 space-y-1.5 list-disc pl-5">
                      <li>Personal information such as name, email, and preferences during account creation.</li>
                      <li>Technical data such as IP address, browser type, and cookies.</li>
                      <li>Usage data related to how you interact with our dashboard and features.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">3. How We Use Data</h3>
                    <ul className="text-zinc-400 space-y-1.5 list-disc pl-5">
                      <li>To provide and improve our Services.</li>
                      <li>To send system notifications and updates.</li>
                      <li>To analyze user behavior for better performance and experience.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">4. Data Sharing</h3>
                    <p className="text-zinc-400">
                      We do not sell personal data. We may share limited data with secure third parties (e.g., PayPlus, Supabase, SnapTrade) solely for functionality and compliance.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">5. Cookies</h3>
                    <p className="text-zinc-400">
                      Finotaur uses cookies for analytics and session management. You can disable them in your browser settings.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">6. Data Retention</h3>
                    <p className="text-zinc-400">
                      We retain data as long as necessary for legitimate business purposes or legal obligations.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">7. Security</h3>
                    <p className="text-zinc-400">
                      We use encryption and secure protocols to protect your information. No system is 100% secure, but we take every reasonable measure.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">8. Your Rights</h3>
                    <p className="text-zinc-400">
                      You can request data deletion or correction at any time by contacting us at{' '}
                      <a href="mailto:legal@finotaur.com" className="text-yellow-500 hover:underline">
                        legal@finotaur.com
                      </a>.
                    </p>
                  </div>
                </div>
              </section>

              <hr className="border-zinc-800 my-8" />

              {/* ============================================ */}
              {/* SECTION 3: DISCLAIMER */}
              {/* ============================================ */}
              <section id="modal-disclaimer" className="mb-12 scroll-mt-4">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Disclaimer</h2>
                </div>

                <div className="space-y-4 text-sm text-zinc-400">
                  <p>
                    The content, data, charts, and insights on Finotaur are provided for educational and informational purposes only.
                  </p>
                  <p>
                    Finotaur is not a registered investment advisor or broker-dealer. All information provided is based on publicly available data sources. No representation is made regarding accuracy, completeness, or future performance.
                  </p>
                  <p>
                    Trading financial instruments involves substantial risk of loss. Users are solely responsible for their own trading decisions. Past performance does not guarantee future results.
                  </p>
                  <p>
                    By using Finotaur, you acknowledge and accept full responsibility for any decisions or actions taken based on the platform's content.
                  </p>
                </div>
              </section>

              <hr className="border-zinc-800 my-8" />

              {/* ============================================ */}
              {/* SECTION 4: RISK DISCLOSURE */}
              {/* ============================================ */}
              <section id="modal-risk" className="mb-12 scroll-mt-4">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Risk Disclosure</h2>
                </div>

                {/* Warning Banner */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-5">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-amber-500 mb-1">Important Risk Warning</h3>
                    <p className="text-xs text-zinc-400">
                      Trading financial instruments involves substantial risk and may not be suitable for all investors.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-sm text-zinc-400">
                  <p>
                    Trading involves substantial risk of loss and is not suitable for every investor. You may lose more than your initial investment.
                  </p>
                  <p>
                    Before trading, carefully consider your financial objectives, level of experience, and risk appetite. You are solely responsible for any losses incurred as a result of trading activities or reliance on Finotaur's tools and insights.
                  </p>
                  <p>
                    Finotaur does not guarantee profitability or performance. Data and analysis are for educational purposes only.
                  </p>
                </div>
              </section>

              <hr className="border-zinc-800 my-8" />

              {/* ============================================ */}
              {/* SECTION 5: REFUND POLICY */}
              {/* ============================================ */}
              <section id="modal-refund" className="mb-12 scroll-mt-4">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <CreditCard className="w-5 h-5 text-yellow-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Refund & Cancellation Policy</h2>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">1. Overview</h3>
                    <p className="text-zinc-400">
                      This Refund & Cancellation Policy explains how you can cancel your Finotaur subscription and under what circumstances refunds may be issued.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">2. 7-Day Money-Back Guarantee</h3>
                    <p className="text-zinc-400 mb-2">
                      We offer a <strong className="text-white">7-day money-back guarantee for first-time subscribers only</strong>:
                    </p>
                    <ul className="text-zinc-400 space-y-1.5 list-disc pl-5">
                      <li>Applies only to your first paid subscription with Finotaur</li>
                      <li>Valid for both monthly and annual plans</li>
                      <li>Must be requested within 7 days of initial purchase</li>
                      <li>Full refund will be issued to your original payment method</li>
                      <li>Processing time: 5-10 business days</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">3. No Refunds After 7 Days</h3>
                    <p className="text-zinc-400 mb-2">
                      After the 7-day money-back guarantee period, <strong className="text-white">all payments are final and non-refundable</strong>. This includes:
                    </p>
                    <ul className="text-zinc-400 space-y-1.5 list-disc pl-5">
                      <li>Monthly/annual subscription renewals</li>
                      <li>Mid-cycle cancellations</li>
                      <li>Lack of usage or "didn't have time to use it"</li>
                      <li>Change of mind after the 7-day period</li>
                      <li>Account suspensions due to ToS violations</li>
                    </ul>
                  </div>

                  {/* Annual Plans Warning */}
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-white font-semibold mb-2 text-sm">⚠️ Annual Plans - Important Notice:</p>
                    <p className="text-zinc-400 text-xs mb-2">
                      When you purchase an annual subscription, you are charged upfront for the entire 12-month period.
                    </p>
                    <p className="text-zinc-400 text-xs">
                      If you cancel mid-year, you will <strong className="text-white">NOT receive a refund</strong> for unused months, but will retain access until the period ends.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">4. Subscription Cancellation</h3>
                    <p className="text-zinc-400 mb-2">You can cancel your subscription at any time by:</p>
                    <ul className="text-zinc-400 space-y-1.5 list-disc pl-5">
                      <li>Navigating to <strong className="text-white">Settings → Subscription</strong></li>
                      <li>Clicking the "Cancel Subscription" button</li>
                      <li>Or contacting <a href="mailto:support@finotaur.com" className="text-yellow-500 hover:underline">support@finotaur.com</a></li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">5. Automatic Renewals</h3>
                    <ul className="text-zinc-400 space-y-1.5 list-disc pl-5">
                      <li>Monthly plans renew every month, annual plans every 12 months</li>
                      <li>Email reminder sent 7 days before renewal</li>
                      <li>Cancel at least 24 hours before renewal to avoid charges</li>
                    </ul>
                  </div>
                </div>
              </section>

              <hr className="border-zinc-800 my-8" />

              {/* ============================================ */}
              {/* SECTION 6: COOKIE POLICY */}
              {/* ============================================ */}
              <section id="modal-cookies" className="mb-12 scroll-mt-4">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <Cookie className="w-5 h-5 text-yellow-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Cookie Policy</h2>
                </div>

                <div className="space-y-4 text-sm">
                  <p className="text-zinc-400">
                    Finotaur uses cookies and similar technologies to enhance your browsing experience, analyze usage, and deliver personalized content.
                  </p>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">Types of Cookies</h3>
                    <ul className="text-zinc-400 space-y-1.5 list-disc pl-5">
                      <li><strong className="text-white">Essential cookies</strong> — required for login and navigation.</li>
                      <li><strong className="text-white">Analytics cookies</strong> — for understanding platform usage (e.g., Google Analytics).</li>
                      <li><strong className="text-white">Marketing cookies</strong> — to measure ad performance (if applicable).</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">Your Control</h3>
                    <p className="text-zinc-400">
                      You can disable cookies in your browser settings. By continuing to use Finotaur, you consent to our use of cookies as described.
                    </p>
                  </div>
                </div>
              </section>

              <hr className="border-zinc-800 my-8" />

              {/* ============================================ */}
              {/* SECTION 7: COPYRIGHT */}
              {/* ============================================ */}
              <section id="modal-copyright" className="mb-12 scroll-mt-4">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <CopyrightIcon className="w-5 h-5 text-yellow-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Copyright Notice</h2>
                </div>

                <div className="space-y-4 text-sm text-zinc-400">
                  <p className="text-base font-semibold text-white">
                    © 2025 Finotaur. All Rights Reserved.
                  </p>
                  <p>
                    All content on this website — including design, text, images, logos, data visualizations, and source code — is the exclusive property of Finotaur. Any unauthorized reproduction, redistribution, or modification is strictly prohibited.
                  </p>
                  <p>
                    "Finotaur" and its logo are trademarks of Finotaur. Unauthorized use may result in legal action.
                  </p>
                </div>
              </section>

              <hr className="border-zinc-800 my-8" />

              {/* ============================================ */}
              {/* SECTION 8: DMCA */}
              {/* ============================================ */}
              <section id="modal-dmca" className="mb-8 scroll-mt-4">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <Mail className="w-5 h-5 text-yellow-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">DMCA & Content Removal Policy</h2>
                </div>

                <div className="space-y-4 text-sm text-zinc-400">
                  <p>
                    If you believe that any material on Finotaur infringes your copyright, please send a detailed notice to{' '}
                    <a href="mailto:legal@finotaur.com" className="text-yellow-500 hover:underline">
                      legal@finotaur.com
                    </a>{' '}
                    including:
                  </p>
                  <ul className="space-y-1.5 list-disc pl-5">
                    <li>Your full name and contact information.</li>
                    <li>Identification of the copyrighted material.</li>
                    <li>The URL or location of the infringing content.</li>
                    <li>A statement that you are the rightful copyright owner or authorized to act on behalf of one.</li>
                    <li>Your signature (digital or physical).</li>
                  </ul>
                  <p>
                    Finotaur reserves the right to remove any allegedly infringing content and/or suspend user accounts in violation of copyright law.
                  </p>
                </div>
              </section>

              {/* Footer */}
              <div className="pt-6 border-t border-zinc-800 text-center">
                <p className="text-zinc-500 text-xs">
                  © 2025 Finotaur. All Rights Reserved.
                </p>
                <p className="text-zinc-500 text-xs mt-1">
                  Questions? Contact us at{' '}
                  <a href="mailto:legal@finotaur.com" className="text-yellow-500 hover:underline">
                    legal@finotaur.com
                  </a>
                </p>
              </div>
            </div>

            {/* Scroll to Top Button */}
            {showScrollTop && (
              <button
                onClick={scrollToTop}
                className="fixed bottom-24 right-8 p-3 bg-yellow-500 text-black rounded-full shadow-lg hover:bg-yellow-400 transition-all duration-200 animate-in fade-in zoom-in"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Footer with Accept Button */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-zinc-700 bg-zinc-900/95">
          <p className="text-xs text-zinc-500 hidden sm:block">
            By clicking "I Accept", you agree to all terms above.
          </p>
          <div className="flex items-center gap-3 ml-auto">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              Close
            </Button>
            {showAcceptButton && (
              <Button
                onClick={() => {
                  onAccept?.();
                  onClose();
                }}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-6"
              >
                I Accept
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsModal;