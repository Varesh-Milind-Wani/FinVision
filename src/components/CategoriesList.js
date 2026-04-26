import React, { useCallback, useMemo } from 'react';
import { useExpenseContext } from '../contexts/ExpenseContext';
import { getRelativeTime } from '../utils/formatUtils';

const hexToRgb = (hex) => {
  const s = String(hex || '').trim();
  const m = s.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
};

const idealTextColor = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'rgba(255,255,255,0.95)';
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.68 ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)';
};

const CategoriesList = () => {
  const { categories, deleteCategory, transactions } = useExpenseContext();

  const statsByCategory = useMemo(() => {
    const map = new Map();
    for (const t of transactions || []) {
      const id = t?.category;
      if (!id) continue;

      const entry = map.get(id) || { count: 0, lastDate: null, lastTs: null };
      entry.count += 1;

      if (typeof t?.date === 'string') {
        const ts = Date.parse(t.date);
        if (Number.isFinite(ts) && (!Number.isFinite(entry.lastTs) || ts > entry.lastTs)) {
          entry.lastTs = ts;
          entry.lastDate = t.date;
        }
      }

      map.set(id, entry);
    }
    return map;
  }, [transactions]);

  const sortedCategories = useMemo(() => {
    return [...(categories || [])].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }, [categories]);

  const inUseCount = useMemo(() => {
    let n = 0;
    for (const c of categories || []) {
      if ((statsByCategory.get(c.id)?.count || 0) > 0) n += 1;
    }
    return n;
  }, [categories, statsByCategory]);

  const handleDeleteCategory = useCallback(
    (categoryId) => {
      const isCategoryInUse = (transactions || []).some((transaction) => transaction.category === categoryId);

      if (isCategoryInUse) {
        alert('Cannot delete this category as it is used by existing transactions.');
        return;
      }

      if (window.confirm('Are you sure you want to delete this category?')) {
        deleteCategory(categoryId);
      }
    },
    [deleteCategory, transactions]
  );

  const totalCount = (categories || []).length;
  const unusedCount = Math.max(0, totalCount - inUseCount);

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Your Categories
          </h2>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {inUseCount} in use {'\u2022'} {unusedCount} unused
          </div>
        </div>
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
          {totalCount} {totalCount === 1 ? 'category' : 'categories'}
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="mt-6 surface p-10 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h6m-6 4h6m-7 7h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
            </svg>
          </div>
          <p className="mt-3 font-display text-lg font-semibold text-slate-900 dark:text-white">No categories yet</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Create a category to start organizing your expenses.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCategories.map((category) => {
            const stats = statsByCategory.get(category.id) || { count: 0, lastDate: null };
            const inUse = (stats.count || 0) > 0;

            const avatarText = category?.name?.substring?.(0, 1)?.toUpperCase?.() || '?';
            const accent = category?.color || '#6366F1';
            const textColor = idealTextColor(accent);
            const last = stats.lastDate ? getRelativeTime(stats.lastDate) : null;

            return (
              <div
                key={category.id}
                className="group relative tile tile-pad backdrop-blur shadow-soft surface-pressable focus-within:ring-2 focus-within:ring-blue-500/40"
              >
                <div className="absolute inset-x-4 -top-px h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center min-w-0">
                    <span
                      aria-hidden="true"
                      className="w-10 h-10 rounded-2xl mr-3 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/[0.10] font-extrabold shadow-sm"
                      style={{ backgroundColor: accent, color: textColor }}
                      title={accent}
                    >
                      {avatarText}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="text-slate-900 dark:text-white font-display font-extrabold truncate">
                          {category.name}
                        </div>
                        <span
                          className={[
                            'inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold ring-1',
                            inUse
                              ? 'bg-emerald-100/80 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/15 dark:text-emerald-100 dark:ring-emerald-300/20'
                              : 'bg-slate-100/70 text-slate-700 ring-black/10 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-white/10',
                          ].join(' ')}
                        >
                          {inUse ? 'In use' : 'Unused'}
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                        {stats.count} transaction{stats.count === 1 ? '' : 's'}
                        {last ? <span className="text-slate-500 dark:text-slate-400">{' \u2022 '}last {last.toLowerCase()}</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(category.id)}
                      disabled={inUse}
                      className={[
                        'p-2 rounded-xl ring-1 ring-black/5 dark:ring-white/[0.10] transition-colors flex-shrink-0',
                        inUse
                          ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-500 bg-transparent'
                          : 'text-slate-500 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 hover:bg-white/60 dark:hover:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-rose-500/30',
                      ].join(' ')}
                      aria-label={`Delete ${category.name} category`}
                      title={inUse ? 'This category is in use by existing transactions.' : 'Delete category'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                    {inUse ? <div className="text-[11px] text-slate-500 dark:text-slate-400">Delete disabled</div> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategoriesList;
