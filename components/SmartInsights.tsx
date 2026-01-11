
import React, { useState, useEffect } from 'react';
import { Transaction, Ledger } from '../types';
import { GoogleGenAI } from "@google/genai";

interface SmartInsightsProps {
  transactions: Transaction[];
  ledgerName: Ledger;
}

const SmartInsights: React.FC<SmartInsightsProps> = ({ transactions, ledgerName }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generateInsight = async () => {
    if (transactions.length === 0) return;
    
    setLoading(true);
    try {
      // Create a new instance right before the call as per @google/genai guidelines.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analyze these financial transactions for the "${ledgerName}" ledger.
      Ledger Type: ${ledgerName === Ledger.JOINT ? 'Joint Household Account' : 'Personal Account for QWK'}.
      
      The data includes spending categories, amount, and account types.
      Provide 3 concise bullet points of financial advice or patterns.
      If it is a JOINT ledger, focus on household efficiency.
      If it is a PERSONAL ledger, focus on individual spending habits.
      
      Format as clear bullet points.
      Data: ${JSON.stringify(transactions.slice(0, 50))}`;

      // Using gemini-3-pro-preview for complex analytical tasks.
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });

      setInsight(response.text || 'Insights will bloom soon.');
    } catch (err) {
      console.error('Insights Error:', err);
      setInsight('Error connecting to insights. Please check API key.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transactions.length >= 3) {
      generateInsight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerName, transactions]);

  if (transactions.length < 3) {
    return (
      <div className="text-slate-500 text-sm italic py-4 bg-slate-50 border border-slate-100 rounded-xl px-4">
        Add at least 3 transactions to see smart insights for {ledgerName}.
      </div>
    );
  }

  return (
    <div className="relative">
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-100 rounded w-3/4"></div>
          <div className="h-4 bg-slate-100 rounded w-5/6"></div>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
            {insight.split('\n').map((line, i) => (
              <p key={i} className="mb-2 last:mb-0">{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartInsights;
