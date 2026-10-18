import React, { useState, useEffect, useRef } from 'react';
import { OptionsChainRow, OptionsChainSummary } from '../types';
import { safePrice, safeToLocale } from '../utils';
import { RefreshCw, AlertTriangle, Layers, Info } from 'lucide-react';

interface Props {
  underlying: string;
  onSelectOption?: (symbol: string) => void;
}

const COMMODITY_OPTIONS_UNDERLYINGS = ['GOLD', 'SILVER', 'CRUDEOIL', 'ZINC', 'COPPER'];
const CRYPTO_OPTIONS_UNDERLYINGS = ['BTC', 'ETH'];

export const OptionsChainView: React.FC<Props> = ({ underlying, onSelectOption }) => {
  const isCommodity = COMMODITY_OPTIONS_UNDERLYINGS.includes((underlying || '').toUpperCase());

  const [activeUnderlying, setActiveUnderlying] = useState<string>(() => {
    const clean = (underlying || 'BTC').toUpperCase();
    if (COMMODITY_OPTIONS_UNDERLYINGS.includes(clean)) return clean;
    return CRYPTO_OPTIONS_UNDERLYINGS.includes(clean) ? clean : 'BTC';
  });

  const [chainData, setChainData] = useState<{
    rows: OptionsChainRow[];
    summary: OptionsChainSummary;
    availableExpiries: string[];
  } | null>(null);
  const [selectedExpiry, setSelectedExpiry] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync activeUnderlying if underlying prop changes
  useEffect(() => {
    const clean = (underlying || '').toUpperCase();
    if (clean && clean !== activeUnderlying) {
      setActiveUnderlying(clean);
      setSelectedExpiry('');
    }
  }, [underlying]);

  const fetchChain = async (coin: string, exp?: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setFetchError(null);

    try {
      const isComm = COMMODITY_OPTIONS_UNDERLYINGS.includes(coin.toUpperCase());
      const endpoint = isComm ? '/api/commodities/options/chain' : '/api/options/chain';
      const url = `${endpoint}?underlying=${coin}${exp ? `&expiry=${encodeURIComponent(exp)}` : ''}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Options service returned status ${res.status}`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        setChainData(json.data);
        const expiries = json.data.availableExpiries || [];
        if (!exp && expiries.length > 0) {
          setSelectedExpiry(expiries[0]);
        }
      } else {
        throw new Error(json.error || 'Failed to parse options chain data');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      console.warn('[OptionsChainView] Notice fetching options chain:', err?.message || err);
      setFetchError(err?.message || 'Failed to connect to Delta Exchange options feed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChain(activeUnderlying, selectedExpiry);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [activeUnderlying, selectedExpiry]);

  const handleSwitchUnderlying = (coin: string) => {
    setActiveUnderlying(coin);
    setSelectedExpiry('');
    fetchChain(coin, '');
  };

  const formatExpiryDate = (exp: string | undefined): string => {
    if (!exp) return '—';
    try {
      const d = new Date(exp);
      return !isNaN(d.getTime()) ? d.toUTCString().slice(0, 16) : String(exp);
    } catch {
      return String(exp);
    }
  };

  const rows = chainData?.rows || [];
  const summary = chainData?.summary;
  const availableExpiries = chainData?.availableExpiries || [];

  return (
    <div className="space-y-4">
      {/* Underlying Options Switcher */}
      <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl text-xs font-mono">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-zinc-400">Underlying Asset Options:</span>
          <span className="font-bold text-white">{activeUnderlying}</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(isCommodity ? COMMODITY_OPTIONS_UNDERLYINGS : CRYPTO_OPTIONS_UNDERLYINGS).map((c) => (
            <button
              key={c}
              onClick={() => handleSwitchUnderlying(c)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                activeUnderlying === c ? 'bg-cyan-500 text-black shadow-sm' : 'bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Fetch Error Banner */}
      {fetchError && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 text-xs font-mono text-rose-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Options Feed: {fetchError}</span>
          </div>
          <button
            onClick={() => fetchChain(activeUnderlying, selectedExpiry)}
            className="flex items-center gap-1 px-3 py-1 bg-rose-800/60 hover:bg-rose-700/60 text-white rounded text-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Chain Summary Statistics Banner */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-900 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider">
                INSTITUTIONAL DERIVATIVES ENGINE
              </span>
              <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono">
                {isCommodity ? 'COMEX · NYMEX · MCX DERIVATIVES' : 'DELTA EXCHANGE INDIA'}
              </span>
              {isLoading && (
                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded font-mono animate-pulse">
                  Syncing...
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-white mt-1">
              {activeUnderlying} Options Chain & Greeks
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Underlying Switcher */}
            <div className="flex items-center bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              {(isCommodity ? COMMODITY_OPTIONS_UNDERLYINGS : CRYPTO_OPTIONS_UNDERLYINGS).map((coin) => (
                <button
                  key={coin}
                  onClick={() => handleSwitchUnderlying(coin)}
                  className={`px-3 py-1 rounded text-xs font-bold font-mono transition-colors ${
                    activeUnderlying === coin
                      ? 'bg-cyan-500 text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {coin}
                </button>
              ))}
            </div>

            {/* Expiry Dropdown */}
            {availableExpiries.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-400">EXPIRY:</span>
                <select
                  value={selectedExpiry}
                  onChange={(e) => setSelectedExpiry(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-cyan-400 text-xs font-mono font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
                >
                  {availableExpiries.map((exp) => (
                    <option key={exp} value={exp}>
                      {formatExpiryDate(exp)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => fetchChain(activeUnderlying, selectedExpiry)}
              disabled={isLoading}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 transition-colors disabled:opacity-50"
              title="Refresh Options Chain"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        {summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs font-mono">
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
              <span className="text-zinc-500 block text-[10px]">UNDERLYING SPOT</span>
              <span className="text-white font-bold text-sm">
                {safePrice(summary.underlyingPrice)}
              </span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
              <span className="text-zinc-500 block text-[10px]">ATM STRIKE</span>
              <span className="text-cyan-400 font-bold text-sm">
                {safePrice(summary.atmStrike)}
              </span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
              <span className="text-zinc-500 block text-[10px]">PUT-CALL RATIO (PCR)</span>
              <span
                className={`font-bold text-sm ${
                  summary.putCallRatio > 1.2
                    ? 'text-emerald-400'
                    : summary.putCallRatio < 0.7
                    ? 'text-rose-400'
                    : 'text-amber-300'
                }`}
              >
                {summary.putCallRatio}
              </span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
              <span className="text-zinc-500 block text-[10px]">MAX PAIN STRIKE</span>
              <span className="text-purple-400 font-bold text-sm">
                {safePrice(summary.maxPainStrike)}
              </span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
              <span className="text-zinc-500 block text-[10px]">TOTAL CALL OI</span>
              <span className="text-emerald-400 font-bold text-sm">
                {safeToLocale(summary.totalCallOI)}
              </span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
              <span className="text-zinc-500 block text-[10px]">TOTAL PUT OI</span>
              <span className="text-rose-400 font-bold text-sm">
                {safeToLocale(summary.totalPutOI)}
              </span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
              <span className="text-zinc-500 block text-[10px]">RESISTANCE (CALL OI)</span>
              <span className="text-rose-300 font-bold text-sm">
                {safePrice(summary.highestCallOIStrike)}
              </span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
              <span className="text-zinc-500 block text-[10px]">SUPPORT (PUT OI)</span>
              <span className="text-emerald-300 font-bold text-sm">
                {safePrice(summary.highestPutOIStrike)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-zinc-500 font-mono text-xs">
            {isLoading ? 'Computing Greek metrics & Open Interest...' : 'No summary data available for this selection.'}
          </div>
        )}
      </div>

      {/* Main Chain Matrix */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 font-mono space-y-3">
            <Layers className="w-8 h-8 text-zinc-600 mx-auto animate-pulse" />
            <p className="text-sm">
              {isLoading
                ? `Loading ${activeUnderlying} Options Chain from Delta Exchange India...`
                : `No active options series found for ${activeUnderlying}.`}
            </p>
            {!isLoading && (
              <button
                onClick={() => handleSwitchUnderlying(activeUnderlying === 'BTC' ? 'ETH' : 'BTC')}
                className="px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg text-xs hover:bg-cyan-500/20 transition-colors"
              >
                Switch to {activeUnderlying === 'BTC' ? 'ETH' : 'BTC'} Options Chain
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-center text-xs font-mono border-collapse">
              <thead className="bg-zinc-900 sticky top-0 z-20 select-none text-[10px] tracking-wider uppercase">
                {/* Super Header */}
                <tr className="border-b border-zinc-800">
                  <th colSpan={8} className="py-2 bg-emerald-950/20 text-emerald-400 border-r border-zinc-800 font-bold">
                    CALL OPTIONS (BULLISH)
                  </th>
                  <th className="py-2 bg-zinc-900 text-white font-bold px-4">STRIKE</th>
                  <th colSpan={8} className="py-2 bg-rose-950/20 text-rose-400 border-l border-zinc-800 font-bold">
                    PUT OPTIONS (BEARISH)
                  </th>
                </tr>
                {/* Columns Header */}
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/90">
                  {/* Calls */}
                  <th className="py-2.5 px-2 text-right">OI</th>
                  <th className="py-2.5 px-2 text-right">Vol</th>
                  <th className="py-2.5 px-2 text-right">IV%</th>
                  <th className="py-2.5 px-2 text-right">Delta</th>
                  <th className="py-2.5 px-2 text-right">Theta</th>
                  <th className="py-2.5 px-2 text-right">Bid</th>
                  <th className="py-2.5 px-2 text-right">Ask</th>
                  <th className="py-2.5 px-2 text-right border-r border-zinc-800 font-bold text-emerald-400">
                    LTP ($)
                  </th>

                  {/* Strike */}
                  <th className="py-2.5 px-4 font-bold text-white bg-zinc-900">STRIKE ($)</th>

                  {/* Puts */}
                  <th className="py-2.5 px-2 text-left border-l border-zinc-800 font-bold text-rose-400">
                    LTP ($)
                  </th>
                  <th className="py-2.5 px-2 text-left">Bid</th>
                  <th className="py-2.5 px-2 text-left">Ask</th>
                  <th className="py-2.5 px-2 text-left">Theta</th>
                  <th className="py-2.5 px-2 text-left">Delta</th>
                  <th className="py-2.5 px-2 text-left">IV%</th>
                  <th className="py-2.5 px-2 text-left">Vol</th>
                  <th className="py-2.5 px-2 text-left">OI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {rows.map((row) => {
                  const isATM = row.isATM;
                  const callITM = row.moneynessCall === 'ITM';
                  const putITM = row.moneynessPut === 'ITM';

                  return (
                    <tr
                      key={row.strike}
                      className={`transition-colors ${
                        isATM
                          ? 'bg-cyan-950/30 font-semibold'
                          : 'hover:bg-zinc-900/40'
                      }`}
                    >
                      {/* Calls Data */}
                      <td className={`py-2 px-2 text-right ${callITM ? 'bg-emerald-950/10' : ''}`}>
                        <span className="text-cyan-300">{row.call?.oi ?? '—'}</span>
                      </td>
                      <td className={`py-2 px-2 text-right text-zinc-400 ${callITM ? 'bg-emerald-950/10' : ''}`}>
                        {row.call?.volume ?? '—'}
                      </td>
                      <td className={`py-2 px-2 text-right text-amber-400 ${callITM ? 'bg-emerald-950/10' : ''}`}>
                        {row.call?.iv ? `${row.call.iv}%` : '—'}
                      </td>
                      <td className={`py-2 px-2 text-right text-zinc-300 ${callITM ? 'bg-emerald-950/10' : ''}`}>
                        {row.call?.delta ?? '—'}
                      </td>
                      <td className={`py-2 px-2 text-right text-rose-400/80 ${callITM ? 'bg-emerald-950/10' : ''}`}>
                        {row.call?.theta ?? '—'}
                      </td>
                      <td className={`py-2 px-2 text-right text-zinc-400 ${callITM ? 'bg-emerald-950/10' : ''}`}>
                        {row.call?.bid !== null && row.call?.bid !== undefined ? safePrice(row.call.bid, 2, '—') : '—'}
                      </td>
                      <td className={`py-2 px-2 text-right text-zinc-400 ${callITM ? 'bg-emerald-950/10' : ''}`}>
                        {row.call?.ask !== null && row.call?.ask !== undefined ? safePrice(row.call.ask, 2, '—') : '—'}
                      </td>
                      <td
                        onClick={() => row.call?.symbol && onSelectOption && onSelectOption(row.call.symbol)}
                        className={`py-2 px-2 text-right font-bold text-white border-r border-zinc-800 cursor-pointer hover:underline ${
                          callITM ? 'bg-emerald-950/30 text-emerald-300' : ''
                        }`}
                      >
                        {row.call?.ltp !== null && row.call?.ltp !== undefined ? safePrice(row.call.ltp, 2, '—') : '—'}
                      </td>

                      {/* Strike */}
                      <td
                        className={`py-2 px-4 font-bold text-center ${
                          isATM
                            ? 'bg-cyan-500/20 text-cyan-300 border-x-2 border-cyan-500'
                            : 'bg-zinc-900/80 text-white'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>{safePrice(row.strike)}</span>
                          {isATM && (
                            <span className="text-[9px] px-1 py-0.2 bg-cyan-400 text-black font-black rounded uppercase">
                              ATM
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Puts Data */}
                      <td
                        onClick={() => row.put?.symbol && onSelectOption && onSelectOption(row.put.symbol)}
                        className={`py-2 px-2 text-left font-bold text-white border-l border-zinc-800 cursor-pointer hover:underline ${
                          putITM ? 'bg-rose-950/30 text-rose-300' : ''
                        }`}
                      >
                        {row.put?.ltp !== null && row.put?.ltp !== undefined ? safePrice(row.put.ltp, 2, '—') : '—'}
                      </td>
                      <td className={`py-2 px-2 text-left text-zinc-400 ${putITM ? 'bg-rose-950/10' : ''}`}>
                        {row.put?.bid !== null && row.put?.bid !== undefined ? safePrice(row.put.bid, 2, '—') : '—'}
                      </td>
                      <td className={`py-2 px-2 text-left text-zinc-400 ${putITM ? 'bg-rose-950/10' : ''}`}>
                        {row.put?.ask !== null && row.put?.ask !== undefined ? safePrice(row.put.ask, 2, '—') : '—'}
                      </td>
                      <td className={`py-2 px-2 text-left text-rose-400/80 ${putITM ? 'bg-rose-950/10' : ''}`}>
                        {row.put?.theta ?? '—'}
                      </td>
                      <td className={`py-2 px-2 text-left text-zinc-300 ${putITM ? 'bg-rose-950/10' : ''}`}>
                        {row.put?.delta ?? '—'}
                      </td>
                      <td className={`py-2 px-2 text-left text-amber-400 ${putITM ? 'bg-rose-950/10' : ''}`}>
                        {row.put?.iv ? `${row.put.iv}%` : '—'}
                      </td>
                      <td className={`py-2 px-2 text-left text-zinc-400 ${putITM ? 'bg-rose-950/10' : ''}`}>
                        {row.put?.volume ?? '—'}
                      </td>
                      <td className={`py-2 px-2 text-left ${putITM ? 'bg-rose-950/10' : ''}`}>
                        <span className="text-cyan-300">{row.put?.oi ?? '—'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
