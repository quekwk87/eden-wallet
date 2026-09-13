
import React, { useEffect, useRef, useState } from 'react';
import type { Chat } from '@google/genai';
import { Ledger, Transaction } from '../types';
import { LEDGER_META } from '../constants';
import { createExpenseChat, sendExpenseMessage, isAiConfigured, ExpenseDataset } from '../services/geminiService';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface AiAnalyzerProps {
  currentLedger: Ledger;
  personalTransactions: Transaction[];
  wifeTransactions: Transaction[];
  jointTransactions: Transaction[];
  themeColor: string;
}

const SUGGESTED_PROMPTS = [
  'What did I spend the most on this month?',
  'How does this month compare to last month?',
  'Where can I realistically cut back?',
  'Any unusual or one-off spending recently?',
];

const AiAnalyzer: React.FC<AiAnalyzerProps> = ({
  currentLedger,
  personalTransactions,
  wifeTransactions,
  jointTransactions,
  themeColor,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const buildDatasets = (): ExpenseDataset[] => [
    { ledger: Ledger.PERSONAL, transactions: personalTransactions },
    { ledger: Ledger.WIFE, transactions: wifeTransactions },
    { ledger: Ledger.JOINT, transactions: jointTransactions },
  ];

  const initChat = () => {
    setError(null);
    setMessages([]);
    try {
      chatRef.current = createExpenseChat(buildDatasets(), LEDGER_META[currentLedger].label);
    } catch (e: any) {
      chatRef.current = null;
      setError(e?.message || 'Could not start the AI analyzer.');
    }
  };

  // Rebuild the chat (fresh data + reset conversation) whenever the AI tab mounts
  // or the user switches ledgers, so the assistant's default focus stays correct.
  useEffect(() => {
    if (isAiConfigured) initChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLedger]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    if (!chatRef.current) {
      initChat();
      if (!chatRef.current) return;
    }
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setLoading(true);
    try {
      const answer = await sendExpenseMessage(chatRef.current, question);
      setMessages(prev => [...prev, { role: 'model', text: answer || "I couldn't work that out — try rephrasing." }]);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong talking to the AI. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAiConfigured) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-2">
        <h3 className="text-lg font-black text-slate-800">AI Analyzer isn't set up yet</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Add a <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">GEMINI_API_KEY</code> to your environment
          to enable natural-language expense queries and AI-powered insights.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] max-h-[820px] bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">AI Expense Analyzer</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            Focused on {LEDGER_META[currentLedger].label} · mention another ledger by name to ask about it
          </p>
        </div>
        <button
          onClick={initChat}
          className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center gap-1 shrink-0"
          title="Refresh data & clear chat"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {messages.length === 0 && !error && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Ask anything about your expenses, or try:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => handleSend(p)}
                  className="text-left text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl px-4 py-3 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === 'user'
                  ? `bg-${themeColor}-600 text-white`
                  : 'bg-slate-50 text-slate-700 border border-slate-100'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-2xl px-4 py-3">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="flex items-center gap-2 px-6 py-4 border-t border-slate-100"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your spending..."
          className={`flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 outline-none text-sm`}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className={`px-5 py-2.5 bg-${themeColor}-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 text-sm shrink-0`}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default AiAnalyzer;
