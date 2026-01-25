// src/components/ai-copilot/ConversationSidebar.tsx
// Sidebar showing conversation history

import React from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  RefreshCw,
  MoreVertical,
  Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Conversation } from '@/hooks/useAICopilot';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewConversation: () => void;
  onRefresh: () => void;
}

export function ConversationSidebar({
  conversations,
  currentId,
  onSelect,
  onDelete,
  onNewConversation,
  onRefresh,
}: ConversationSidebarProps) {
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  
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
  
  // Group conversations by date
  const groupedConversations = groupByDate(conversations);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Conversations</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
        
        <Button
          onClick={onNewConversation}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>
      
      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs">Start a new chat to get started</p>
            </div>
          ) : (
            Object.entries(groupedConversations).map(([group, items]) => (
              <div key={group} className="mb-4">
                <p className="text-xs font-medium text-muted-foreground px-2 mb-2">
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
      </ScrollArea>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Individual conversation item
function ConversationItem({
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
  return (
    <div
      className={cn(
        "group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
        isActive 
          ? "bg-primary/10 text-primary" 
          : "hover:bg-muted"
      )}
      onClick={onSelect}
    >
      <MessageSquare className="h-4 w-4 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {conversation.title || 'New Conversation'}
        </p>
        <p className="text-xs text-muted-foreground">
          {conversation.messages_count} messages
        </p>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="h-4 w-4 mr-2 text-destructive" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Helper to group conversations by date
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
  
  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([_, items]) => items.length > 0)
  );
}
