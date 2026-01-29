// =====================================================
// FINOTAUR WAR ZONE - Active Subscriber View v2.0
// 
// 🔥 OPTIMIZATIONS:
// - Uses centralized useWarZoneData hook
// - All components memoized
// - External CSS classes
// - Minimal re-renders
// 
// ✅ SAME UI - Just optimized!
// =====================================================

import { memo, useCallback } from 'react';
import { FileText, Calendar, Clock, Loader2, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';

import { 
  ParticleBackground, 
  DiscordIcon, 
  FireGlow,
  AmbientGlow,
} from './VisualComponents';

import {
  CONFIG,
  ReportCard,
  CountdownDisplay,
  TestReportCard,
  CommunityCards,
  formatReportDate,
  formatReportTime,
} from './WarzonelandingComponents';

import { useWarZoneData, type DailyReport, type WeeklyReport } from '@/hooks/useWarZoneData';

// Import CSS
import '@/styles/warzone.css';

// ============================================
// TYPES
// ============================================

interface ActiveSubscriberViewProps {
  onCancelClick: () => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

export const ActiveSubscriberView = memo(function ActiveSubscriberView({ 
  onCancelClick 
}: ActiveSubscriberViewProps) {
  
  // 🔥 OPTIMIZED: Single hook for all data
  const {
    currentDailyReport,
    previousDailyReport,
    currentWeeklyReport,
    previousWeeklyReport,
    testDailyReport,
    isTester,
    isInTrial,
    trialDaysRemaining,
    isBeforeDailyReportTime,
    isBeforeWeeklyReportTime,
    dailyCountdown,
    weeklyCountdown,
    isLoading,
    refetch,
    downloadReport,
  } = useWarZoneData();

  // Download handlers
  const handleDailyDownload = useCallback(() => {
    if (currentDailyReport) downloadReport(currentDailyReport, 'daily');
  }, [currentDailyReport, downloadReport]);

  const handleWeeklyDownload = useCallback(() => {
    if (currentWeeklyReport) downloadReport(currentWeeklyReport, 'weekly');
  }, [currentWeeklyReport, downloadReport]);

  const handlePreviousDailyDownload = useCallback(() => {
    if (previousDailyReport) downloadReport(previousDailyReport, 'daily');
  }, [previousDailyReport, downloadReport]);

  const handlePreviousWeeklyDownload = useCallback(() => {
    if (previousWeeklyReport) downloadReport(previousWeeklyReport, 'weekly');
  }, [previousWeeklyReport, downloadReport]);

  const handleTestDownload = useCallback(() => {
    if (testDailyReport) downloadReport(testDailyReport, 'daily');
  }, [testDailyReport, downloadReport]);

  return (
    <div className="min-h-screen bg-warzone relative overflow-hidden">
      
      {/* Trial Banner */}
      {isInTrial && trialDaysRemaining !== null && (
        <div className="relative z-50 trial-banner px-4 py-3 text-center">
          <p className="text-[#C9A646] text-sm font-semibold flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            Free trial ends in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative">
        {/* Ambient Glow */}
        <AmbientGlow position="left" size={800} opacity={0.35} />
        
        {/* Particles */}
        <ParticleBackground count={60} />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-12 pb-8">
          
          {/* Header with Bull */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 mb-12 min-h-[400px] lg:min-h-[500px]">
            
            {/* Left: Text Content */}
            <div className="text-center lg:text-left lg:flex-1 lg:max-w-xl">
              <h1 className="font-bold leading-[1.05] tracking-tight mb-6">
                <span className="text-3xl md:text-4xl lg:text-5xl text-white block heading-serif italic mb-2">
                  Welcome to the
                </span>
                <span className="text-5xl md:text-6xl lg:text-7xl block gradient-gold-text font-bold tracking-tight">
                  WAR ZONE
                </span>
              </h1>
              
              <p className="text-[#9A9080] text-sm md:text-base leading-relaxed max-w-md mb-8">
                The same market intelligence that hedge funds pay
                <span className="text-[#C9A646] font-medium"> $2,000+/month </span>
                for — now available for serious traders who want an edge.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                {/* Daily Report Button */}
                {currentDailyReport ? (
                  <button
                    onClick={handleDailyDownload}
                    disabled={isLoading}
                    className="group px-6 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 btn-gold"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <FileText className="w-5 h-5" />
                        Open Today's Report
                      </>
                    )}
                  </button>
                ) : (
                  <CountdownDisplay
                    title="Today's Report Coming Soon"
                    subtitle="Available at 9:00 AM ET"
                    countdown={dailyCountdown}
                  />
                )}
                
                {/* Weekly Report Button */}
                {currentWeeklyReport ? (
                  <button
                    onClick={handleWeeklyDownload}
                    disabled={isLoading}
                    className="group px-6 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 btn-gold"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Calendar className="w-5 h-5" />
                        View Weekly Review
                      </>
                    )}
                  </button>
                ) : (
                  <CountdownDisplay
                    title="Weekly Review Coming Soon"
                    subtitle="Available Sunday 10:00 AM ET"
                    countdown={weeklyCountdown}
                  />
                )}
              </div>

              {/* Report Schedule Info */}
              <p className="text-[#C9A646]/60 text-sm flex items-center gap-2 justify-center lg:justify-start">
                <Clock className="w-4 h-4 text-[#C9A646]" />
                New report every trading day • 9:10 AM ET • Bookmark this page
              </p>
            </div>

            {/* Right: Bull Image */}
            <div className="relative flex-shrink-0 lg:flex-1 flex justify-center lg:justify-end -mr-8 lg:-mr-16">
              <div className="relative z-10 overflow-hidden bull-mask">
                <img 
                  src={CONFIG.BULL_IMAGE} 
                  alt="War Zone Bull" 
                  className="w-[500px] md:w-[600px] lg:w-[700px] h-auto glow-fire"
                  style={{ 
                    mixBlendMode: 'lighten',
                    marginTop: '-22%',
                    marginBottom: '-45%',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Previous Reports Section */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="heading-serif text-xl text-[#E8DCC4]/80 italic">Previous Reports</h3>
              <p className="text-[#C9A646]/50 text-sm">Always available for download</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ReportCard
                report={previousDailyReport}
                type="daily"
                isLoading={isLoading}
                onDownload={handlePreviousDailyDownload}
              />
              <ReportCard
                report={previousWeeklyReport}
                type="weekly"
                isLoading={isLoading}
                onDownload={handlePreviousWeeklyDownload}
              />
            </div>
          </div>

          {/* Test Report - Tester Only */}
          {isTester && testDailyReport && (
            <TestReportCard 
              testDailyReport={testDailyReport}
              onDownload={handleTestDownload}
              onPublishSuccess={refetch}
            />
          )}

          {/* Intel Message */}
          <p className="text-center text-[#C9A646]/60 text-lg heading-serif italic mb-10">
            Stay sharp. stay informed. Here's your intel for today.
          </p>

          {/* Community Cards */}
          <CommunityCards />
        </div>

        {/* Bottom Fire Glow */}
        <FireGlow />
      </div>
    </div>
  );
});

export default ActiveSubscriberView;