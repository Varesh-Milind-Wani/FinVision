import React, { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { useExpenseContext } from '../contexts/ExpenseContext';
import { useCurrency } from '../contexts/CurrencyContext';

// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Create custom colored markers for Expense/Income/Investment
const createCustomIcon = (color) => {
  return new L.DivIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
};

const expenseIcon = createCustomIcon('#F43F5E');
const incomeIcon = createCustomIcon('#10B981');
const investmentIcon = createCustomIcon('#3B82F6');

const AutoFitBounds = ({ markers }) => {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [map, markers]);
  return null;
};

const HeatmapLayer = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    const heat = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 15,
      max: 1.0,
      gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red' }
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);
  return null;
};

const TransactionMap = ({ onClose }) => {
  const { transactions } = useExpenseContext();
  const { formatFromBase, currencyCode } = useCurrency();
  const [viewMode, setViewMode] = useState('heatmap'); // 'heatmap' or 'markers'

  // Filter out transactions that have valid location data
  const mapMarkers = useMemo(() => {
    return transactions
      .filter((t) => t.location && typeof t.location.lat === 'number' && typeof t.location.lng === 'number')
      .map((t) => {
        const isIncome = t.type === 'income';
        const isInvestment = t.type === 'investment';
        const icon = isIncome ? incomeIcon : isInvestment ? investmentIcon : expenseIcon;
        return {
          id: t.id,
          lat: t.location.lat,
          lng: t.location.lng,
          title: t.description || 'Transaction',
          amount: formatFromBase(Number(t.amount) || 0, 'en-US'),
          date: new Date(t.date).toLocaleDateString(),
          type: t.type,
          icon,
        };
      });
  }, [transactions, formatFromBase]);

  const heatmapPoints = useMemo(() => {
    // Basic point density - we pass [lat, lng, intensity]
    return mapMarkers.map(m => [m.lat, m.lng, 1]);
  }, [mapMarkers]);

  // Handle escape key
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120]">
      <div aria-hidden="true" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex flex-col pointer-events-none p-2 sm:p-6 pb-[env(safe-area-inset-bottom,16px)]">
        <div className="w-full h-full max-w-5xl mx-auto flex flex-col bg-white dark:bg-slate-950/95 backdrop-blur-2xl shadow-2xl rounded-3xl sm:rounded-[2rem] ring-1 ring-black/10 dark:ring-white/[0.12] overflow-hidden pointer-events-auto transition-transform">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10 z-10 bg-white/80 dark:bg-slate-900/60 backdrop-blur shrink-0">
            <div>
              <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white">Transaction Map</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {mapMarkers.length} geolocated transaction{mapMarkers.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Toggle */}
              <div className="hidden sm:flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mr-2">
                <button
                  onClick={() => setViewMode('heatmap')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'heatmap' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  Heatmap
                </button>
                <button
                  onClick={() => setViewMode('markers')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'markers' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  Markers
                </button>
              </div>

              <button
                onClick={onClose}
                className="shrink-0 h-9 w-9 rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.12] bg-slate-50/80 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/55 transition-colors grid place-items-center"
                aria-label="Close Map"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Mobile Toggle (below header) */}
          <div className="sm:hidden px-4 py-2 border-b border-black/5 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setViewMode('heatmap')}
                className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${viewMode === 'heatmap' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                Heatmap View
              </button>
              <button
                onClick={() => setViewMode('markers')}
                className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${viewMode === 'markers' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                Individual Markers
              </button>
            </div>
          </div>

          {/* Map Container */}
          <div className="flex-1 relative bg-slate-100 dark:bg-slate-900 z-0">
            {mapMarkers.length > 0 ? (
              <MapContainer 
                center={[20, 0]} 
                zoom={2} 
                className="w-full h-full"
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <AutoFitBounds markers={mapMarkers} />
                
                {viewMode === 'heatmap' ? (
                  <HeatmapLayer points={heatmapPoints} />
                ) : (
                  mapMarkers.map((m) => (
                    <Marker key={m.id} position={[m.lat, m.lng]} icon={m.icon}>
                      <Popup className="rounded-xl overflow-hidden font-sans">
                        <div className="p-1 min-w-[120px]">
                          <div className="font-bold text-sm text-slate-900 mb-1">{m.title}</div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-600">{m.date}</span>
                            <span className={`font-extrabold ${m.type === 'income' ? 'text-emerald-600' : m.type === 'investment' ? 'text-blue-600' : 'text-rose-600'}`}>
                              {m.type === 'income' ? '+' : m.type === 'investment' ? '•' : '-'} {currencyCode} {m.amount}
                            </span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))
                )}
              </MapContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <div>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-200/50 dark:bg-slate-800/50 text-slate-400 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Location Data</h3>
                  <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                    You haven't attached a location to any transactions yet. When adding a new transaction, toggle "Location" to enable this map.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionMap;
