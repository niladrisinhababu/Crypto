import React, { useState } from 'react';
import { FuturesItem } from '../types';
import { safePrice, safeToLocale } from '../utils';
import { TrendingUp, TrendingDown, ArrowUpDown, Filter, HelpCircle } from 'lucide-react';

interface Props {
  futures: FuturesItem[];
  isLoading: boolean;
  onSelectSymbol?: (symbol: string) => void;
}

export const FuturesView: React.FC<Props> = ({ futures, isLoading, onSelectSymbol }) => {
  const [buildupFilter, setBuildupFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = futures.filter((f) => {
    if (buildupFilter !== 'all' && f.buildup !== buildupFilter) return false;
    if (search && !f.symbol.toLowerCase().includes(search.toLowerCase().trim())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header & Buildup Explainer */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider">
              DERIVATIVES POSITIONING ENGINE
            </span>
            <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono">
              REAL-TIME BASIS & OI
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">Futures & Perpetuals Data Window</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitor institutional order-flow: Basis spread, funding rates, and 4-quadrant open interest buildup dynamics.
          </p>
        </div>

        {/* Buildup Cheat Sheet */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="bg-emerald-950/40 border border-emerald-800/40 p-2 rounded">
            <div className="text-emerald-400 font-bold">Long Buildup</div>
            <div className="text-[10px] text-zinc-400">Price ↑ & OI ↑</div>
          </div>
          <div className="bg-rose-950/40 border border-rose-800/40 p-2 rounded">
            <div className="text-rose-400 font-bold">Short Buildup</div>
            <div className="text-[10px] text-zinc-400">Price ↓ & OI ↑</div>
          </div>
          <div className="bg-cyan-950/40 border border-cyan-800/40 p-2 rounded">
            <div className="text-cyan-400 font-bold">Short Covering</div>
            <div className="text-[10px] text-zinc-400">Price ↑ & OI ↓</div>
          </div>
          <div className="bg-amber-950/40 border border-amber-800/40 p-2 rounded">
            <div className="text-amber-400 font-bold">Long Unwinding</div>
            <div className="text-[10px] text-zinc-400">Price ↓ & OI ↓</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-mono">
          {['all', 'Long Buildup', 'Short Buildup', 'Short Covering', 'Long Unwinding'].map((b) => (
            <button
              key={b}
              onClick={() => setBuildupFilter(b)}
              className={`px-3 py-1.5 rounded font-semibold transition-colors ${
                buildupFilter === b
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {b === 'all' ? 'All Contracts' : b}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Filter symbol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 text-xs text-white rounded-lg px-3 py-1.5 w-48 font-mono focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Table */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 sticky top-0 z-10 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3">Contract</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-right">LTP ($)</th>
                <th className="py-3 px-3 text-right">24h %</th>
                <th className="py-3 px-3 text-right">Mark Price</th>
                <th className="py-3 px-3 text-right">Index Price</th>
                <th className="py-3 px-3 text-right">Basis ($)</th>
                <th className="py-3 px-3 text-right">Premium / Disc</th>
                <th className="py-3 px-3 text-right">Open Interest</th>
                <th className="py-3 px-3 text-right">OI Change (6H)</th>
                <th className="py-3 px-3">Buildup Phase</th>
                <th className="py-3 px-3 text-right">Funding Rate (8h)</th>
                <th className="py-3 px-3">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-zinc-500">
                    No futures contracts matching the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isPos = (item.change24h || 0) >= 0;
                  const isBasisPos = (item.basis || 0) >= 0;

                  return (
                    <tr
                      key={item.symbol}
                      onClick={() => onSelectSymbol && onSelectSymbol(item.symbol)}
                      className="hover:bg-zinc-900/50 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white text-xs">{item.symbol}</div>
                        <div className="text-[10px] text-zinc-500">{item.underlying}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                          {item.contractType === 'perpetual_futures' ? 'Perp' : 'Future'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-white">
                        {safePrice(item.ltp)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        {item.change24h !== null && item.change24h !== undefined ? (
                          <span className={isPos ? 'text-emerald-400' : 'text-rose-400'}>
                            {isPos ? '+' : ''}
                            {item.change24h.toFixed(2)}%
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-300">
                        {safePrice(item.markPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-400">
                        {safePrice(item.indexPrice)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-semibold ${
                          isBasisPos ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.basis !== null && item.basis !== undefined ? `${isBasisPos ? '+' : ''}$${item.basis}` : 'N/A'}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-semibold ${
                          isBasisPos ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.premiumDiscountPct !== null && item.premiumDiscountPct !== undefined
                          ? `${isBasisPos ? '+' : ''}${item.premiumDiscountPct}%`
                          : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-cyan-300">
                        {safeToLocale(item.openInterest)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium">
                        {item.oiChange !== null && item.oiChange !== undefined ? (
                          <span className={item.oiChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {item.oiChange >= 0 ? '+' : ''}${safeToLocale(item.oiChange)}
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            item.buildup === 'Long Buildup'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : item.buildup === 'Short Buildup'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : item.buildup === 'Short Covering'
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                              : item.buildup === 'Long Unwinding'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                          }`}
                        >
                          {item.buildup}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-purple-300 font-semibold">
                        {item.fundingRate !== null ? `${(item.fundingRate * 100).toFixed(4)}%` : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                        {item.expiry === 'Perpetual (No Expiry)' ? (
                          <span className="text-zinc-500">Perpetual</span>
                        ) : (
                          <span>
                            {new Date(item.expiry).toLocaleDateString()} ({item.daysToExpiry}d)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
