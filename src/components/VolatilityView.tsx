import React, { useState, useEffect } from 'react';
import { VolatilityAnalytics } from '../types';
import { safePrice, safeToLocale } from '../utils';
import { Flame, ShieldAlert, TrendingUp, Info, HelpCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface Props {
  underlying: string;
}

export const VolatilityView: React.FC<Props> = ({ underlying }) => {
  const [data, setData] = useState<VolatilityAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchVolatility = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/volatility?underlying=${underlying}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch Volatility data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVolatility();
  }, [underlying]);

  if (!data) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-12 text-center text-zinc-400 font-mono">
        Loading Vega & Volatility Analytics for {underlying}...
      </div>
    );
  }

  const { regimes } = data;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              VEGA & IMPLIED VOLATILITY TERMINAL
            </span>
            <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono">
              REAL-TIME DISPERSION
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            {underlying} Volatility Surface & Regimes
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Log-return historical volatility vs. live market implied volatility surface, skew smile, and term structure.
          </p>
        </div>

        {/* Volatility Regimes Badges */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
          <span
            className={`px-2.5 py-1 rounded border font-bold ${
              regimes.highIV
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-zinc-900 text-zinc-500 border-zinc-800'
            }`}
          >
            HIGH IV
          </span>
          <span
            className={`px-2.5 py-1 rounded border font-bold ${
              regimes.lowIV
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-zinc-900 text-zinc-500 border-zinc-800'
            }`}
          >
            LOW IV
          </span>
          <span
            className={`px-2.5 py-1 rounded border font-bold ${
              regimes.ivGreaterThanHV
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
            }`}
          >
            {regimes.ivGreaterThanHV ? 'IV > HV (RICH)' : 'IV < HV (CHEAP)'}
          </span>
          {regimes.volatilityBreakout && (
            <span className="px-2.5 py-1 rounded border font-black bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse">
              VOL BREAKOUT
            </span>
          )}
        </div>
      </div>

      {/* Volatility Core Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs font-mono">
        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-lg">
          <span className="text-zinc-500 block text-[10px]">CURRENT ATM IV</span>
          <span className="text-xl font-bold text-amber-300">
            {data.currentIV !== null ? `${data.currentIV}%` : 'N/A'}
          </span>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-lg">
          <span className="text-zinc-500 block text-[10px]">HISTORICAL VOL (10D)</span>
          <span className="text-xl font-bold text-white">
            {data.historicalVolatility10d !== null ? `${data.historicalVolatility10d}%` : 'N/A'}
          </span>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-lg">
          <span className="text-zinc-500 block text-[10px]">HISTORICAL VOL (30D)</span>
          <span className="text-xl font-bold text-white">
            {data.historicalVolatility30d !== null ? `${data.historicalVolatility30d}%` : 'N/A'}
          </span>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-lg">
          <span className="text-zinc-500 block text-[10px]">IV - HV SPREAD</span>
          <span
            className={`text-xl font-bold ${
              (data.ivVsHvSpread || 0) >= 0 ? 'text-amber-400' : 'text-cyan-400'
            }`}
          >
            {data.ivVsHvSpread !== null ? `${data.ivVsHvSpread >= 0 ? '+' : ''}${data.ivVsHvSpread}%` : 'N/A'}
          </span>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-lg">
          <span className="text-zinc-500 block text-[10px]">IV RANK</span>
          <span className="text-xl font-bold text-cyan-400">
            {data.ivRank !== null ? `${data.ivRank}%` : 'N/A*'}
          </span>
          {!data.hasSufficientHistoricalData && (
            <span className="text-[9px] text-zinc-500 block">*Need ≥30d</span>
          )}
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-lg">
          <span className="text-zinc-500 block text-[10px]">IV PERCENTILE</span>
          <span className="text-xl font-bold text-cyan-400">
            {data.ivPercentile !== null ? `${data.ivPercentile}%` : 'N/A*'}
          </span>
          {!data.hasSufficientHistoricalData && (
            <span className="text-[9px] text-zinc-500 block">*Need ≥30d</span>
          )}
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-lg">
          <span className="text-zinc-500 block text-[10px]">VEGA EXPOSURE</span>
          <span className="text-xl font-bold text-purple-300">
            {safePrice(data.vegaExposure, 0)}
          </span>
        </div>
      </div>

      {/* Visual Volatility Curves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volatility Skew Smile */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Volatility Skew (IV vs. Strike Price)</h2>
              <p className="text-xs text-zinc-400">
                Shows asymmetric downside put protection demand vs upside call speculation.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-zinc-400">OTM Put IV: <strong className="text-rose-400">{data.otmPutIV ?? 'N/A'}%</strong></span>
              <span className="text-zinc-400">OTM Call IV: <strong className="text-emerald-400">{data.otmCallIV ?? 'N/A'}%</strong></span>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.volatilitySkew}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="strike"
                  stroke="#71717a"
                  fontSize={11}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <YAxis stroke="#71717a" fontSize={11} domain={['auto', 'auto']} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    borderColor: '#27272a',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                  formatter={(val: any) => [`${val}%`, 'Implied Vol']}
                  labelFormatter={(label) => `Strike: ${safePrice(label)}`}
                />
                <Line
                  type="monotone"
                  dataKey="iv"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#f59e0b' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Term Structure */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Term Structure (IV across Expiries)</h2>
              <p className="text-xs text-zinc-400">
                Contango (upward sloping) vs. Backwardation (downward sloping event inversion).
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400 font-semibold">
              {data.termStructure.length} Expiries Sampled
            </span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.termStructure}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="expiry" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} domain={['auto', 'auto']} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    borderColor: '#27272a',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                  formatter={(val: any) => [`${val}%`, 'ATM IV']}
                  labelFormatter={(label) => `Settlement: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="iv"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#06b6d4' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
