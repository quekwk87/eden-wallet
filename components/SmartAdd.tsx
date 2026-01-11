
import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { AccountType, CategoryMap, Transaction, Ledger, AccountConfig } from '../types';
import TransactionForm from './TransactionForm';

interface SmartAddProps {
  categories: CategoryMap;
  onAdd: (t: Omit<Transaction, 'id'>) => void;
  currentLedger: Ledger;
  accountConfigs: Record<AccountType, AccountConfig>;
}

const SmartAdd: React.FC<SmartAddProps> = ({ categories, onAdd, currentLedger, accountConfigs }) => {
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<Omit<Transaction, 'id'> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const themeColor = currentLedger === Ledger.JOINT ? 'indigo' : 'emerald';

  const parseText = async () => {
    if (!inputText.trim()) return;
    
    setIsParsing(true);
    setError(null);

    try {
      // Create a new instance right before the call as per @google/genai guidelines.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const today = new Date().toISOString().split('T')[0];
      
      const categoryContext = Object.keys(categories).join(', ');
      const subCategoryContext = (Object.entries(categories) as [string, string[]][])
        .map(([cat, subs]) => `${cat}: [${subs.join(', ')}]`)
        .join('; ');

      const accountContext = (Object.entries(accountConfigs) as [AccountType, AccountConfig][])
        .map(([key, config]) => `${key}: "${config.label}"`)
        .join(', ');

      const prompt = `Parse: "${inputText}". 
      Current Workspace: ${currentLedger}. Today: ${today}.
      Available Categories: ${categoryContext}. 
      Sub-categories: ${subCategoryContext}.
      Account Labels: ${accountContext}.
      
      Map to the closest valid values. Amount should be numeric. Use YYYY-MM-DD.`;

      // Using gemini-3-pro-preview for complex natural language reasoning and parsing.
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              spending_category: { type: Type.STRING },
              sub_category: { type: Type.STRING },
              account_type: { type: Type.STRING, enum: Object.values(AccountType) },
              clarification: { type: Type.STRING }
            },
            required: ["date", "amount", "spending_category", "sub_category", "account_type"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      setParsedResult({ ...result, remarks: '' });
      if (result.clarification) setError(`AI Note: ${result.clarification}`);
    } catch (err) {
      console.error('Smart Add Error:', err);
      setError('Failed to parse text. Please try again or use manual entry.');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="e.g., $15 for dinner tonight at hawker centre"
          className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm transition-all"
        />
        <button
          onClick={parseText}
          disabled={isParsing || !inputText.trim()}
          className={`absolute bottom-3 right-3 p-2 bg-${themeColor}-600 text-white rounded-xl shadow-md`}
        >
          {isParsing ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        </button>
      </div>

      {error && <div className="text-[10px] font-bold p-2 bg-blue-50 text-blue-600 rounded-lg">{error}</div>}

      {parsedResult && (
        <div className={`bg-white border-2 border-${themeColor}-100 rounded-2xl p-6 shadow-xl`}>
          <TransactionForm 
            initialData={parsedResult as any} 
            onSubmit={(data) => { onAdd(data); setParsedResult(null); setInputText(''); }}
            onCancel={() => setParsedResult(null)}
            categories={categories}
            themeColor={themeColor}
            accountConfigs={accountConfigs}
            defaultAccountType={AccountType.OWN_EXPENSE}
          />
        </div>
      )}
    </div>
  );
};

export default SmartAdd;
