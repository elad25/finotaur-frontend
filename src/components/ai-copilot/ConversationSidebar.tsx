// src/components/ai-copilot/ConversationSidebar.tsx
// =====================================================
// 📚 CONVERSATION SIDEBAR - Premium Gold Design v2.0
// =====================================================

import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, MessageSquare, Trash2, RefreshCw, MoreVertical, X, Bot
} from 'lucide-react';
import { Conversation } from '@/hooks/useAICopilot';
import { cn } from '@/lib/utils';

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewConversation: () => void;
  onRefresh: () => void;
}

export const ConversationSidebar = memo(function ConversationSidebar({
  conversations,
  currentId,
  onSelect,
  onDelete,
  onNewConversation,
  onRefresh,
}: ConversationSidebarProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };
  
  const groupedConversations = groupByDate(conversations);

  return (
    <div className="flex flex-col h-full"
      style={{
        background: 'linear-gradient(180deg, #0d0b08 0%, #0a0a0a 100%)',
        borderRight: '1px solid rgba(201,166,70,0.15)',
      }}>
      
      {/* Header */}
      <div className="p-5 border-b"
        style={{ borderColor: 'rgba(201,166,70,0.15)' }}>
        
        {/* Logo */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.2), rgba(201,166,70,0.05))',
              border: '1px solid rgba(201,166,70,0.3)',
            }}>
            <Bot className="h-5 w-5 text-[#C9A646]" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Conversations</h2>
            <p className="text-xs text-[#6B6B6B]">{conversations.length} chats</p>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="ml-auto p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RefreshCw className={cn(
              "h-4 w-4 text-[#6B6B6B] hover:text-[#C9A646] transition-colors",
              isRefreshing && "animate-spin text-[#C9A646]"
            )} />
          </button>
        </div>
        
        {/* New Conversation Button */}
        <button
          onClick={onNewConversation}
          className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
            color: '#000',
            boxShadow: '0 4px 20px rgba(201,166,70,0.3)',
          }}
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </button>
      </div>
      
      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin' }}>
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.1), rgba(201,166,70,0.02))',
                border: '1px solid rgba(201,166,70,0.15)',
              }}>
              <MessageSquare className="h-8 w-8 text-[#C9A646]/50" />
            </div>
            <p className="text-sm text-[#8B8B8B]">No conversations yet</p>
            <p className="text-xs text-[#6B6B6B] mt-1">Start a new chat to get started</p>
          </div>
        ) : (
          Object.entries(groupedConversations).map(([group, items]) => (
            <div key={group} className="mb-5">
              <p className="text-[10px] font-semibold text-[#6B6B6B] uppercase tracking-wider px-3 mb-2">
                {group}
              </p>
              <div className="space-y-1">
                {items.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={conversation.id === currentId}
                    onSelect={() => onSelect(conversation.id)}
                    onDelete={() => setDeleteId(conversation.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <DeleteModal
            onConfirm={handleDelete}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

// =====================================================
// Conversation Item
// =====================================================

const ConversationItem = memo(function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
        isActive && "scale-[1.02]"
      )}
      style={{
        background: isActive 
          ? 'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.05))'
          : 'transparent',
        border: isActive 
          ? '1px solid rgba(201,166,70,0.3)'
          : '1px solid transparent',
      }}
      onMouseEnter={() => !isActive && undefined}
    >
      {/* Icon */}
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
      )}
        style={{
          background: isActive 
            ? 'rgba(201,166,70,0.2)' 
            : 'rgba(255,255,255,0.03)',
          border: `1px solid ${isActive ? 'rgba(201,166,70,0.3)' : 'rgba(255,255,255,0.05)'}`,
        }}>
        <MessageSquare className={cn(
          "h-4 w-4 transition-colors",
          isActive ? "text-[#C9A646]" : "text-[#6B6B6B] group-hover:text-[#8B8B8B]"
        )} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate transition-colors",
          isActive ? "text-[#C9A646]" : "text-white group-hover:text-white"
        )}>
          {conversation.title || 'New Conversation'}
        </p>
        <p className="text-[10px] text-[#6B6B6B]">
          {conversation.messages_count} messages
        </p>
      </div>
      
      {/* Menu Button */}
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className={cn(
            "p-1.5 rounded-lg transition-all",
            showMenu 
              ? "bg-white/10 opacity-100" 
              : "opacity-0 group-hover:opacity-100 hover:bg-white/5"
          )}
        >
          <MoreVertical className="h-4 w-4 text-[#6B6B6B]" />
        </button>
        
        {/* Dropdown Menu */}
        <AnimatePresence>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 z-50 py-1 rounded-xl overflow-hidden min-w-[140px]"
                style={{
                  background: 'linear-gradient(135deg, rgba(21,18,16,0.98), rgba(13,11,8,0.98))',
                  border: '1px solid rgba(201,166,70,0.2)',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
                  className="w-full px-4 py-2.5 flex items-center gap-2 text-sm text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

// =====================================================
// Delete Modal
// =====================================================

const DeleteModal = memo(function DeleteModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm p-6 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(21,18,16,0.98), rgba(13,11,8,0.98))',
          border: '1px solid rgba(239,68,68,0.3)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.15)' }}>
            <Trash2 className="h-5 w-5 text-[#EF4444]" />
          </div>
          <h3 className="text-lg font-semibold text-white">Delete Conversation</h3>
        </div>
        
        <p className="text-sm text-[#8B8B8B] mb-6">
          Are you sure you want to delete this conversation? This action cannot be undone.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-[#8B8B8B] transition-colors hover:text-white"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-white transition-all hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              boxShadow: '0 4px 20px rgba(239,68,68,0.3)',
            }}
          >
            Delete
          </button>
        </div>
      </motion.div>
    </>
  );
});

// =====================================================
// Helper - Group by Date
// =====================================================

function groupByDate(conversations: Conversation[]) {
  const groups: Record<string, Conversation[]> = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'This Month': [],
    'Older': [],
  };
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const monthAgo = new Date(today.getTime() - 30 * 86400000);
  
  for (const conv of conversations) {
    const date = new Date(conv.updated_at);
    
    if (date >= today) {
      groups['Today'].push(conv);
    } else if (date >= yesterday) {
      groups['Yesterday'].push(conv);
    } else if (date >= weekAgo) {
      groups['This Week'].push(conv);
    } else if (date >= monthAgo) {
      groups['This Month'].push(conv);
    } else {
      groups['Older'].push(conv);
    }
  }
  
  return Object.fromEntries(
    Object.entries(groups).filter(([_, items]) => items.length > 0)
  );
}

export default ConversationSidebar;