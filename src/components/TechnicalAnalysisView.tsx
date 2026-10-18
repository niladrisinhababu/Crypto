import React, { useState, useEffect } from 'react';
import { TechnicalIndicators, MarketStructure, Candle, MultiTimeframeTrends } from '../types';
import { safePrice, safeToLocale } from '../utils';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  ChevronDown,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface Props {
  symbol: string;
}

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '1d'];

export const TechnicalAnalysisView: React.FC<Props> = ({ symbol }) => {
  const [resolution, setResolution] = useState('1h');
  const [data, setData] = useState<{
    candles: Candle[];
    indicators: TechnicalIndicators;
    marketStructure: MarketStructure;
    multiTimeframe: MultiTimeframeTrends;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTechnicals = async (tf: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/technicals?symbol=${symbol}&resolution=${tf}&limit=80`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        setData({
          candles: json.candles,
          indicators: json.indicators,
          marketStructure: json.marketStructure,
          multiTimeframe: json.multiTimeframe,
        });
      }
    } catch (err) {
      console.warn('Failed to fetch technical indicators:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicals(resolution);
  }, [symbol, resolution]);

  if (!data) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-12 text-center text-zinc-400 font-mono">
        Loading Technicals for {symbol}...
      </div>
    );
  }

  const { candles, indicators, marketStructure, multiTimeframe } = data;

  // Chart data format
  const chartData = candles.map((c, i) => {
    const d = new Date(c.time * 1000);
    return {
      time: `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`,
      close: c.close,
      open: c.open,
      high: c.high,
      low: c.low,
      volume: c.volume,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header & Timeframe Bar */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider">
              QUANTITATIVE TECHNICAL SUITE
            </span>
            <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono">
              DYNAMIC OHLCV FEED
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            {symbol} Multi-Factor Technical Intelligence
          </h1>
        </div>

        {/* Timeframe Selectors */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setResolution(tf)}
              className={`px-3 py-1 rounded font-bold transition-all ${
                resolution === tf
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Price & Volume Chart */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-4">
            <span className="text-white font-bold text-base">
              {safePrice(indicators.close)}
            </span>
            <span className="text-zinc-400">
              EMA20: <strong className="text-cyan-400">{safePrice(indicators.ema20)}</strong>
            </span>
            <span className="text-zinc-400">
              EMA50: <strong className="text-purple-400">{safePrice(indicators.ema50)}</strong>
            </span>
            <span className="text-zinc-400">
              EMA200: <strong className="text-amber-400">{safePrice(indicators.ema200)}</strong>
            </span>
            <span className="text-zinc-400">
              VWAP: <strong className="text-emerald-400">{safePrice(indicators.vwap)}</strong>
            </span>
          </div>

          <div className="text-zinc-500">
            {candles.length} Candles Processed ({resolution})
          </div>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="time" stroke="#71717a" fontSize={10} minTickGap={30} />
              <YAxis
                stroke="#71717a"
                fontSize={10}
                domain={['auto', 'auto']}
                orientation="right"
                tickFormatter={(val) => safePrice(val)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#09090b',
                  borderColor: '#27272a',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
                formatter={(val: any, name: string) => [
                  safePrice(val),
                  name === 'close' ? 'Price' : name,
                ]}
              />
              <Line
                type="monotone"
                dataKey="close"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
              <Bar dataKey="volume" fill="#27272a" opacity={0.4} yAxisId={1} />
              <YAxis yAxisId={1} orientation="left" hide domain={[0, 'dataMax * 4']} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Market Structure & Multi-Timeframe Alignment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
        {/* Structure Card */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Market Structure & Pattern Analysis
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                marketStructure.structure === 'Bullish'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : marketStructure.structure === 'Bearish'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {marketStructure.structure}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
              <span className="text-zinc-500 block text-[10px]">RECENT SWING HIGH</span>
              <span className="text-emerald-400 font-bold text-sm">
                ${marketStructure.recentHigh?.toLocaleString() ?? 'N/A'}
              </span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
              <span className="text-zinc-500 block text-[10px]">RECENT SWING LOW</span>
              <span className="text-rose-400 font-bold text-sm">
                ${marketStructure.recentLow?.toLocaleString() ?? 'N/A'}
              </span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
              <span className="text-zinc-500 block text-[10px]">BREAKOUT DETECTED</span>
              <span className="text-white font-bold">
                {marketStructure.breakoutDetected ? 'YES (Confirmed)' : 'NO'}
              </span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
              <span className="text-zinc-500 block text-[10px]">BREAKDOWN DETECTED</span>
              <span className="text-white font-bold">
                {marketStructure.breakdownDetected ? 'YES (Confirmed)' : 'NO'}
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Timeframe Alignment */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Multi-Timeframe Trend Confluence
            </h2>
            <span className="text-xs text-cyan-400 font-bold">
              Confluence: {multiTimeframe.confluenceScore}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs text-center">
            <div className="bg-zinc-900/60 p-3 rounded border border-zinc-800/60">
              <span className="text-zinc-500 block text-[10px] mb-1">15M TIMEFRAME</span>
              <span
                className={`font-bold uppercase ${
                  multiTimeframe.tf15m === 'BULLISH'
                    ? 'text-emerald-400'
                    : multiTimeframe.tf15m === 'BEARISH'
                    ? 'text-rose-400'
                    : 'text-zinc-400'
                }`}
              >
                {multiTimeframe.tf15m}
              </span>
            </div>
            <div className="bg-zinc-900/60 p-3 rounded border border-zinc-800/60">
              <span className="text-zinc-500 block text-[10px] mb-1">1H TIMEFRAME</span>
              <span
                className={`font-bold uppercase ${
                  multiTimeframe.tf1h === 'BULLISH'
                    ? 'text-emerald-400'
                    : multiTimeframe.tf1h === 'BEARISH'
                    ? 'text-rose-400'
                    : 'text-zinc-400'
                }`}
              >
                {multiTimeframe.tf1h}
              </span>
            </div>
            <div className="bg-zinc-900/60 p-3 rounded border border-zinc-800/60">
              <span className="text-zinc-500 block text-[10px] mb-1">4H TIMEFRAME</span>
              <span
                className={`font-bold uppercase ${
                  multiTimeframe.tf4h === 'BULLISH'
                    ? 'text-emerald-400'
                    : multiTimeframe.tf4h === 'BEARISH'
                    ? 'text-rose-400'
                    : 'text-zinc-400'
                }`}
              >
                {multiTimeframe.tf4h}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Indicator Matrix (All 20+ indicators) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4 font-mono text-xs">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Complete Indicator Readings
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* RSI */}
          <div className="bg-zinc-900/60 p-3 rounded border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px]">RSI (14)</span>
            <span className="text-base font-bold text-white">
              {indicators.rsi !== null ? indicators.rsi.toFixed(2) : 'N/A'}
            </span>
          </div>

          {/* ADX */}
          <div className="bg-zinc-900/60 p-3 rounded border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px]">ADX (14)</span>
            <span className="text-base font-bold text-white">
              {indicators.adx.adx !== null ? indicators.adx.adx.toFixed(2) : 'N/A'}
            </span>
          </div>

          {/* MACD Hist */}
          <div className="bg-zinc-900/60 p-3 rounded border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px]">MACD HISTOGRAM</span>
            <span
              className={`text-base font-bold ${
                (indicators.macd.histogram || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {indicators.macd.histogram !== null ? indicators.macd.histogram.toFixed(4) : 'N/A'}
            </span>
          </div>

          {/* ATR */}
          <div className="bg-zinc-900/60 p-3 rounded border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px]">ATR (14)</span>
            <span className="text-base font-bold text-amber-300">
              ${indicators.atr?.toLocaleString() ?? 'N/A'}
            </span>
          </div>

          {/* Bollinger Bandwidth */}
          <div className="bg-zinc-900/60 p-3 rounded border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px]">BB BANDWIDTH</span>
            <span className="text-base font-bold text-cyan-400">
              {indicators.bollingerBands.bandwidth !== null
                ? `${indicators.bollingerBands.bandwidth.toFixed(2)}%`
                : 'N/A'}
            </span>
          </div>

          {/* StochRSI */}
          <div className="bg-zinc-900/60 p-3 rounded border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px]">STOCH RSI (K/D)</span>
            <span className="text-base font-bold text-white">
              {indicators.stochRsi.k !== null
                ? `${indicators.stochRsi.k.toFixed(1)} / ${indicators.stochRsi.d?.toFixed(1)}`
                : 'N/A'}
            </span>
          </div>
        </div>

        {/* Pivot Points & S/R Levels */}
        <div className="pt-3 border-t border-zinc-900 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-zinc-900/40 p-2.5 rounded border border-zinc-800">
            <span className="text-zinc-500 block text-[10px]">DYNAMIC SUPPORT</span>
            <span className="text-emerald-400 font-bold">
              ${indicators.support?.toLocaleString() ?? 'N/A'}
            </span>
          </div>
          <div className="bg-zinc-900/40 p-2.5 rounded border border-zinc-800">
            <span className="text-zinc-500 block text-[10px]">DYNAMIC RESISTANCE</span>
            <span className="text-rose-400 font-bold">
              {safePrice(indicators.resistance)}
            </span>
          </div>
          <div className="bg-zinc-900/40 p-2.5 rounded border border-zinc-800">
            <span className="text-zinc-500 block text-[10px]">PIVOT (CLASSIC)</span>
            <span className="text-white font-bold">
              {safePrice(indicators.pivotPoints?.classic?.pivot)}
            </span>
          </div>
          <div className="bg-zinc-900/40 p-2.5 rounded border border-zinc-800">
            <span className="text-zinc-500 block text-[10px]">FIBONACCI PIVOT</span>
            <span className="text-purple-300 font-bold">
              {safePrice(indicators.pivotPoints?.fibonacci?.pivot)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
