import React, { useMemo, useState } from 'react';
import { useExpenseContext } from '../contexts/ExpenseContext';

const CategoryForm = ({ onClose, className = '' }) => {
  const { addCategory, categories } = useExpenseContext();
  const presetColors = useMemo(
    () => [
      '#6366F1', // indigo
      '#06B6D4', // cyan
      '#10B981', // emerald
      '#F59E0B', // amber
      '#F43F5E', // rose
      '#8B5CF6', // violet
      '#22C55E', // green
      '#0EA5E9', // sky
      '#A3A3A3', // neutral
    ],
    []
  );

  const [formData, setFormData] = useState({
    name: '',
    color: presetColors[Math.floor(Math.random() * presetColors.length)] || '#6366F1',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (categories.some(cat => cat.name.toLowerCase() === formData.name.toLowerCase())) {
      newErrors.name = 'Category with this name already exists';
    }
    
    if (!formData.color.match(/^#[0-9A-F]{6}$/i)) {
      newErrors.color = 'Please enter a valid hex color code';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);

    try {
      addCategory(formData);
      if (onClose) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={['space-y-5', className].join(' ')}>
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
          Category name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          autoFocus
          className={[
            'w-full rounded-xl px-3 py-2.5 shadow-sm transition-colors',
            'bg-white/85 dark:bg-slate-900/40 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500',
            'ring-1 ring-black/5 dark:ring-white/10',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/40',
            errors.name ? 'ring-2 ring-rose-500/60 focus:ring-rose-500/50' : '',
          ].join(' ')}
          placeholder="Food, Transportation, etc."
          value={formData.name}
          onChange={handleChange}
        />
        {errors.name ? <p className="text-rose-600 dark:text-rose-300 text-xs mt-1">{errors.name}</p> : null}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Accent color</label>
          <button
            type="button"
            onClick={() => setShowCustom((v) => !v)}
            className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            {showCustom ? 'Hide custom' : 'Custom'}
          </button>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
          {presetColors.map((c) => {
            const selected = String(formData.color).toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, color: c }));
                  setErrors((prev) => ({ ...prev, color: '' }));
                }}
                className={[
                  'h-9 w-9 rounded-xl ring-1 ring-black/10 dark:ring-white/10 shadow-sm',
                  selected ? 'ring-2 ring-blue-500/60' : 'hover:ring-black/20 dark:hover:ring-white/20',
                ].join(' ')}
                style={{ backgroundColor: c }}
                aria-label={`Pick ${c}`}
              />
            );
          })}
        </div>

        {showCustom ? (
          <div className="mt-3 grid grid-cols-[auto_1fr] gap-2 items-center">
            <input
              type="color"
              id="color"
              name="color"
              className="h-10 w-10 cursor-pointer rounded-xl ring-1 ring-black/10 dark:ring-white/10 bg-transparent"
              value={formData.color}
              onChange={handleChange}
              aria-label="Pick custom color"
            />
            <input
              type="text"
              name="color"
              inputMode="text"
              className={[
                'w-full rounded-xl px-3 py-2.5 shadow-sm transition-colors',
                'bg-white/85 dark:bg-slate-900/40 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500',
                'ring-1 ring-black/5 dark:ring-white/10',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/40',
                errors.color ? 'ring-2 ring-rose-500/60 focus:ring-rose-500/50' : '',
              ].join(' ')}
              value={formData.color}
              onChange={handleChange}
              aria-label="Color hex code"
              placeholder="#6366F1"
            />
          </div>
        ) : null}

        {errors.color ? <p className="text-rose-600 dark:text-rose-300 text-xs mt-1">{errors.color}</p> : null}
      </div>

      <div className="pt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl font-semibold ring-1 ring-black/5 dark:ring-white/[0.12] bg-white/80 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-900/55 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400/40"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-soft ring-1 ring-black/10 dark:ring-white/10 disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          {isSubmitting ? 'Saving…' : 'Save Category'}
        </button>
      </div>
    </form>
  );
};

export default CategoryForm; 
