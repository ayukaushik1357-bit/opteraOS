import { useState, useEffect, useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  Sparkles, Send, Plus, Bot, User, ChevronRight, Database, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { aiApi } from '@/lib/api';
import { authStorage } from '@/lib/api/client';

export const Route = createFileRoute('/_authenticated/ai')({
  component: AiAssistantPage,
});

function AiAssistantPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const orgId = authStorage.getOrgId() || 'default';

  const loadConversations = async () => {
    setLoadingConvs(true);
    try {
      const convs = await aiApi.listConversations(orgId);
      setConversations(convs || []);
      if (convs && convs.length > 0 && !activeConvId) {
        setActiveConvId(convs[0].id);
      }
    } catch {
      const demoConvs = [
        { id: 'c1', title: 'Revenue & Inactive Customer Analysis', updatedAt: new Date().toISOString() },
        { id: 'c2', title: 'Overdue Invoices & Auto-Reminders', updatedAt: new Date(Date.now() - 86400000).toISOString() },
      ];
      setConversations(demoConvs);
      setActiveConvId('c1');
    } finally {
      setLoadingConvs(false);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const conv = await aiApi.getConversation(orgId, convId);
      if (conv?.messages) {
        setMessages(conv.messages);
      }
    } catch {
      setMessages([
        {
          id: 'm1',
          role: 'assistant',
          content: `Hello! I'm **optera AI**, your autonomous business assistant.\n\nI have authorized, real-time access to your organization's CRM, deals, invoices, inventory, and tasks.\n\nHow can I assist your business today?`,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = async () => {
    try {
      const conv = await aiApi.createConversation(orgId, 'New Business Chat');
      setConversations([conv, ...conversations]);
      setActiveConvId(conv.id);
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `New session started. Ask me any question about your revenue, customers, inventory, or tell me to perform operations on your behalf.`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      const newId = `c_${Date.now()}`;
      setConversations([{ id: newId, title: 'New Business Chat', updatedAt: new Date().toISOString() }, ...conversations]);
      setActiveConvId(newId);
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `New session started. Ask me any question about your business data.`,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      if (activeConvId) {
        const res = await aiApi.chat(orgId, activeConvId, textToSend);
        if (res?.message) {
          setMessages((prev) => [...prev, res.message]);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "AI service request failed. Please check AI provider configuration.");
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'Why did my revenue decrease this month?',
    'Which products are running low on stock?',
    'Show me overdue invoices and payment status',
    'Summarize top revenue customers',
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden bg-[#F7F9FC] -m-4 sm:-m-6 lg:-m-8">
      {/* Conversations Sidebar */}
      <div className="w-full md:w-72 bg-[#F8FAFC] border-r border-[#E5EAF1] flex flex-col p-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <Bot className="w-4 h-4" />
            </span>
            optera AI
          </div>
          <Button
            size="sm"
            onClick={handleNewChat}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1 h-8 rounded-lg font-medium shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </Button>
        </div>

        <div className="text-xs uppercase font-semibold text-gray-500 mb-2 px-1">Recent Chats</div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveConvId(c.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all ${
                activeConvId === c.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold shadow-xs'
                  : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-900'
              }`}
            >
              <span className="truncate pr-2">{c.title}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
            </button>
          ))}
        </div>

        <div className="pt-3 border-t border-[#E5EAF1] text-[11px] text-gray-500 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-green-600" />
          Connected to Organization DB
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F7F9FC] relative">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div key={m.id} className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto justify-end' : ''}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 shadow-xs mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`p-4 md:p-5 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-xs'
                      : 'bg-white border border-[#E5EAF1] text-gray-800 rounded-tl-none shadow-[0_1px_3px_rgba(0,0,0,0.05)]'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">{m.content}</div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 max-w-xl">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-xl bg-white border border-[#E5EAF1] text-gray-500 text-xs flex items-center gap-2 shadow-xs">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                optera AI is querying business databases and executing tools...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        {messages.length <= 2 && (
          <div className="px-4 md:px-8 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p)}
                className="text-xs px-3.5 py-1.5 rounded-full bg-white border border-[#E5EAF1] text-gray-700 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 transition-all shrink-0 flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3 h-3 text-blue-600" />
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Composer Bar */}
        <div className="p-4 md:p-5 bg-white border-t border-[#E5EAF1]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 max-w-4xl mx-auto"
          >
            <Input
              placeholder="Ask optera AI anything about revenue, customers, tasks, or request an action..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="bg-[#F8FAFC] border-[#E5EAF1] text-gray-900 placeholder:text-gray-400 py-5 px-4 rounded-xl text-xs"
            />
            <Button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white h-10 w-10 rounded-xl p-0 shrink-0 shadow-sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <div className="text-[11px] text-center text-gray-400 mt-2">
            optera AI queries live PostgreSQL records securely under your organization's tenant permissions.
          </div>
        </div>
      </div>
    </div>
  );
}
