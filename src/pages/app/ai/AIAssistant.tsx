// src/pages/app/ai/AIAssistant.tsx
// FINOTAUR AI Copilot - Main Chat Page

import React, { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot, Plus, History, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInterface } from '@/components/ai-copilot/ChatInterface';
import { ConversationSidebar } from '@/components/ai-copilot/ConversationSidebar';
import { UsageBanner } from '@/components/ai-copilot/UsageBanner';
import { useAICopilot } from '@/hooks/useAICopilot';
import { cn } from '@/lib/utils';

export default function AIAssistant() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationId = searchParams.get('conversation');
  
  const {
    // State
    messages,
    isLoading,
    isStreaming,
    error,
    usage,
    conversations,
    currentConversation,
    
    // Actions
    sendMessage,
    startNewConversation,
    loadConversation,
    deleteConversation,
    refreshConversations,
    clearError,
  } = useAICopilot(conversationId);
  
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  
  // Load conversation from URL
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);
  
  // Handle new conversation
  const handleNewConversation = () => {
    startNewConversation();
    setSearchParams({});
  };
  
  // Handle conversation select
  const handleSelectConversation = (id: string) => {
    setSearchParams({ conversation: id });
    setSidebarOpen(false);
  };
  
  // Handle send message
  const handleSendMessage = async (message: string) => {
    const newConversationId = await sendMessage(message);
    
    // Update URL if new conversation was created
    if (newConversationId && !conversationId) {
      setSearchParams({ conversation: newConversationId });
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Mobile Sidebar Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-20 z-50 lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <History className="h-5 w-5" />
      </Button>
      
      {/* Conversation Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 transform bg-card border-r transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0",
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
      
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b bg-card/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                FINOTAUR AI
                <Sparkles className="h-4 w-4 text-yellow-500" />
              </h1>
              <p className="text-xs text-muted-foreground">
                {currentConversation?.title || 'New Conversation'}
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewConversation}
            className="hidden sm:flex"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </header>
        
        {/* Usage Banner (for free/basic users) */}
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
          disabled={usage?.limit_reached}
        />
      </div>
    </div>
  );
}