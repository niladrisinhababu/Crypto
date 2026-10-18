import React, { useState, useMemo } from 'react';
import { MarketInstrument } from '../types';
import { safePrice, safeToLocale } from '../utils';
import { Search, ArrowUpDown, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  instruments: MarketInstrument[];
  isLoading: boolean;
  onSelectInstrument?: (symbol: string) => void;
}

export const MarketView: React.FC<Props> = ({ instruments, isLoading, onSelectInstrument }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'futures' | 'options'>('all');
  const [sortField, setSortField] = useState<keyof MarketInstrument>('volume24h');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return instruments.filter((item) => {
      if (filterType === 'futures') {
        if (item.contractType !== 'perpetual_futures' && item.contractType !== 'futures') {
          return false;
        }
      } else if (filterType === 'options') {
        if (item.contractType !== 'call_options' && item.contractType !== 'put_options') {
          return false;
        }
      }

      if (q) {
        const matchesSym = item.symbol.toLowerCase().includes(q);
        const matchesName = item.coinName?.toLowerCase().includes(q);
        const matchesUnderlying = item.underlyingAsset?.toLowerCase().includes(q);
        if (!matchesSym && !matchesName && !matchesUnderlying) return false;
      }

      return true;
    });
  }, [instruments, search, filterType]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filtered, sortField, sortAsc]);

  const totalPages = Math.ceil((sorted?.length || 0) / pageSize) || 1;
  const paginated = (sorted || []).slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (field: keyof MarketInstrument) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-white">Delta Exchange India Crypto Market</h1>
          <p className="text-xs text-zinc-400">
            Live catalog of {instruments.length} active tradable instruments across Perpetuals, Futures, and Options.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search symbol (e.g. BTC, ETH)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg pl-9 pr-3 py-2 w-60 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs font-medium">
            <button
              onClick={() => {
                setFilterType('all');
                setPage(1);
              }}
              className={`px-3 py-1 rounded ${
                filterType === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({instruments.length})
            </button>
            <button
              onClick={() => {
                setFilterType('futures');
                setPage(1);
              }}
              className={`px-3 py-1 rounded ${
                filterType === 'futures'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Futures & Perps
            </button>
            <button
              onClick={() => {
                setFilterType('options');
                setPage(1);
              }}
              className={`px-3 py-1 rounded ${
                filterType === 'options'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Options
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 sticky top-0 z-10 select-none uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3">Symbol / Coin</th>
                <th className="py-3 px-3">Contract Type</th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  onClick={() => handleSort('ltp')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>LTP ($)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  onClick={() => handleSort('change24h')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>24h %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Mark / Index</th>
                <th className="py-3 px-3 text-right">Bid / Ask</th>
                <th className="py-3 px-3 text-right">Spread</th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  onClick={() => handleSort('volume24h')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>24h Vol</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  onClick={() => handleSort('openInterest')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Open Interest</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Funding Rate</th>
                <th className="py-3 px-3 text-right">IV (%)</th>
                <th className="py-3 px-3">Expiry / Strike</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-zinc-500">
                    No matching instruments found.
                  </td>
                </tr>
              ) : (
                paginated.map((item) => {
                  const isPos = (item.change24h || 0) >= 0;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectInstrument && onSelectInstrument(item.symbol)}
                      className="hover:bg-zinc-900/50 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white text-xs">{item.symbol}</div>
                        <div className="text-[10px] text-zinc-500">
                          {item.coinName} ({item.underlyingAsset})
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                          {item.contractType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-white">
                        {safePrice(item.price)}
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
                      <td className="py-2.5 px-3 text-right text-zinc-400 text-[11px]">
                        <div>{safePrice(item.markPrice)}</div>
                        <div className="text-zinc-600">
                          {item.indexPrice ? safePrice(item.indexPrice) : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-300 text-[11px]">
                        <span className="text-emerald-400">{item.bid ?? 'N/A'}</span> /{' '}
                        <span className="text-rose-400">{item.ask ?? 'N/A'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-400">
                        {item.spread !== null && item.spread !== undefined ? `$${item.spread}` : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-200 font-medium">
                        {safeToLocale(item.volume24h)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-cyan-300 font-semibold">
                        {safeToLocale(item.openInterest)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-purple-300">
                        {item.fundingRate !== null
                          ? `${(item.fundingRate * 100).toFixed(4)}%`
                          : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-300 font-semibold">
                        {item.impliedVolatility !== null ? `${item.impliedVolatility}%` : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                        <div>{item.expiry}</div>
                        {item.strikePrice && (
                          <div className="text-cyan-400 font-bold">Strike: ${item.strikePrice}</div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-zinc-900/80 px-4 py-3 border-t border-zinc-800 flex items-center justify-between text-xs font-mono">
          <div className="text-zinc-500">
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, sorted.length)} of {sorted.length} instruments
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-zinc-400">
              Page <strong className="text-white">{page}</strong> of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
