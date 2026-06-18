import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useExpenseContext } from '../contexts/ExpenseContext';
import { useAmountsVisibility } from '../contexts/AmountsVisibilityContext';

const BACKUP_SCHEMA = 'finvision.backup.v1';
const shouldBackupKey = (key) => typeof key === 'string' && (key.startsWith('finvision') || key.startsWith('expenseTrackerData'));

const collectBackupStorage = () => {
  const out = {};
  if (typeof window === 'undefined' || !window.localStorage) return out;
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (!shouldBackupKey(k)) continue;
      out[k] = window.localStorage.getItem(k);
    }
  } catch {
    // ignore
  }
  return out;
};

const restoreBackupStorage = (storageMap) => {
  if (typeof window === 'undefined' || !window.localStorage) throw new Error('localStorage not available');
  if (!storageMap || typeof storageMap !== 'object' || Array.isArray(storageMap)) throw new Error('Invalid backup: missing localStorage map');

  const keysToClear = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const k = window.localStorage.key(i);
    if (shouldBackupKey(k)) keysToClear.push(k);
  }

  keysToClear.forEach((k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      // ignore
    }
  });

  Object.entries(storageMap).forEach(([k, v]) => {
    if (!shouldBackupKey(k)) return;
    try {
      if (v === null || typeof v === 'undefined') window.localStorage.removeItem(k);
      else window.localStorage.setItem(k, String(v));
    } catch {
      // ignore quota/private mode failures
    }
  });
};

const ExportImport = () => {
  const { transactions, categories, currencyCode, networthSnapshots, dashboardPrefs, importData } = useExpenseContext();
  const { appPinEnabled, requestPin } = useAmountsVisibility();
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const escapeHtml = (value) =>
    String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const escapeCsv = (value) => {
    const s = value == null ? '' : String(value);
    if (!/[",\n\r]/.test(s)) return s;
    return `"${s.replace(/"/g, '""')}"`;
  };

  const buildJsonBackup = () => ({
    schema: BACKUP_SCHEMA,
    exportedAt: new Date().toISOString(),
    app: { name: 'FinVision', origin: typeof window !== 'undefined' ? window.location.origin : '' },
    localStorage: collectBackupStorage(),
    summary: {
      transactions: (transactions || []).length,
      categories: (categories || []).length,
    },
    legacy: {
      transactions,
      categories,
      currencyCode,
      networthSnapshots,
      dashboardPrefs,
    },
  });

  const parseCsv = (text) => {
    const input = String(text || '');
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    const pushField = () => {
      row.push(field);
      field = '';
    };

    const pushRow = () => {
      // Skip completely empty trailing row.
      if (row.length === 1 && String(row[0] || '').trim() === '') {
        row = [];
        return;
      }
      rows.push(row);
      row = [];
    };

    for (let i = 0; i < input.length; i += 1) {
      const ch = input[i];
      const next = input[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          field += '"';
          i += 1;
          continue;
        }
        if (ch === '"') {
          inQuotes = false;
          continue;
        }
        field += ch;
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
        continue;
      }

      if (ch === ',') {
        pushField();
        continue;
      }

      if (ch === '\r') {
        // Handle CRLF as a single newline.
        if (next === '\n') i += 1;
        pushField();
        pushRow();
        continue;
      }

      if (ch === '\n') {
        pushField();
        pushRow();
        continue;
      }

      field += ch;
    }

    // flush last field/row
    pushField();
    pushRow();

    if (rows.length === 0) return { header: [], records: [] };

    const header = rows[0].map((h) => String(h || '').trim());
    const records = rows.slice(1);
    return { header, records };
  };

  const normalizeHeaderKey = (h) => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const parseAmount = (value) => {
    if (typeof value === 'number') return value;
    const text = String(value || '')
      .trim()
      .replace(/[â‚¹$,A-Z]/gi, '')
      .replace(/,/g, '')
      .replace(/[^\d.-]/g, '');
    const n = parseFloat(text);
    return Number.isFinite(n) ? n : NaN;
  };

  const toIsoDate = (value) => {
    const s = String(value || '').trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    const m1 = s.replace(/[-.]/g, '/').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m1) {
      const dd = Number(m1[1]);
      const mm = Number(m1[2]);
      const yyyy = Number(m1[3]);
      if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12 && yyyy >= 1900 && yyyy <= 3000) {
        const pad2 = (n) => String(n).padStart(2, '0');
        return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
      }
    }

    const dt = new Date(s);
    if (Number.isNaN(dt.getTime())) return null;
    const pad2 = (n) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
  };

  const exportData = async (format) => {
    setIsExporting(true);
    
    try {
      if (appPinEnabled) {
        const ok = await requestPin?.({ reason: 'Enter your PIN to export/download your data.' });
        if (!ok) {
          setIsExporting(false);
          return;
        }
      }

      // Transactions-only export (flat table). Investment-specific fields are included as extra columns.
      const header = [
        'Date',
        'Description',
        'Category',
        'Amount',
        'Type',
        'Quantity',
        'EntryPrice',
        'ExitPrice',
        'CurrentPrice',
        'LocationAddress',
      ];

      const rows = (transactions || []).map((transaction) => {
        const isInvestment = transaction?.type === 'investment';
        const quantity = isInvestment ? transaction?.quantity : '';
        const entryPrice = isInvestment ? transaction?.entryPrice : '';
        const exitPrice = isInvestment ? transaction?.exitPrice : '';
        const currentPrice = isInvestment ? transaction?.currentPrice : '';

        const loc = transaction?.location && typeof transaction.location === 'object' ? transaction.location : null;
        const locAddr = loc?.address ?? '';

        return [
          transaction?.date || '',
          transaction?.description || '',
          transaction?.category || '',
          transaction?.amount ?? '',
          transaction?.type || '',
          quantity ?? '',
          entryPrice ?? '',
          exitPrice ?? '',
          currentPrice ?? '',
          locAddr ?? '',
        ];
      });

      const today = new Date().toISOString().split('T')[0];
      const totalSpend = Math.round(
        (transactions || []).reduce((sum, t) => {
          const isExpense = String(t?.type || '').toLowerCase() === 'expense';
          if (!isExpense) return sum;
          const n = typeof t?.amount === 'number' ? t.amount : Number(t?.amount);
          if (!Number.isFinite(n)) return sum;
          return sum + Math.abs(n);
        }, 0) * 100
      ) / 100;
      const spendLabel = currencyCode ? `${totalSpend} ${currencyCode}` : String(totalSpend);

      if (format === 'excel') {
        // Export as CSV for maximum compatibility with Excel (avoids ".xls doesn't match" warnings).
        const csvHeader = header.join(',') + '\n';
        const csvRows = rows.map((r) => r.map(escapeCsv).join(',')).join('\n');
        const totalsRow = ['Total Spend', spendLabel, '', '', '', '', '', '', '', '', ''].map(escapeCsv).join(',');

        const content = csvHeader + csvRows + (csvRows ? '\n' : '') + totalsRow + '\n';
        const filename = `finvision-export-${today}.csv`;
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setImportSuccess('Excel (CSV) exported');
        setTimeout(() => setImportSuccess(''), 2500);
      } else if (format === 'pdf') {
        const tableHeader = `<tr>${header.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
        const tableRows = rows.map((r) => `<tr>${r.map((v) => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join('');

        const html =
          `<!doctype html><html><head><meta charset="utf-8" />` +
          `<title>FinVision Export ${today}</title>` +
          `<style>@page{margin:16mm}body{font-family:Arial,sans-serif;color:#0f172a}h2{margin:0 0 6px}p{margin:0 0 12px;color:#475569;font-size:12px}` +
          `table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:6px;font-size:10.5px;vertical-align:top}th{background:#f1f5f9;text-align:left}` +
          `th:nth-child(1),td:nth-child(1){min-width:86px;white-space:nowrap}` +
          `</style></head><body>` +
          `<h2>FinVision Export</h2><p>${today} &bull; ${rows.length} records &bull; Total Spend: <b>${escapeHtml(spendLabel)}</b></p>` +
          `<table>${tableHeader}${tableRows}</table>` +
          `</body></html>`;

        // Use an offscreen iframe to avoid popup blockers; the user can "Save as PDF" in the print dialog.
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.setAttribute('aria-hidden', 'true');
        document.body.appendChild(iframe);

        const cleanup = () => {
          try {
            document.body.removeChild(iframe);
          } catch {
            // ignore
          }
        };

        const onLoad = () => {
          try {
            const w = iframe.contentWindow;
            if (!w) throw new Error('Print frame unavailable.');
            w.focus();
            w.print();
            setImportSuccess('PDF ready (print dialog)');
            setTimeout(() => setImportSuccess(''), 2500);
          } catch (e) {
            cleanup();
            throw e;
          }

          // Give the print dialog time to open before cleanup.
          window.setTimeout(cleanup, 1500);
        };

        iframe.addEventListener('load', onLoad, { once: true });
        const doc = iframe.contentDocument;
        if (!doc) {
          cleanup();
          throw new Error('Print document unavailable.');
        }
        doc.open();
        doc.write(html);
        doc.close();
      } else {
        throw new Error('Unsupported export format');
      }
    } catch (error) {
      setImportError(`Export failed: ${error.message}`);
      setTimeout(() => setImportError(''), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const inputEl = event.target;

    setIsImporting(true);
    setImportError('');
    setImportSuccess('');
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        if (appPinEnabled) {
          const ok = await requestPin?.({ reason: 'Enter your PIN to import/restore data.' });
          if (!ok) {
            setIsImporting(false);
            inputEl.value = null;
            return;
          }
        }

        // Check if it's a JSON file
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(e.target.result);
          
          // Full backup restore (preferred)
          if (data?.schema === BACKUP_SCHEMA && data?.localStorage && typeof data.localStorage === 'object') {
            restoreBackupStorage(data.localStorage);
            setImportSuccess('Backup restored successfully. Reloadingâ€¦');
            setImportError('');
            window.setTimeout(() => window.location.reload(), 250);
            return;
          }

          // Legacy restore (older exports)
          if (!data.transactions || !Array.isArray(data.transactions)) {
            throw new Error('Invalid data format: transactions array is missing');
          }

          importData(
            {
              transactions: data.transactions,
              categories: data.categories || [],
              currencyCode: data.currencyCode,
              networthSnapshots: data.networthSnapshots,
              dashboardPrefs: data.dashboardPrefs,
              darkMode: data.darkMode,
            },
            { mode: 'replace' }
          );

          setImportSuccess(`Data restored successfully! Loaded ${data.transactions.length} transactions and ${data.categories?.length || 0} categories.`);
          setImportError('');
        } else if (file.name.endsWith('.csv')) {
          const rawText = String(e.target.result || '');
          const { header, records } = parseCsv(rawText);
          if (!header || header.length === 0) throw new Error('CSV is empty or missing header row');

          const idx = {};
          header.forEach((h, i) => {
            const k = normalizeHeaderKey(h);
            if (!k) return;
            if (idx[k] == null) idx[k] = i;
          });

          const required = ['date', 'description', 'category', 'amount', 'type'];
          const hasRequired = required.every((k) => idx[k] != null);
          if (!hasRequired) {
            throw new Error(
              'Invalid CSV header. Expected: Date,Description,Category,Amount,Type (plus optional Quantity,EntryPrice,ExitPrice,CurrentPrice and LocationLat,LocationLng,LocationAccuracy,LocationAddress,LocationCapturedAt).'
            );
          }

          const get = (row, key) => {
            const i = idx[key];
            return i == null ? '' : row[i];
          };

          const readLocationFromRow = (row) => {
            const lat = parseAmount(get(row, 'locationlat'));
            const lng = parseAmount(get(row, 'locationlng'));
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            const accuracy = parseAmount(get(row, 'locationaccuracy'));
            const address = String(get(row, 'locationaddress') || '').trim();
            const capturedAtRaw = String(get(row, 'locationcapturedat') || '').trim();
            const capturedAt = Number.isFinite(Date.parse(capturedAtRaw)) ? capturedAtRaw : new Date().toISOString();
            return {
              lat,
              lng,
              ...(Number.isFinite(accuracy) && accuracy > 0 ? { accuracy } : {}),
              ...(address ? { address } : {}),
              capturedAt,
              provider: 'import-csv',
            };
          };

          const txs = [];
          for (const row of records || []) {
            const rowText = (row || []).map((v) => String(v || '').trim()).join('');
            if (!rowText) continue;

            const date = toIsoDate(get(row, 'date')) || new Date().toISOString().slice(0, 10);
            const description = String(get(row, 'description') || '').trim();
            const category = String(get(row, 'category') || '').trim() || 'other';
            const typeRaw = String(get(row, 'type') || '').trim().toLowerCase();
            const type = typeRaw === 'income' || typeRaw === 'expense' || typeRaw === 'investment' ? typeRaw : 'expense';
            const amt = Math.abs(parseAmount(get(row, 'amount')) || 0);
            const location = readLocationFromRow(row);

            if (!description && type !== 'investment') continue;

            if (type === 'investment') {
              const quantity = parseAmount(get(row, 'quantity'));
              const entryPrice = parseAmount(get(row, 'entryprice'));
              const exitPrice = parseAmount(get(row, 'exitprice'));
              const currentPrice = parseAmount(get(row, 'currentprice'));
              const qtyOk = Number.isFinite(quantity) && quantity > 0;
              const entryOk = Number.isFinite(entryPrice) && entryPrice > 0;
              const exitOk = Number.isFinite(exitPrice) && exitPrice >= 0;
              const currentOk = Number.isFinite(currentPrice) && currentPrice >= 0;

              const amount = qtyOk && entryOk ? Math.round(quantity * entryPrice * 100) / 100 : amt;
              const hasExit = exitOk;
              const profit = qtyOk && entryOk && exitOk ? Math.round((exitPrice - entryPrice) * quantity * 100) / 100 : null;
              const unrealizedProfit =
                !hasExit && qtyOk && entryOk && currentOk ? Math.round((currentPrice - entryPrice) * quantity * 100) / 100 : null;

              txs.push({
                id: uuidv4(),
                date,
                type: 'investment',
                category: category || 'Stocks',
                name: description || 'Investment',
                description: description || 'Investment',
                amount: amount > 0 ? amount : 0,
                quantity: qtyOk ? quantity : 0,
                entryPrice: entryOk ? entryPrice : 0,
                exitPrice: hasExit ? exitPrice : null,
                profit: profit != null ? profit : null,
                currentPrice: !hasExit && currentOk ? currentPrice : null,
                unrealizedProfit: unrealizedProfit != null ? unrealizedProfit : null,
                status: hasExit ? 'closed' : 'active',
                hyperData: '',
                hyperDataItems: [],
                ...(location ? { location } : {}),
              });
            } else {
              txs.push({
                id: uuidv4(),
                date,
                type,
                category,
                description,
                amount: amt > 0 ? amt : 0,
                ...(location ? { location } : {}),
              });
            }
          }

          if (txs.length === 0) throw new Error('No valid transactions found in CSV.');

          importData(
            {
              transactions: txs,
              categories: categories || [],
              currencyCode,
              networthSnapshots,
              dashboardPrefs,
            },
            { mode: 'merge' }
          );

          setImportSuccess(`CSV imported successfully! Added ${txs.length} transactions.`);
          setImportError('');
        } else {
          throw new Error('Unsupported file format. Please use JSON or CSV files.');
        }
      } catch (error) {
        setImportError(`Import failed: ${error.message}`);
        setImportSuccess('');
      } finally {
        setIsImporting(false);
      }
      
      // Reset file input
      inputEl.value = null;
    };
    
    reader.onerror = () => {
      setImportError('Error reading file');
      setImportSuccess('');
      setIsImporting(false);
    };
    
    reader.readAsText(file);
  };

  return (
    <div className="surface surface-pad mb-8 animate-float-in">
      <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-6">Export & Import</h2>
      
      <div className="flex flex-col gap-4">
        {/* Export Section */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-5 ring-1 ring-black/5 dark:ring-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600 rounded-2xl p-2 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
              </svg>
            </div>
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Export Your Data</h3>
          </div>
          
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            Download your transactions as Excel, or save a PDF report.
          </p>
          
          <div className="flex flex-wrap gap-3 mb-4">
            <button 
              onClick={() => exportData('excel')} 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center justify-center transition-colors shadow-soft focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              disabled={transactions.length === 0 || isExporting}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel (CSV)
            </button>
            <button 
              onClick={() => exportData('pdf')} 
              className="btn-surface disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={transactions.length === 0 || isExporting}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              PDF
            </button>
          </div>
          
          {transactions.length === 0 && (
            <div className="flex items-center mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl text-amber-800 dark:text-amber-200 text-sm ring-1 ring-amber-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>You need to add transactions before exporting data</span>
            </div>
          )}
          
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Tip:</span> Export regularly to backup your financial data
          </div>
        </div>
        
        {/* Import Section */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-5 ring-1 ring-black/5 dark:ring-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-600 rounded-2xl p-2 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Import Data</h3>
          </div>
          
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            Restore your full backup (JSON) or import transactions from a CSV export.
          </p>
          
          <div className="mb-4">
            <button
              onClick={() => document.getElementById('file-upload').click()}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-5 py-2.5 rounded-xl flex items-center justify-center transition-colors shadow-soft focus:outline-none focus:ring-2 focus:ring-emerald-500/40 w-full"
              disabled={isImporting}
            >
              <span className="mr-2" aria-hidden="true">*</span>
              Select File to Import
            </button>
            <input 
              id="file-upload"
              type="file" 
              accept=".json,.csv" 
              className="hidden"
              onChange={handleImportData}
              disabled={isImporting}
            />
          </div>
          
          {importError && (
            <div className="flex items-center mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-700 dark:text-red-200 text-sm ring-1 ring-red-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{importError}</span>
            </div>
          )}
          
          {importSuccess && (
            <div className="flex items-center mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-800 dark:text-emerald-200 text-sm ring-1 ring-emerald-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{importSuccess}</span>
            </div>
          )}
          
          <div className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white/60 dark:bg-slate-900/40">
            <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold mb-1">Supported Format</div>
            <div className="flex items-center">
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                JSON
              </span>
              <span className="mx-2 text-xs text-slate-400" aria-hidden="true">â€¢</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-200">
                CSV
              </span>
              <span className="mx-1 text-xs text-slate-400" aria-hidden="true">*</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Previously exported data</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportImport; 


