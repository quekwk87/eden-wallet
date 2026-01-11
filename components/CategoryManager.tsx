
import React, { useState } from 'react';
import { CategoryMap } from '../types';

interface CategoryManagerProps {
  categories: CategoryMap;
  setCategories: React.Dispatch<React.SetStateAction<CategoryMap>>;
  themeColor?: string;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ 
  categories, 
  setCategories, 
  themeColor = 'emerald' 
}) => {
  const [newCategory, setNewCategory] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const addCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    if (categories[newCategory]) {
      alert('Category already exists');
      return;
    }
    setCategories(prev => ({ ...prev, [newCategory.trim()]: [] }));
    setNewCategory('');
  };

  const deleteCategory = (cat: string) => {
    if (window.confirm(`Delete "${cat}" and all its sub-categories?`)) {
      const { [cat]: _, ...rest } = categories;
      setCategories(rest);
      if (selectedCategory === cat) setSelectedCategory(null);
    }
  };

  const addSubCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !newSubCategory.trim()) return;
    if (categories[selectedCategory].includes(newSubCategory.trim())) {
      alert('Sub-category already exists');
      return;
    }
    setCategories(prev => ({
      ...prev,
      [selectedCategory]: [...prev[selectedCategory], newSubCategory.trim()]
    }));
    setNewSubCategory('');
  };

  const deleteSubCategory = (cat: string, sub: string) => {
    setCategories(prev => ({
      ...prev,
      [cat]: prev[cat].filter(s => s !== sub)
    }));
  };

  if (selectedCategory) {
    const subs = categories[selectedCategory] || [];
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => setSelectedCategory(null)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800">{selectedCategory}</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Manage Sub-categories</p>
          </div>
        </div>

        <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <form onSubmit={addSubCategory} className="flex gap-3">
            <input
              type="text"
              value={newSubCategory}
              onChange={(e) => setNewSubCategory(e.target.value)}
              className={`flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 outline-none font-medium`}
              placeholder={`Add sub-category to ${selectedCategory}...`}
              autoFocus
            />
            <button
              type="submit"
              className={`px-6 py-3 bg-${themeColor}-600 text-white font-bold rounded-xl hover:bg-${themeColor}-700 transition-all shadow-md shadow-${themeColor}-100`}
            >
              Add
            </button>
          </form>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {subs.map(sub => (
            <div key={sub} className={`bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-${themeColor}-200 transition-all`}>
              <span className="font-semibold text-slate-700">{sub}</span>
              <button 
                onClick={() => deleteSubCategory(selectedCategory, sub)}
                className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {subs.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 italic">
              No sub-categories defined yet.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
          <span className={`w-2 h-6 bg-${themeColor}-500 rounded-full transition-colors`}></span>
          Create New Category
        </h2>
        <form onSubmit={addCategory} className="flex gap-3">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className={`flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 outline-none font-medium`}
            placeholder="e.g., Household, Subscriptions..."
          />
          <button
            type="submit"
            className={`px-8 py-3 bg-${themeColor}-600 text-white font-bold rounded-xl hover:bg-${themeColor}-700 transition-all shadow-md shadow-${themeColor}-100`}
          >
            Create
          </button>
        </form>
      </section>

      <div className="space-y-4">
        {Object.keys(categories).map((cat) => (
          <div 
            key={cat} 
            className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-lg hover:shadow-slate-200/50 hover:border-${themeColor}-500/30 transition-all cursor-pointer`}
            onClick={() => setSelectedCategory(cat)}
          >
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-${themeColor}-50 group-hover:text-${themeColor}-600 transition-colors`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className={`text-lg font-bold text-slate-800 group-hover:text-${themeColor}-700 transition-colors`}>{cat}</h3>
                  <p className="text-xs font-semibold text-slate-400">{categories[cat].length} Sub-categories</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteCategory(cat); }}
                  className="p-2 text-slate-300 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all sm:opacity-0 group-hover:opacity-100"
                  title="Delete Category"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <div className="text-slate-300 transform group-hover:translate-x-1 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryManager;
