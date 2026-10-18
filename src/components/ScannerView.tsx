import React, { useState } from 'react';
import { CryptoSignal } from '../types';
import { safePrice, safeToLocale } from '../utils';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  SlidersHorizontal,
  ChevronRight,
  Filter,
  CheckCircle,
} from 'lucide-react';

interface Props {
  signals: CryptoSignal[];
  onSelectSignal: (signal: CryptoSignal) => void;
  onTradeSignal: (signal: CryptoSignal) => void;
  isLoading: boolean;
}

export const ScannerView: React.FC<Props> = ({
  signals,
  onSelectSignal,
  onTradeSignal,
  isLoading,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const filtered = signals.filter((s) => {
    if (filter === 'BUY') return s.signal.includes('BUY');
    if (filter === 'SELL') return s.signal.includes('SELL');
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Banner & Strategy Summary */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider">
              QUANTITATIVE SCANNER ENGINE
            </span>
            <span className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded font-mono font-bold">
              CANDLESTICK PATTERN CONFLUENCE
            </span>
            <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded font-mono font-bold">
              PROPER ENTRY TRIGGER (60%+ WIN RATE)
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            Top Crypto Opportunities (Ranked by Final Score)
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Strict multi-factor scoring: Candlestick Pattern Confirmation + Proper Limit/Pullback Entry Position + Trailing Stop to Breakeven at Target 1.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 text-xs font-semibold rounded ${
              filter === 'ALL'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Signals ({signals.length})
          </button>
          <button
            onClick={() => setFilter('BUY')}
            className={`px-3 py-1 text-xs font-semibold rounded ${
              filter === 'BUY'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-emerald-400'
            }`}
          >
            Buy Only ({signals.filter((s) => s.signal.includes('BUY')).length})
          </button>
          <button
            onClick={() => setFilter('SELL')}
            className={`px-3 py-1 text-xs font-semibold rounded ${
              filter === 'SELL'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'text-zinc-400 hover:text-rose-400'
            }`}
          >
            Sell Only ({signals.filter((s) => s.signal.includes('SELL')).length})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900/90 text-zinc-400 border-b border-zinc-800 select-none uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Coin / Asset</th>
                <th className="py-3 px-3">Signal</th>
                <th className="py-3 px-3 text-right">Final Score</th>
                <th className="py-3 px-3 text-right">LTP ($)</th>
                <th className="py-3 px-3 text-right">24h Vol</th>
                <th className="py-3 px-3 text-right">Open Interest</th>
                <th className="py-3 px-3">Buildup</th>
                <th className="py-3 px-3 text-right">RSI</th>
                <th className="py-3 px-3 text-right">ADX</th>
                <th className="py-3 px-3">Structure</th>
                <th className="py-3 px-3 text-right">Entry</th>
                <th className="py-3 px-3 text-right">Stop Loss</th>
                <th className="py-3 px-3 text-right">Target 1</th>
                <th className="py-3 px-3 text-right">R:R</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-8 text-center text-zinc-500">
                    No active signals matching the selected criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const isBuy = item.signal.includes('BUY');
                  const isSell = item.signal.includes('SELL');
                  const scoreColor =
                    item.finalScore >= 80
                      ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
                      : item.finalScore >= 65
                      ? 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40'
                      : 'text-zinc-400 bg-zinc-900 border-zinc-800';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-900/50 transition-colors group cursor-pointer"
                      onClick={() => onSelectSignal(item)}
                    >
                      <td className="py-3 px-3 text-zinc-500 font-bold">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white text-sm">{item.coin}</div>
                        <div className="text-[10px] text-zinc-400">{item.symbol}</div>
                        {item.candlestickPattern && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800/50 font-mono">
                            🕯️ {typeof item.candlestickPattern === 'object' ? item.candlestickPattern.name : item.candlestickPattern}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase border ${
                            isBuy
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : isSell
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {item.signal}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold">
                        <span className={`inline-block px-2 py-0.5 rounded border text-xs ${scoreColor}`}>
                          {item.finalScore} / 100
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-white">
                        {safePrice(item.price)}
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-300">
                        {safeToLocale(item.metrics?.volume24h)}
                      </td>
                      <td className="py-3 px-3 text-right text-cyan-300 font-semibold">
                        {safeToLocale(item.metrics?.oi)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[11px] font-semibold ${
                            item.buildupType === 'Long Buildup'
                              ? 'text-emerald-400'
                              : item.buildupType === 'Short Buildup'
                              ? 'text-rose-400'
                              : item.buildupType === 'Short Covering'
                              ? 'text-cyan-400'
                              : item.buildupType === 'Long Unwinding'
                              ? 'text-amber-400'
                              : 'text-zinc-400'
                          }`}
                        >
                          {item.buildupType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-zinc-200">
                        {item.metrics?.rsi ?? 'N/A'}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-zinc-200">
                        {item.metrics?.adx ?? 'N/A'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[11px] font-semibold ${
                            item.marketStructure === 'Bullish'
                              ? 'text-emerald-400'
                              : item.marketStructure === 'Bearish'
                              ? 'text-rose-400'
                              : 'text-zinc-400'
                          }`}
                        >
                          {item.marketStructure}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-blue-400 whitespace-nowrap">
                        <div>{safePrice(item.entry)}</div>
                        {item.isEntryTriggered || item.entryStrategy?.isTriggered ? (
                          <span className="text-[9px] text-emerald-400 block font-normal font-mono">✓ Triggered</span>
                        ) : (
                          <span className="text-[9px] text-amber-400 block font-normal font-mono">⏳ Wait Entry</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-400">
                        {safePrice(item.stopLoss)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400">
                        {safePrice(item.target1)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-amber-300">
                        1:{item.riskReward}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectSignal(item);
                            }}
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[10px] font-bold uppercase transition-colors"
                          >
                            Report
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTradeSignal(item);
                            }}
                            className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-black rounded text-[10px] font-bold uppercase transition-colors"
                          >
                            Size
                          </button>
                        </div>
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
