import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import {
  FileText,
  TrendingUp,
  Bitcoin,
  Building2,
  Calendar,
  Download,
  Eye,
  Clock,
  ChevronRight,
  Check,
  Sparkles,
  Bell,
  Settings,
  ExternalLink,
  AlertCircle,
  Loader2,
  CalendarDays,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, differenceInDays, isBefore, isAfter, setDate, addMonths } from 'date-fns';

// ========================================
// TYPES
// ========================================

interface SubscriptionInfo {
  status: 'active' | 'cancelled' | 'expired';
  expiresAt: Date | null;
  interval: 'monthly' | 'yearly' | null;
  cancelAtPeriodEnd: boolean;
}

interface Report {
  id: string;
  type: 'ism' | 'company' | 'crypto';
  title: string;
  date: Date;
  pdfUrl?: string;
  status: 'published' | 'upcoming' | 'generating';
  subject?: string;
}

interface ReportTypeConfig {
  id: 'ism' | 'company' | 'crypto';
  name: string;
  shortName: string;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  schedule: string;
  description: string;
}

// ========================================
// CONSTANTS
// ========================================

const REPORT_CONFIGS: ReportTypeConfig[] = [
  {
    id: 'ism',
    name: 'ISM Manufacturing Report',
    shortName: 'ISM',
    icon: TrendingUp,
    gradient: 'from-amber-500/20 to-orange-500/20',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    schedule: '~3rd of month (2 days after ISM release)',
    description: 'Macro-economic PMI analysis with sector impacts',
  },
  {
    id: 'company',
    name: 'Company Analysis',
    shortName: 'Company',
    icon: Building2,
    gradient: 'from-purple-500/20 to-pink-500/20',
    iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
    schedule: '5th & 20th of each month',
    description: 'Deep-dive fundamental research on major companies',
  },
  {
    id: 'crypto',
    name: 'Crypto Market Report',
    shortName: 'Crypto',
    icon: Bitcoin,
    gradient: 'from-cyan-500/20 to-blue-500/20',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
    schedule: '10th & 25th of each month',
    description: 'Institutional-grade cryptocurrency analysis',
  },
];

// ========================================
// HELPER FUNCTIONS
// ========================================

function getNextReportDates(): { type: 'ism' | 'company' | 'crypto'; date: Date; label: string }[] {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();
  
  const upcomingDates: { type: 'ism' | 'company' | 'crypto'; date: Date; label: string }[] = [];
  
  // ISM: ~3rd of each month (2 days after ISM release on 1st)
  const ismThisMonth = new Date(currentYear, currentMonth, 3);
  const ismNextMonth = new Date(currentYear, currentMonth + 1, 3);
  if (currentDay <= 3) {
    upcomingDates.push({ type: 'ism', date: ismThisMonth, label: 'ISM Report' });
  } else {
    upcomingDates.push({ type: 'ism', date: ismNextMonth, label: 'ISM Report' });
  }
  
  // Company: 5th & 20th
  const company5th = new Date(currentYear, currentMonth, 5);
  const company20th = new Date(currentYear, currentMonth, 20);
  const companyNext5th = new Date(currentYear, currentMonth + 1, 5);
  
  if (currentDay <= 5) {
    upcomingDates.push({ type: 'company', date: company5th, label: 'Company Analysis' });
  } else if (currentDay <= 20) {
    upcomingDates.push({ type: 'company', date: company20th, label: 'Company Analysis' });
  } else {
    upcomingDates.push({ type: 'company', date: companyNext5th, label: 'Company Analysis' });
  }
  
  // Crypto: 10th & 25th
  const crypto10th = new Date(currentYear, currentMonth, 10);
  const crypto25th = new Date(currentYear, currentMonth, 25);
  const cryptoNext10th = new Date(currentYear, currentMonth + 1, 10);
  
  if (currentDay <= 10) {
    upcomingDates.push({ type: 'crypto', date: crypto10th, label: 'Crypto Report' });
  } else if (currentDay <= 25) {
    upcomingDates.push({ type: 'crypto', date: crypto25th, label: 'Crypto Report' });
  } else {
    upcomingDates.push({ type: 'crypto', date: cryptoNext10th, label: 'Crypto Report' });
  }
  
  // Sort by date
  return upcomingDates.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function getDaysUntil(date: Date): number {
  return differenceInDays(date, new Date());
}

// ========================================
// COMPONENTS
// ========================================

interface CountdownProps {
  targetDate: Date;
  label: string;
  type: 'ism' | 'company' | 'crypto';
}

function Countdown({ targetDate, label, type }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = targetDate.getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = targetDate.getTime() - Date.now();
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const days = Math.floor(timeLeft / 86400);
  const hours = Math.floor((timeLeft % 86400) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const config = REPORT_CONFIGS.find(c => c.id === type)!;
  const Icon = config.icon;

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${config.gradient} p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="text-xs text-gray-400">
          {format(targetDate, 'MMM d, yyyy')}
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-3">{label}</h3>
      
      <div className="grid grid-cols-4 gap-2">
        {[
          { value: days, label: 'Days' },
          { value: hours, label: 'Hours' },
          { value: minutes, label: 'Min' },
          { value: seconds, label: 'Sec' },
        ].map((item, idx) => (
          <div key={idx} className="text-center">
            <div className="text-2xl font-bold text-white tabular-nums">
              {item.value.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>
      
      {days === 0 && hours < 24 && (
        <div className="mt-4 px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium text-center">
          Coming Today!
        </div>
      )}
    </div>
  );
}

interface ReportCardProps {
  report: Report;
  config: ReportTypeConfig;
  onView: (report: Report) => void;
  onDownload: (report: Report) => void;
}

function ReportCard({ report, config, onView, onDownload }: ReportCardProps) {
  const Icon = config.icon;
  const isPublished = report.status === 'published';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 ${
        isPublished ? 'hover:bg-white/10 transition-colors cursor-pointer' : ''
      }`}
      onClick={() => isPublished && onView(report)}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-white truncate">{report.title}</h3>
            {isPublished && (
              <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium flex-shrink-0">
                Published
              </span>
            )}
            {report.status === 'generating' && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium flex-shrink-0 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating
              </span>
            )}
            {report.status === 'upcoming' && (
              <span className="px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 text-xs font-medium flex-shrink-0">
                Upcoming
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-400 mb-2">{format(report.date, 'MMMM d, yyyy')}</p>
          
          {report.subject && (
            <p className="text-xs text-gray-500 truncate">{report.subject}</p>
          )}
        </div>
        
        {isPublished && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(report);
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              title="View Report"
            >
              <Eye className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(report);
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              title="Download PDF"
            >
              <Download className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function TopSecretDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'all' | 'ism' | 'company' | 'crypto'>('all');

  // Fetch subscription status
  useEffect(() => {
    async function fetchSubscription() {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .rpc('get_top_secret_status', { p_user_id: user.id });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const status = data[0];
          setSubscription({
            status: status.top_secret_status,
            expiresAt: status.top_secret_expires_at ? new Date(status.top_secret_expires_at) : null,
            interval: status.top_secret_interval,
            cancelAtPeriodEnd: status.top_secret_cancel_at_period_end,
          });
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      }
    }
    
    fetchSubscription();
  }, [user]);

  // Fetch reports (mock data for now - replace with actual API call)
  useEffect(() => {
    async function fetchReports() {
      setIsLoading(true);
      
      try {
        // TODO: Replace with actual API call to fetch reports
        // For now, using mock data based on the report schedule
        
        const mockReports: Report[] = [
          {
            id: '1',
            type: 'ism',
            title: 'ISM Manufacturing Report - November 2025',
            date: new Date(2025, 10, 3), // Nov 3
            status: 'published',
            subject: 'Manufacturing PMI at 48.4 - Contraction Continues',
            pdfUrl: '/api/ism/report/nov-2025/pdf',
          },
          {
            id: '2',
            type: 'crypto',
            title: 'Crypto Market Report - December 2025',
            date: new Date(2025, 11, 25), // Dec 25
            status: 'published',
            subject: 'BTC Rally to $95K - Institutional Flows Accelerating',
            pdfUrl: '/api/crypto/report/dec-2025-2/pdf',
          },
          {
            id: '3',
            type: 'company',
            title: 'Company Analysis - Apple (AAPL)',
            date: new Date(2025, 11, 20), // Dec 20
            status: 'published',
            subject: 'Services Growth Offsetting Hardware Weakness',
            pdfUrl: '/api/company/report/aapl-dec-2025/pdf',
          },
        ];
        
        setReports(mockReports);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchReports();
  }, []);

  // Calculate next report dates
  const nextReports = useMemo(() => getNextReportDates(), []);

  // Filter reports by type
  const filteredReports = useMemo(() => {
    if (selectedType === 'all') return reports;
    return reports.filter(r => r.type === selectedType);
  }, [reports, selectedType]);

  // Handle report view
  const handleViewReport = (report: Report) => {
    // Open report viewer modal or navigate to report page
    console.log('View report:', report);
    // TODO: Implement report viewer
  };

  // Handle report download
  const handleDownloadReport = async (report: Report) => {
    if (!report.pdfUrl) return;
    
    try {
      window.open(report.pdfUrl, '_blank');
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[128px]" />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-amber-400" />
              Premium Reports
            </h1>
            <p className="text-gray-400 mt-1">Your institutional-grade market intelligence</p>
          </div>
          
          {/* Subscription Status */}
          {subscription && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    subscription.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm text-gray-400">
                    {subscription.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {subscription.expiresAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    {subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} {format(subscription.expiresAt, 'MMM d, yyyy')}
                  </p>
                )}
              </div>
              <button
                onClick={() => navigate('/app/settings/subscription')}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                title="Manage Subscription"
              >
                <Settings className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          )}
        </motion.div>

        {/* Cancellation Warning */}
        {subscription?.cancelAtPeriodEnd && (
          <motion.div
            variants={itemVariants}
            className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-4"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-400 font-medium">Subscription Ending</p>
              <p className="text-sm text-gray-400">
                Your access will end on {subscription.expiresAt ? format(subscription.expiresAt, 'MMMM d, yyyy') : 'soon'}.
                You'll lose access to all premium reports.
              </p>
            </div>
            <button
              onClick={() => {
                // TODO: Implement reactivation
              }}
              className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors"
            >
              Reactivate
            </button>
          </motion.div>
        )}

        {/* Upcoming Reports - Countdown Section */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Upcoming Reports
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {nextReports.slice(0, 3).map((next, idx) => (
              <Countdown
                key={idx}
                targetDate={next.date}
                label={next.label}
                type={next.type}
              />
            ))}
          </div>
        </motion.div>

        {/* Report Schedule Overview */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-gray-400" />
              Monthly Schedule
            </h2>
            
            <div className="grid md:grid-cols-3 gap-4">
              {REPORT_CONFIGS.map((config) => {
                const Icon = config.icon;
                return (
                  <div
                    key={config.id}
                    className={`p-4 rounded-xl bg-gradient-to-br ${config.gradient} border border-white/5`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-lg ${config.iconBg} flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-medium text-white">{config.shortName}</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">{config.schedule}</p>
                    <p className="text-xs text-gray-500">{config.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Report History */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              Report Archive
            </h2>
            
            {/* Type Filter */}
            <div className="flex items-center gap-2">
              {['all', 'ism', 'company', 'crypto'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedType === type
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No reports available yet</p>
              <p className="text-sm mt-1">Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredReports.map((report) => {
                  const config = REPORT_CONFIGS.find(c => c.id === report.type)!;
                  return (
                    <ReportCard
                      key={report.id}
                      report={report}
                      config={config}
                      onView={handleViewReport}
                      onDownload={handleDownloadReport}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="mt-8 flex items-center justify-center gap-4">
          <a
            href="https://discord.gg/finotaur"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Join Discord</span>
          </a>
          <button
            onClick={() => {
              // TODO: Open notification settings
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span>Notification Settings</span>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}