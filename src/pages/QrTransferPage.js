import React from 'react';
import { useExpenseContext } from '../contexts/ExpenseContext';
import { LZString } from '../utils/lzString';

const BACKUP_SCHEMA = 'finvision.backup.v1';

const escapeCsv = (value) => {
  const s = value == null ? '' : String(value);
  if (!/[",\n\r]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
};

const makeTransactionsCsv = (transactions) => {
  const csvHeader =
    'Date,Description,Category,Amount,Type,Quantity,EntryPrice,ExitPrice,CurrentPrice,LocationAddress\n';

  const csvRows = (transactions || [])
    .map((transaction) => {
      const isInvestment = transaction?.type === 'investment';
      const quantity = isInvestment ? transaction?.quantity : '';
      const entryPrice = isInvestment ? transaction?.entryPrice : '';
      const exitPrice = isInvestment ? transaction?.exitPrice : '';
      const currentPrice = isInvestment ? transaction?.currentPrice : '';

      const loc = transaction?.location && typeof transaction.location === 'object' ? transaction.location : null;
      const locAddr = loc?.address ?? '';

      const cols = [
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
      return cols.map(escapeCsv).join(',');
    })
    .join('\n');

  return csvHeader + csvRows + (csvRows ? '\n' : '');
};

const downloadText = (content, filename, contentType) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function QrTransferPage({ encoded, part }) {
  const { importData } = useExpenseContext();
  const [error, setError] = React.useState('');
  const [payload, setPayload] = React.useState(null);
  const [partsStatus, setPartsStatus] = React.useState(null);
  const [livePart, setLivePart] = React.useState(part || null);

  const decodePayload = React.useCallback((encodedPayload) => {
    const decoded = LZString.decompressFromEncodedURIComponent(String(encodedPayload || ''));
    if (!decoded) throw new Error('Invalid or empty QR payload.');
    const obj = JSON.parse(decoded);
    if (!obj || typeof obj !== 'object') throw new Error('Invalid payload.');
    if (obj.schema !== BACKUP_SCHEMA) throw new Error('Unsupported QR backup schema.');
    return obj;
  }, []);

  const parsePart = React.useCallback((rawPart) => {
    const raw = String(rawPart || '');
    if (!raw) return null;
    const pieces = raw.split('.');
    if (pieces.length < 4) return null;
    const [id, idxRaw, totalRaw, ...rest] = pieces;
    const chunk = rest.join('.');
    const idx = Number.parseInt(idxRaw, 10);
    const total = Number.parseInt(totalRaw, 10);
    if (!id || !Number.isFinite(idx) || !Number.isFinite(total) || idx < 1 || total < 1 || idx > total) return null;
    if (!chunk) return null;
    return { id, idx, total, chunk };
  }, []);

  React.useEffect(() => {
    setLivePart(part || null);
  }, [part]);

  React.useEffect(() => {
    setError('');
    setPayload(null);
    setPartsStatus(null);
    try {
      const parsedPart = parsePart(livePart);
      if (parsedPart) {
        const storageKey = `finvision.qrparts.${parsedPart.id}`;
        let state = { total: parsedPart.total, parts: {}, updatedAt: Date.now() };
        try {
          const existing = window.sessionStorage.getItem(storageKey);
          if (existing) {
            const existingParsed = JSON.parse(existing);
            if (
              existingParsed &&
              typeof existingParsed === 'object' &&
              existingParsed.total === parsedPart.total &&
              existingParsed.parts &&
              typeof existingParsed.parts === 'object'
            ) {
              state = { total: existingParsed.total, parts: existingParsed.parts, updatedAt: Date.now() };
            }
          }
        } catch {
          // ignore
        }

        state.parts[String(parsedPart.idx)] = parsedPart.chunk;
        try {
          window.sessionStorage.setItem(storageKey, JSON.stringify(state));
        } catch {
          // ignore
        }

        const receivedCount = Object.keys(state.parts).length;
        const missing = [];
        for (let i = 1; i <= state.total; i += 1) {
          if (!state.parts[String(i)]) missing.push(i);
        }

        if (receivedCount === state.total) {
          const combined = Array.from({ length: state.total }, (_, i) => state.parts[String(i + 1)]).join('');
          const obj = decodePayload(combined);
          setPayload(obj);
          setPartsStatus({
            mode: 'complete',
            id: parsedPart.id,
            idx: parsedPart.idx,
            total: parsedPart.total,
            received: receivedCount,
            missing: [],
          });
          try {
            window.sessionStorage.removeItem(storageKey);
          } catch {
            // ignore
          }
        } else {
          setPartsStatus({
            mode: 'collecting',
            id: parsedPart.id,
            idx: parsedPart.idx,
            total: parsedPart.total,
            received: receivedCount,
            missing,
          });
        }
        return;
      }

      if (!encoded) throw new Error('Missing QR payload.');
      const obj = decodePayload(encoded);
      setPayload(obj);
    } catch (e) {
      setError(e?.message || 'Failed to read QR payload.');
    }
  }, [decodePayload, encoded, livePart, parsePart]);

  const legacy = payload?.legacy || {};
  const tx = legacy?.transactions || [];

  return (
    <div className="min-h-[100dvh] bg-white px-4 py-8 flex items-start justify-center">
      <div className="w-full max-w-2xl">
        <div className="rounded-3xl ring-1 ring-black/10 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.55)] bg-white overflow-hidden">
          <div className="px-6 py-5 border-b border-black/[0.06]">
            <div className="font-display text-[22px] sm:text-[26px] leading-tight font-extrabold text-slate-900">QR Transfer</div>
            <div className="mt-1 text-[12px] text-slate-500">
              Download your exported data as JSON/CSV, or import directly into this device.
            </div>
          </div>

          <div className="p-6">
            {error ? (
              <div className="rounded-2xl bg-rose-50 text-rose-700 ring-1 ring-rose-200/60 px-4 py-3 text-[13px] font-semibold">
                {error}
              </div>
            ) : partsStatus?.mode === 'collecting' ? (
              <div className="rounded-3xl ring-1 ring-black/10 bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-black/[0.06]">
                  <div className="text-[13px] font-extrabold text-slate-900">Collecting QR parts</div>
                  <div className="mt-1 text-[12px] text-slate-500">
                    Received <span className="font-semibold text-slate-700">{partsStatus.received}</span> of{' '}
                    <span className="font-semibold text-slate-700">{partsStatus.total}</span>. Keep scanning the remaining QR codes on the exporting device.
                  </div>
                </div>
                <div className="p-5">
                  <div className="rounded-2xl bg-slate-50 ring-1 ring-black/5 px-4 py-3 text-[12px] text-slate-600">
                    Last scanned: <span className="font-semibold text-slate-700">Part {partsStatus.idx}</span> • Transfer ID:{' '}
                    <span className="font-semibold text-slate-700">{partsStatus.id}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="h-10 px-4 rounded-2xl bg-white text-slate-900 text-[12px] font-extrabold ring-1 ring-black/10 hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        try {
                          window.sessionStorage.removeItem(`finvision.qrparts.${partsStatus.id}`);
                        } catch {
                          // ignore
                        }
                        setPartsStatus(null);
                        setError('Cleared transfer state. Scan part 1 again to restart.');
                      }}
                    >
                      Start over
                    </button>
                  </div>
                  <div className="mt-4 text-[12px] text-slate-500">
                    Tip: Scan parts in order (1 → {partsStatus.total}) for the smoothest experience.
                  </div>
                </div>
              </div>
            ) : payload ? (
              <>
                <div className="rounded-2xl bg-slate-50 ring-1 ring-black/5 px-4 py-3 text-[12px] text-slate-600">
                  Exported: <span className="font-semibold">{payload.exportedAt || '—'}</span> • Transactions:{' '}
                  <span className="font-semibold">{Array.isArray(tx) ? tx.length : 0}</span>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    className="h-11 rounded-2xl bg-slate-900 text-white font-extrabold text-[12px] shadow-sm hover:bg-slate-800 transition-colors"
                    onClick={() => {
                      const content = JSON.stringify(payload, null, 2);
                      const filename = `finvision-qr-export-${new Date().toISOString().split('T')[0]}.json`;
                      downloadText(content, filename, 'application/json');
                    }}
                  >
                    Download JSON
                  </button>
                  <button
                    type="button"
                    className="h-11 rounded-2xl bg-white text-slate-900 font-extrabold text-[12px] ring-1 ring-black/10 shadow-sm hover:bg-slate-50 transition-colors"
                    onClick={() => {
                      const content = makeTransactionsCsv(tx);
                      const filename = `finvision-qr-export-${new Date().toISOString().split('T')[0]}.csv`;
                      downloadText(content, filename, 'text/csv');
                    }}
                  >
                    Download CSV (Excel)
                  </button>
                  <button
                    type="button"
                    className="h-11 rounded-2xl bg-emerald-600 text-white font-extrabold text-[12px] shadow-sm hover:bg-emerald-700 transition-colors"
                    onClick={() => {
                      try {
                        importData?.(legacy);
                      } catch (e) {
                        setError(e?.message || 'Import failed.');
                        return;
                      }
                      setError('');
                    }}
                  >
                    Import to app
                  </button>
                </div>

                <div className="mt-5 text-[12px] text-slate-500">
                  Tip: Large exports use multiple QR codes. Scan all parts to complete the transfer.
                </div>
              </>
            ) : (
              <div className="text-[13px] text-slate-600">Loading…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
