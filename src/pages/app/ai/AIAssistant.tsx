// src/pages/app/ai/AIAssistant.tsx
// =====================================================
// 🤖 FINOTAUR AI ASSISTANT - Premium Gold Design v2.0
// =====================================================
// Unified design with Stock Analyzer, Options Intelligence & Flow Scanner
// =====================================================

import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';
import { UpgradeGate } from '@/components/access/UpgradeGate';
import { motion } from 'framer-motion';
import { Bot, Plus, History, Sparkles, Menu } from 'lucide-react';
import { ChatInterface } from '@/components/ai-copilot/ChatInterface';
import { ConversationSidebar } from '@/components/ai-copilot/ConversationSidebar';
import { UsageBanner } from '@/components/ai-copilot/UsageBanner';
import { useAICopilot } from '@/hooks/useAICopilot';
import { cn } from '@/lib/utils';

export default function AIAssistant() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationId = searchParams.get('conversation');

  const { canAccessPage, loading: accessLoading } = usePlatformAccess();
  const access = canAccessPage('ai_assistant');
  
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    usage,
    conversations,
    currentConversation,
    sendMessage,
    startNewConversation,
    loadConversation,
    deleteConversation,
    refreshConversations,
    clearError,
  } = useAICopilot(conversationId);
  
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);
  
  // ✅ Early return AFTER all hooks
  if (accessLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A646]" />
      </div>
    );
  }

  if (!access.hasAccess) {
    return (
      <UpgradeGate
        feature="AI Assistant"
        reason={access.reason}
        message={access.message}
        upgradeTarget={access.upgradeTarget}
        upgradeDisplayName={access.upgradeDisplayName}
        upgradePrice={access.upgradePrice}
      />
    );
  }
  
  const handleNewConversation = () => {
    startNewConversation();
    setSearchParams({});
  };
  
  const handleSelectConversation = (id: string) => {
    setSearchParams({ conversation: id });
    setSidebarOpen(false);
  };
  
  const handleSendMessage = async (message: string) => {
    const newConversationId = await sendMessage(message);
    if (newConversationId && !conversationId) {
      setSearchParams({ conversation: newConversationId });
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #0d0b08 50%, #0a0a0a 100%)' }}>
      
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[5%] w-[600px] h-[600px] rounded-full blur-[180px]"
          style={{ background: 'rgba(201,166,70,0.04)' }} />
        <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] rounded-full blur-[160px]"
          style={{ background: 'rgba(201,166,70,0.03)' }} />
      </div>
      
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed left-4 top-20 z-50 lg:hidden w-10 h-10 rounded-xl flex items-center justify-center transition-all"
        style={{
          background: 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))',
          border: '1px solid rgba(201,166,70,0.3)',
        }}
      >
        <History className="h-5 w-5 text-[#C9A646]" />
      </button>
      
      {/* Conversation Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-80 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <ConversationSidebar
          conversations={conversations}
          currentId={currentConversation?.id}
          onSelect={handleSelectConversation}
          onDelete={deleteConversation}
          onNewConversation={handleNewConversation}
          onRefresh={refreshConversations}
        />
      </div>
      
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <header className="relative px-6 py-4"
          style={{
            background: 'linear-gradient(180deg, rgba(13,11,8,0.98), rgba(13,11,8,0.9))',
            borderBottom: '1px solid rgba(201,166,70,0.15)',
          }}>
          {/* Top gold line */}
          <div className="absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(201,166,70,0.5), transparent)' }} />
          
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,166,70,0.2), rgba(201,166,70,0.05))',
                  border: '1px solid rgba(201,166,70,0.3)',
                  boxShadow: '0 4px 20px rgba(201,166,70,0.15)',
                }}>
                <Bot className="h-6 w-6 text-[#C9A646]" />
              </div>
              
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <span className="text-white">FINOTAUR</span>
                  <span style={{
                    background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>AI</span>
                  <Sparkles className="h-4 w-4 text-[#C9A646]" />
                </h1>
                <p className="text-xs text-[#6B6B6B]">
                  {currentConversation?.title || 'New Conversation'}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleNewConversation}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.05))',
                border: '1px solid rgba(201,166,70,0.3)',
                color: '#C9A646',
              }}
            >
              <Plus className="h-4 w-4" />
              New Chat
            </button>
          </div>
        </header>
        
        {/* Usage Banner */}
        {usage && (usage.user_tier === 'FREE' || usage.user_tier === 'BASIC') && (
          <UsageBanner usage={usage} />
        )}
        
        {/* Chat Interface */}
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          isStreaming={isStreaming}
          error={error}
          onSendMessage={handleSendMessage}
          onClearError={clearError}
          limitReached={usage?.limit_reached || false}
          questionsRemaining={usage?.questions_remaining ?? 999}
          userTier={(usage?.user_tier as 'FREE' | 'BASIC' | 'PREMIUM') ?? 'FREE'}
          questionsUsed={usage?.questions_today}
          dailyLimit={usage?.daily_limit}
        />
      </div>
    </div>
  );
}