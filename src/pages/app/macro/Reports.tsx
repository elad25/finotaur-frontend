'use client';

import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Briefcase, 
  Building2, 
  Users, 
  DollarSign, 
  Factory, 
  BarChart3,
  FileText,
  Sparkles,
  ExternalLink,
  Calendar,
  ChevronDown,
  Zap,
  ArrowUpRight,
  FileDown,
  Globe
} from 'lucide-react';

// Helper function to get month name
const getMonthName = (monthIndex: number): string => {
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  return months[monthIndex];
};

const getMonthNameCapitalized = (monthIndex: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex];
};

// Helper function to get previous month (for reports that release after month end)
const getPreviousMonth = (): { month: string; monthCap: string; year: number } => {
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return { 
    month: getMonthName(prevMonth), 
    monthCap: getMonthNameCapitalized(prevMonth),
    year 
  };
};

// Report type definition
interface Report {
  id: string;
  title: string;
  shortTitle: string;
  icon: React.ElementType;
  description: string;
  frequency: string;
  source: string;
  sourceUrl: string;
  importance: 'Critical' | 'High' | 'Very High';
  subIndicators: string[];
  color: string;
  gradient: string;
}

const REPORTS: Report[] = [
  {
    id: 'ism-manufacturing',
    title: 'ISM Manufacturing PMI',
    shortTitle: 'ISM Mfg',
    icon: Factory,
    description: 'Leading indicator for manufacturing sector health with 12 sub-indices covering orders, employment, inventories, and supply chain dynamics.',
    frequency: 'Monthly (1st business day)',
    source: 'Institute for Supply Management',
    sourceUrl: 'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/',
    importance: 'Critical',
    subIndicators: ['New Orders', 'Production', 'Employment', 'Supplier Deliveries', 'Inventories', 'Prices', 'Backlog of Orders', 'New Export Orders', 'Imports'],
    color: '#3B82F6',
    gradient: 'from-blue-500/20 to-blue-600/5'
  },
  {
    id: 'ism-services',
    title: 'ISM Services PMI',
    shortTitle: 'ISM Svc',
    icon: Briefcase,
    description: 'Covers 70% of the US economy. Critical gauge of service sector activity including business conditions and employment trends.',
    frequency: 'Monthly (3rd business day)',
    source: 'Institute for Supply Management',
    sourceUrl: 'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/',
    importance: 'Critical',
    subIndicators: ['Business Activity', 'New Orders', 'Employment', 'Prices Paid', 'Backlogs', 'Supplier Deliveries', 'Inventory Change', 'New Export Orders'],
    color: '#8B5CF6',
    gradient: 'from-violet-500/20 to-violet-600/5'
  },
  {
    id: 'fomc',
    title: 'FOMC Statement & Minutes',
    shortTitle: 'FOMC',
    icon: Building2,
    description: 'The most market-moving release. Contains policy decisions, economic projections, and detailed deliberations on monetary policy.',
    frequency: '8 meetings/year + Minutes',
    source: 'Federal Reserve',
    sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
    importance: 'Critical',
    subIndicators: ['Rate Decision', 'Dot Plot', 'Economic Projections', 'Balance Sheet Policy', 'Hawkish/Dovish Shifts', 'Risk Assessment', 'Dissent Votes', 'Forward Guidance'],
    color: '#10B981',
    gradient: 'from-emerald-500/20 to-emerald-600/5'
  },
  {
    id: 'nfp',
    title: 'Employment Situation (NFP)',
    shortTitle: 'NFP',
    icon: Users,
    description: 'Far more than just a headline number. Full breakdown of labor market dynamics, wages, and sector employment trends.',
    frequency: 'Monthly (1st Friday)',
    source: 'Bureau of Labor Statistics',
    sourceUrl: 'https://www.bls.gov/ces/',
    importance: 'Critical',
    subIndicators: ['Nonfarm Payrolls', 'Unemployment Rate', 'Participation Rate', 'U-6 Rate', 'Average Hourly Earnings', 'Average Weekly Hours', 'Revisions', 'Sector Breakdown'],
    color: '#F59E0B',
    gradient: 'from-amber-500/20 to-amber-600/5'
  },
  {
    id: 'cpi',
    title: 'Consumer Price Index (CPI)',
    shortTitle: 'CPI',
    icon: DollarSign,
    description: 'The inflation benchmark. Full BLS release includes granular breakdown of price changes across all consumer categories.',
    frequency: 'Monthly (2nd week)',
    source: 'Bureau of Labor Statistics',
    sourceUrl: 'https://www.bls.gov/cpi/',
    importance: 'Critical',
    subIndicators: ['Headline CPI', 'Core CPI', 'Shelter', 'Energy', 'Food', 'Services ex-Shelter', 'Used Cars', 'Medical Care', 'Transportation'],
    color: '#EF4444',
    gradient: 'from-red-500/20 to-red-600/5'
  },
  {
    id: 'ppi',
    title: 'Producer Price Index (PPI)',
    shortTitle: 'PPI',
    icon: TrendingUp,
    description: 'Leading indicator for consumer inflation. Tracks price changes at the producer level across goods and services.',
    frequency: 'Monthly (2nd week)',
    source: 'Bureau of Labor Statistics',
    sourceUrl: 'https://www.bls.gov/ppi/',
    importance: 'Very High',
    subIndicators: ['Final Demand', 'Intermediate Demand', 'Core PPI', 'Goods', 'Services', 'Construction', 'Trade Margins', 'Transportation'],
    color: '#06B6D4',
    gradient: 'from-cyan-500/20 to-cyan-600/5'
  },
  {
    id: 'gdp',
    title: 'GDP Report (BEA)',
    shortTitle: 'GDP',
    icon: BarChart3,
    description: 'Comprehensive economic output measure. Full report breaks down contributions from consumption, investment, trade, and government.',
    frequency: 'Quarterly (Advance/Second/Final)',
    source: 'Bureau of Economic Analysis',
    sourceUrl: 'https://www.bea.gov/data/gdp/gross-domestic-product',
    importance: 'Very High',
    subIndicators: ['Real GDP', 'Consumer Spending', 'Fixed Investment', 'Inventories', 'Net Exports', 'Government Spending', 'PCE Prices', 'GDP Deflator'],
    color: '#EC4899',
    gradient: 'from-pink-500/20 to-pink-600/5'
  }
];

// Dynamic URL generator based on report type
const getReportUrls = (reportId: string): { pageUrl: string; pdfUrl: string; htmlUrl: string } => {
  const { month } = getPreviousMonth();
  
  switch (reportId) {
    case 'ism-manufacturing':
      return {
        pageUrl: `https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/pmi/${month}/`,
        pdfUrl: `https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/pmi/${month}/`,
        htmlUrl: `https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/pmi/${month}/`
      };
    case 'ism-services':
      return {
        pageUrl: `https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/services/${month}/`,
        pdfUrl: `https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/services/${month}/`,
        htmlUrl: `https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/services/${month}/`
      };
    case 'fomc':
      return {
        pageUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
        pdfUrl: 'https://www.federalreserve.gov/monetarypolicy/files/fomcminutes20251029.pdf',
        htmlUrl: 'https://www.federalreserve.gov/monetarypolicy/fomcminutes20251029.htm'
      };
    case 'nfp':
      return {
        pageUrl: 'https://www.bls.gov/news.release/empsit.nr0.htm',
        pdfUrl: 'https://www.bls.gov/news.release/pdf/empsit.pdf',
        htmlUrl: 'https://www.bls.gov/news.release/empsit.nr0.htm'
      };
    case 'cpi':
      return {
        pageUrl: 'https://www.bls.gov/news.release/cpi.nr0.htm',
        pdfUrl: 'https://www.bls.gov/news.release/pdf/cpi.pdf',
        htmlUrl: 'https://www.bls.gov/news.release/cpi.nr0.htm'
      };
    case 'ppi':
      return {
        pageUrl: 'https://www.bls.gov/news.release/ppi.nr0.htm',
        pdfUrl: 'https://www.bls.gov/news.release/pdf/ppi.pdf',
        htmlUrl: 'https://www.bls.gov/news.release/ppi.nr0.htm'
      };
    case 'gdp':
      return {
        pageUrl: 'https://www.bea.gov/data/gdp/gross-domestic-product',
        pdfUrl: 'https://www.bea.gov/sites/default/files/2025-09/gdp2q25-3rd.pdf',
        htmlUrl: 'https://www.bea.gov/news/2025/gross-domestic-product-second-quarter-2025-third-estimate'
      };
    default:
      return { pageUrl: '', pdfUrl: '', htmlUrl: '' };
  }
};

export default function MacroReports() {
  const [activeReport, setActiveReport] = useState<string>('ism-manufacturing');
  
  const currentReport = REPORTS.find(r => r.id === activeReport)!;
  const { monthCap, year } = getPreviousMonth();
  
  const reportUrls = useMemo(() => getReportUrls(activeReport), [activeReport]);

  return (
    <div className="min-h-screen bg-[#080B0F]">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/[0.03] rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-[1400px] mx-auto px-6 py-8 space-y-6">
        
        {/* 1. Report Selection Tabs */}
        <div className="bg-[#0D1117]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-2">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {REPORTS.map((report) => {
              const Icon = report.icon;
              const isActive = activeReport === report.id;
              
              return (
                <button
                  key={report.id}
                  onClick={() => setActiveReport(report.id)}
                  className={`
                    group relative flex items-center gap-2.5 px-5 py-3.5 rounded-xl
                    font-medium text-sm whitespace-nowrap transition-all duration-300 flex-1
                    ${isActive 
                      ? 'text-white' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
                    }
                  `}
                >
                  {isActive && (
                    <div 
                      className="absolute inset-0 rounded-xl transition-all duration-300"
                      style={{
                        background: `linear-gradient(135deg, ${report.color}25, ${report.color}08)`,
                        boxShadow: `0 0 30px ${report.color}20, inset 0 1px 0 ${report.color}30`
                      }}
                    />
                  )}
                  
                  <div 
                    className={`relative z-10 p-2 rounded-lg transition-all duration-300 ${
                      isActive ? 'bg-white/10' : 'bg-white/[0.03] group-hover:bg-white/[0.06]'
                    }`}
                    style={isActive ? { color: report.color } : {}}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  <span className="relative z-10">{report.shortTitle}</span>
                  
                  {isActive && (
                    <div 
                      className="relative z-10 w-2 h-2 rounded-full animate-pulse ml-auto"
                      style={{ backgroundColor: report.color }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Report Header Card - Full Width */}
        <div className="relative overflow-hidden">
          <div 
            className={`absolute inset-0 bg-gradient-to-br ${currentReport.gradient} rounded-2xl`}
          />
          <div className="absolute inset-0 bg-[#0D1117]/70 backdrop-blur-sm rounded-2xl" />
          
          <div 
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-30"
            style={{ background: `radial-gradient(circle, ${currentReport.color}50, transparent)` }}
          />
          
          <div className="relative border border-white/[0.06] rounded-2xl p-8">
            <div className="flex items-start gap-6">
              <div 
                className="p-5 rounded-2xl bg-white/[0.05] border border-white/[0.08]"
                style={{ boxShadow: `0 0 50px ${currentReport.color}20` }}
              >
                <currentReport.icon 
                  className="w-10 h-10" 
                  style={{ color: currentReport.color }}
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <h1 className="text-3xl font-bold text-white">
                    {currentReport.title}
                  </h1>
                  <span 
                    className={`
                      px-3 py-1.5 text-xs font-bold rounded-full uppercase tracking-wide
                      ${currentReport.importance === 'Critical' 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }
                    `}
                  >
                    {currentReport.importance}
                  </span>
                </div>
                
                <p className="text-gray-400 text-base leading-relaxed mb-6 max-w-3xl">
                  {currentReport.description}
                </p>

                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/[0.03]">
                      <Calendar className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Frequency</p>
                      <p className="text-sm text-gray-300">{currentReport.frequency}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/[0.03]">
                      <Building2 className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Source</p>
                      <p className="text-sm text-gray-300">{currentReport.source}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Key Indicators - Full Width */}
        <div className="bg-[#0D1117]/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5" style={{ color: currentReport.color }} />
            <h3 className="text-lg font-semibold text-white">Key Indicators</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentReport.subIndicators.map((indicator, idx) => (
              <span 
                key={idx}
                className="px-4 py-2 text-sm font-medium text-gray-300 
                           bg-white/[0.04] border border-white/[0.06] rounded-xl
                           hover:bg-white/[0.08] hover:border-white/[0.1] transition-colors cursor-default"
              >
                {indicator}
              </span>
            ))}
          </div>
        </div>

        {/* 4. AI Analysis - Full Width */}
        <div className="relative overflow-hidden">
          <div 
            className="absolute inset-0 rounded-2xl opacity-40 blur-2xl"
            style={{ background: `linear-gradient(135deg, ${currentReport.color}15, transparent)` }}
          />
          <div className="relative bg-[#0D1117]/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div 
                  className="p-2.5 rounded-xl"
                  style={{ backgroundColor: `${currentReport.color}20` }}
                >
                  <Sparkles className="w-5 h-5" style={{ color: currentReport.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">AI Analysis</h3>
                  <p className="text-xs text-gray-500">Powered by Finotaur Intelligence</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold 
                              text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </div>
            </div>
            
            <div className="p-8">
              <div className="flex flex-col items-center justify-center text-center py-12">
                <div 
                  className="p-5 rounded-2xl border border-white/[0.04] mb-5"
                  style={{ 
                    backgroundColor: `${currentReport.color}10`,
                    boxShadow: `0 0 50px ${currentReport.color}20` 
                  }}
                >
                  <Sparkles className="w-12 h-12" style={{ color: currentReport.color }} />
                </div>
                <h4 className="text-xl font-semibold text-gray-300 mb-2">
                  AI-Powered Insights
                </h4>
                <p className="text-sm text-gray-500 max-w-lg mb-8">
                  Comprehensive analysis, key takeaways, and market implications generated by our AI engine
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl">
                  {[
                    { label: 'Executive Summary', icon: FileText },
                    { label: 'Key Changes', icon: TrendingUp },
                    { label: 'Market Impact', icon: BarChart3 },
                    { label: 'Historical Context', icon: Calendar }
                  ].map((section, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-3 px-4 py-3 
                                 bg-white/[0.02] border border-white/[0.06] rounded-xl
                                 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer"
                    >
                      <section.icon className="w-4 h-4" style={{ color: currentReport.color }} />
                      <span className="text-sm text-gray-400">{section.label}</span>
                      <ChevronDown className="w-4 h-4 text-gray-600 ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Original Report - Card with Links */}
        <div className="bg-[#0D1117]/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/[0.05]">
                <FileText className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">Original Report</h3>
                <p className="text-xs text-gray-500">Official {currentReport.source} Document</p>
              </div>
            </div>
            {/* Month indicator for ISM */}
            {(activeReport === 'ism-manufacturing' || activeReport === 'ism-services') && (
              <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-white/[0.05] text-gray-300 border border-white/[0.1]">
                {monthCap} {year} Report
              </span>
            )}
          </div>
          
          {/* Report Access Card */}
          <div className="p-8">
            <div 
              className="relative overflow-hidden rounded-2xl border border-white/[0.08] p-8"
              style={{ 
                background: `linear-gradient(135deg, ${currentReport.color}08, transparent)` 
              }}
            >
              {/* Decorative background */}
              <div 
                className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20"
                style={{ background: currentReport.color }}
              />
              
              <div className="relative flex flex-col items-center text-center">
                {/* Icon */}
                <div 
                  className="p-6 rounded-2xl mb-6"
                  style={{ 
                    backgroundColor: `${currentReport.color}15`,
                    boxShadow: `0 0 60px ${currentReport.color}20`
                  }}
                >
                  <currentReport.icon className="w-16 h-16" style={{ color: currentReport.color }} />
                </div>

                {/* Title */}
                <h4 className="text-2xl font-bold text-white mb-2">
                  {currentReport.title}
                </h4>
                <p className="text-gray-400 mb-8 max-w-md">
                  View the full official report from {currentReport.source}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {/* Primary - View Report */}
                  <a
                    href={reportUrls.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-white transition-all hover:scale-105"
                    style={{ 
                      background: `linear-gradient(135deg, ${currentReport.color}, ${currentReport.color}CC)`,
                      boxShadow: `0 4px 20px ${currentReport.color}40`
                    }}
                  >
                    <Globe className="w-5 h-5" />
                    View Full Report
                    <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>

                  {/* Secondary - Download PDF (if different from page) */}
                  {reportUrls.pdfUrl !== reportUrls.pageUrl && (
                    <a
                      href={reportUrls.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 px-6 py-4 rounded-xl font-medium 
                                 text-gray-300 bg-white/[0.05] border border-white/[0.1]
                                 hover:bg-white/[0.1] hover:border-white/[0.2] transition-all"
                    >
                      <FileDown className="w-5 h-5" />
                      Download PDF
                      <ExternalLink className="w-4 h-4 opacity-50" />
                    </a>
                  )}

                  {/* Tertiary - HTML Version (if different) */}
                  {reportUrls.htmlUrl !== reportUrls.pageUrl && reportUrls.htmlUrl !== reportUrls.pdfUrl && (
                    <a
                      href={reportUrls.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 
                                 hover:text-gray-200 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      HTML Version
                    </a>
                  )}
                </div>

                {/* URL Preview */}
                <div className="mt-8 pt-6 border-t border-white/[0.06] w-full max-w-xl">
                  <p className="text-xs text-gray-500 mb-2">Report URL:</p>
                  <code className="text-xs text-gray-400 bg-white/[0.03] px-3 py-2 rounded-lg block truncate">
                    {reportUrls.pageUrl}
                  </code>
                </div>
              </div>
            </div>


          </div>
        </div>

      </div>
    </div>
  );
}