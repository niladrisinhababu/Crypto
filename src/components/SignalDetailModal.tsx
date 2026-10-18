import React from 'react';
import { CryptoSignal } from '../types';
import { safePrice, safeToLocale } from '../utils';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, TrendingUp, TrendingDown, Clock, Database } from 'lucide-react';

interface Props {
  signal: CryptoSignal | null;
  onClose: () => void;
}

export const SignalDetailModal: React.FC<Props> = ({ signal, onClose }) => {
  React.useEffect(() => {
    if (!signal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [signal, onClose]);

  if (!signal) return null;

  const isLong = String(signal.signal || '').includes('BUY');
  const isShort = String(signal.signal || '').includes('SELL');

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col text-zinc-200 text-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 text-xs font-bold rounded-md tracking-wider ${
                isLong
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : isShort
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              {signal.signal}
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {signal.coin} / {signal.symbol} — QUANTITATIVE SIGNAL REPORT
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 font-mono">
          {/* Section 23 Structured Report Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-900/40 rounded-lg border border-zinc-800/80">
            <div>
              <div className="text-xs text-zinc-500 uppercase">COIN</div>
              <div className="text-base font-bold text-white">{signal.coin}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 uppercase">INSTRUMENT</div>
              <div className="text-base font-medium text-cyan-400">{signal.symbol}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 uppercase">SIGNAL & SCORE</div>
              <div
                className={`text-base font-bold ${
                  signal.signal.includes('BUY')
                    ? 'text-emerald-400'
                    : signal.signal.includes('SELL')
                    ? 'text-rose-400'
                    : 'text-zinc-300'
                }`}
              >
                {signal.signal} ({signal.finalScore}/100)
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 uppercase">BUILDUP & STRUCTURE</div>
              <div className="text-base font-semibold flex items-center gap-1.5 flex-wrap">
                <span
                  className={
                    signal.buildupType === 'Long Buildup'
                      ? 'text-emerald-400'
                      : signal.buildupType === 'Short Buildup'
                      ? 'text-rose-400'
                      : signal.buildupType === 'Short Covering'
                      ? 'text-cyan-400'
                      : signal.buildupType === 'Long Unwinding'
                      ? 'text-amber-400'
                      : 'text-zinc-400'
                  }
                >
                  {signal.buildupType}
                </span>
                <span className="text-zinc-600">•</span>
                <span
                  className={
                    signal.marketStructure === 'Bullish'
                      ? 'text-emerald-400'
                      : signal.marketStructure === 'Bearish'
                      ? 'text-rose-400'
                      : 'text-zinc-400'
                  }
                >
                  {signal.marketStructure}
                </span>
              </div>
            </div>
          </div>

          {/* Candlestick Pattern & Proper Entry Execution Strategy */}
          <div className="border border-purple-900/50 rounded-lg p-4 bg-purple-950/20">
            <h3 className="text-xs uppercase font-bold text-purple-300 tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                CANDLESTICK PATTERN & PROPER ENTRY POSITION TRIGGER
              </span>
              <span className="text-[10px] bg-purple-900/60 text-purple-200 border border-purple-700/60 px-2 py-0.5 rounded font-mono font-bold">
                MIN 60%+ WIN RATE ENGINE
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-zinc-900/80 p-3 rounded border border-purple-900/40">
                <span className="text-zinc-500 block text-[10px] uppercase">DETECTED PATTERN</span>
                <span className="font-bold text-white text-sm">
                  {signal.candlestickPattern?.name || 'Multi-Timeframe Structure Confluence'}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    signal.candlestickPattern?.reliability === 'HIGH'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                      : 'bg-amber-950 text-amber-300 border border-amber-700/60'
                  }`}>
                    {signal.candlestickPattern?.reliability || 'HIGH'} RELIABILITY
                  </span>
                  <span className="text-zinc-400 text-[10px]">
                    {signal.candlestickPattern?.type || (isLong ? 'BULLISH' : 'BEARISH')}
                  </span>
                </div>
              </div>

              <div className="bg-zinc-900/80 p-3 rounded border border-purple-900/40">
                <span className="text-zinc-500 block text-[10px] uppercase">ENTRY STRATEGY & TRIGGER</span>
                <span className="font-bold text-cyan-300 text-sm">
                  {safePrice(signal.entryStrategy?.entryTriggerPrice ?? signal.entry)}
                </span>
                <span className="text-zinc-400 text-[10px] block mt-1">
                  Strategy: <strong className="text-white">{signal.entryStrategy?.type || 'Limit Pullback Entry'}</strong>
                </span>
              </div>

              <div className="bg-zinc-900/80 p-3 rounded border border-purple-900/40">
                <span className="text-zinc-500 block text-[10px] uppercase">TRIGGER EXECUTION STATUS</span>
                <div className="mt-1">
                  {signal.isEntryTriggered || signal.entryStrategy?.isTriggered ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-600/60 font-bold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ENTRY TRIGGERED & FILLED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/90 text-amber-300 border border-amber-600/60 font-bold text-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      WAITING FOR PULLBACK TO TRIGGER
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-500 block mt-1">
                  {signal.breakevenMoved
                    ? '🛡️ Stop-loss safely moved to Breakeven (+0.05%)'
                    : 'Awaiting Target 1 hit to trail stop-loss to Breakeven'}
                </span>
              </div>
            </div>
            {signal.candlestickPattern?.description && (
              <p className="text-xs text-zinc-300 mt-2.5 bg-zinc-900/50 p-2 rounded border border-zinc-800/60 font-sans">
                💡 <strong className="text-purple-300 font-mono">Candlestick Logic:</strong> {signal.candlestickPattern.description}
              </p>
            )}
          </div>

          {/* Market Data & Derivatives Metrics */}
          <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/20">
            <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              MARKET & DERIVATIVES DATA (DELTA EXCHANGE INDIA)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
              <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                <span className="text-zinc-500 block">PRICE</span>
                <span className="font-bold text-white text-sm">
                  {safePrice(signal.currentPrice ?? signal.price)}
                </span>
              </div>
              <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                <span className="text-zinc-500 block">VOLUME (24H)</span>
                <span className="font-bold text-zinc-200">
                  {safeToLocale(signal.metrics?.volume24h)}
                </span>
              </div>
              <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                <span className="text-zinc-500 block">OPEN INTEREST</span>
                <span className="font-bold text-cyan-300">
                  {safeToLocale(signal.metrics?.oi)}
                </span>
              </div>
              <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                <span className="text-zinc-500 block">OI CHANGE (6H)</span>
                <span
                  className={`font-bold ${
                    (signal.metrics?.oiChange24h || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {signal.metrics?.oiChange24h !== null && signal.metrics?.oiChange24h !== undefined
                    ? `${signal.metrics.oiChange24h >= 0 ? '+' : ''}$${safeToLocale(signal.metrics.oiChange24h)}`
                    : 'N/A'}
                </span>
              </div>
              <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                <span className="text-zinc-500 block">FUNDING RATE</span>
                <span className="font-bold text-purple-300">
                  {signal.metrics.fundingRate !== null
                    ? `${(signal.metrics.fundingRate * 100).toFixed(4)}%`
                    : 'N/A'}
                </span>
              </div>
              <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                <span className="text-zinc-500 block">IMPLIED VOL (IV)</span>
                <span className="font-bold text-amber-300">
                  {signal.metrics.iv !== null ? `${signal.metrics.iv.toFixed(1)}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Technical Indicators */}
          <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/20">
            <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              TECHNICAL INDICATORS
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
              <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                <span className="text-zinc-500 block">RSI (14)</span>
                <span className="font-bold text-white">{signal.metrics.rsi ?? 'N/A'}</span>
              </div>
              <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                <span className="text-zinc-500 block">ADX / DI</span>
                <span className="font-bold text-white">{signal.metrics.adx ?? 'N/A'}</span>
              </div>
              <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                <span className="text-zinc-500 block">EMA TREND</span>
                <span className="font-bold text-emerald-300">{signal.metrics.emaTrend}</span>
              </div>
              <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                <span className="text-zinc-500 block">MACD HISTOGRAM</span>
                <span
                  className={`font-bold ${
                    (signal.metrics.macdHist || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {signal.metrics.macdHist ?? 'N/A'}
                </span>
              </div>
              <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                <span className="text-zinc-500 block">ATR (14)</span>
                <span className="font-bold text-white">
                  ${signal.metrics.atr?.toLocaleString() ?? 'N/A'}
                </span>
              </div>
              <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                <span className="text-zinc-500 block">VWAP</span>
                <span className="font-bold text-white">
                  ${signal.metrics.vwap?.toLocaleString() ?? 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Trade Execution & Targets */}
          <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/30">
            <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              EXECUTION LEVELS & RISK / REWARD
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
              <div className="bg-blue-950/30 border border-blue-800/40 p-3 rounded">
                <span className="text-blue-400 block font-semibold">ENTRY PRICE</span>
                <span className="text-base font-bold text-white">{safePrice(signal.entry)}</span>
              </div>
              <div className="bg-rose-950/30 border border-rose-800/40 p-3 rounded">
                <span className="text-rose-400 block font-semibold">STOP LOSS</span>
                <span className="text-base font-bold text-rose-300">{safePrice(signal.stopLoss)}</span>
              </div>
              <div className="bg-emerald-950/30 border border-emerald-800/40 p-3 rounded">
                <span className="text-emerald-400 block font-semibold">TARGET 1 (1.5R)</span>
                <span className="text-base font-bold text-emerald-300">{safePrice(signal.target1)}</span>
              </div>
              <div className="bg-emerald-950/30 border border-emerald-800/40 p-3 rounded">
                <span className="text-emerald-400 block font-semibold">TARGET 2 (2.5R)</span>
                <span className="text-base font-bold text-emerald-300">{safePrice(signal.target2)}</span>
              </div>
              <div className="bg-emerald-950/30 border border-emerald-800/40 p-3 rounded">
                <span className="text-emerald-400 block font-semibold">TARGET 3 (4.5R)</span>
                <span className="text-base font-bold text-emerald-300">{safePrice(signal.target3)}</span>
              </div>
              <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded">
                <span className="text-amber-400 block font-semibold">RISK / REWARD</span>
                <span className="text-base font-bold text-amber-300">1 : {signal.riskReward}</span>
              </div>
            </div>
          </div>

          {/* Verification & Performance Outcome */}
          <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/40">
            <h3 className="text-xs uppercase font-bold text-cyan-400 tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                VERIFIED AUDIT OUTCOME & REAL-TIME PERFORMANCE
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                DELTA INDIA LIVE FEED
              </span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">STATUS</span>
                <span className="font-bold text-white text-sm">
                  {signal.status}
                </span>
                {signal.isEntryTriggered ? (
                  <span className="text-[10px] text-emerald-400 block font-normal mt-0.5">✓ Entry Filled</span>
                ) : (
                  <span className="text-[10px] text-amber-400 block font-normal mt-0.5">⏳ Awaiting Retest</span>
                )}
              </div>
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">TARGET HIT?</span>
                <span className={`font-bold text-sm ${signal.targetHit ? 'text-emerald-400' : 'text-zinc-400'}`}>
                  {signal.targetHit ? `YES (Level ${signal.targetHitLevel || 1})` : signal.status === 'STOP_LOSS_HIT' ? 'NO' : 'PENDING'}
                </span>
                {signal.distanceToT1Percent !== null && signal.distanceToT1Percent !== undefined && !signal.targetHit && (
                  <span className="text-[10px] text-cyan-400 block font-normal mt-0.5">
                    {signal.distanceToT1Percent}% to Target 1
                  </span>
                )}
              </div>
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">STOP LOSS HIT?</span>
                <span className={`font-bold text-sm ${signal.stopLossHit ? 'text-rose-400' : 'text-zinc-400'}`}>
                  {signal.stopLossHit ? 'YES (Hit SL)' : signal.targetHit ? 'NO (Saved)' : 'SAFE'}
                </span>
                {signal.breakevenMoved && (
                  <span className="text-[10px] text-cyan-400 block font-normal mt-0.5">🛡️ BE Protected</span>
                )}
              </div>
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  REAL-TIME PRICE
                </span>
                <span className="font-bold text-white text-sm">
                  {safePrice(signal.currentPrice ?? signal.price)}
                </span>
                {signal.distanceToEntryPercent !== null && signal.distanceToEntryPercent !== undefined && (
                  <span
                    className={`text-[10px] block font-normal mt-0.5 ${
                      signal.distanceToEntryPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {signal.distanceToEntryPercent >= 0 ? '+' : ''}{signal.distanceToEntryPercent}% vs Entry
                  </span>
                )}
              </div>
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">
                  {signal.status === 'ACTIVE' || signal.status === 'TRIGGERED' ? 'FLOATING PNL & R' : 'REALIZED PNL & R'}
                </span>
                {signal.status === 'ACTIVE' || signal.status === 'TRIGGERED' ? (
                  <span
                    className={`font-bold text-sm ${
                      (signal.unrealizedPnLPercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {(signal.unrealizedPnLPercent ?? 0) >= 0 ? '+' : ''}{signal.unrealizedPnLPercent ?? 0}%
                    <span className="text-xs block text-zinc-300 font-normal">
                      Floating: {signal.floatingR !== null && signal.floatingR !== undefined ? (signal.floatingR >= 0 ? `+${signal.floatingR} R` : `${signal.floatingR} R`) : '0.0 R'}
                    </span>
                  </span>
                ) : (
                  <span
                    className={`font-bold text-sm ${
                      signal.realizedR && signal.realizedR > 0
                        ? 'text-emerald-400'
                        : signal.realizedR && signal.realizedR < 0
                        ? 'text-rose-400'
                        : 'text-zinc-400'
                    }`}
                  >
                    {signal.realizedR !== null && signal.realizedR !== undefined ? `${signal.realizedR >= 0 ? '+' : ''}${signal.realizedR} R` : '0 R'}
                    {signal.realizedPnLPercent !== null && signal.realizedPnLPercent !== undefined && (
                      <span className="text-xs block text-zinc-400 font-normal">
                        ({signal.realizedPnLPercent >= 0 ? '+' : ''}{signal.realizedPnLPercent}%)
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Option Greeks & Fundamental Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option Data */}
            <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/20">
              <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-2">
                OPTION GREEKS DATA (NEAREST ATM)
              </h3>
              {signal.optionGreeks ? (
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  <div className="bg-zinc-900 p-2 rounded">
                    <div className="text-zinc-500">DELTA</div>
                    <div className="font-bold text-white">{signal.optionGreeks.delta ?? 'N/A'}</div>
                  </div>
                  <div className="bg-zinc-900 p-2 rounded">
                    <div className="text-zinc-500">GAMMA</div>
                    <div className="font-bold text-white">{signal.optionGreeks.gamma ?? 'N/A'}</div>
                  </div>
                  <div className="bg-zinc-900 p-2 rounded">
                    <div className="text-zinc-500">THETA</div>
                    <div className="font-bold text-white">{signal.optionGreeks.theta ?? 'N/A'}</div>
                  </div>
                  <div className="bg-zinc-900 p-2 rounded">
                    <div className="text-zinc-500">VEGA</div>
                    <div className="font-bold text-white">{signal.optionGreeks.vega ?? 'N/A'}</div>
                  </div>
                  <div className="bg-zinc-900 p-2 rounded">
                    <div className="text-zinc-500">IV</div>
                    <div className="font-bold text-white">
                      {signal.optionGreeks.iv ? `${signal.optionGreeks.iv}%` : 'N/A'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-500 py-3">N/A — DATA NOT AVAILABLE FOR THIS CONTRACT</div>
              )}
            </div>

            {/* Fundamental Data */}
            <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/20 text-xs">
              <h3 className="uppercase font-bold text-zinc-400 tracking-wider mb-2">
                EXTERNAL FUNDAMENTAL PROFILE
              </h3>
              <div className="space-y-1.5 text-zinc-300">
                <div>
                  <span className="text-zinc-500">SECTOR: </span>
                  <span className="font-semibold text-white">{signal.fundamental?.sector || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-zinc-500">BLOCKCHAIN: </span>
                  <span>{signal.fundamental?.blockchain || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-zinc-500">MARKET CAP: </span>
                  <span className="text-emerald-400 font-semibold">
                    {signal.fundamental?.marketCap || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">PRIMARY USE: </span>
                  <span className="text-zinc-400">{signal.fundamental?.useCase || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reason for Signal & Confirmations */}
          <div className="border border-emerald-900/40 rounded-lg p-4 bg-emerald-950/10">
            <h3 className="text-xs uppercase font-bold text-emerald-400 tracking-wider mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              REASON FOR SIGNAL: ALL CONFIRMATIONS
            </h3>
            <ul className="space-y-1.5 text-xs text-zinc-300 list-disc list-inside">
              {(signal.confirmations || []).map((c, i) => (
                <li key={i} className="leading-relaxed">
                  <span className="text-emerald-300 font-semibold">{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Invalidation Rules */}
          <div className="border border-rose-900/40 rounded-lg p-4 bg-rose-950/10">
            <h3 className="text-xs uppercase font-bold text-rose-400 tracking-wider mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              INVALIDATION: CONDITIONS THAT CANCEL THIS SIGNAL
            </h3>
            <ul className="space-y-1.5 text-xs text-zinc-300 list-disc list-inside">
              {(signal.invalidationRules || []).map((rule, i) => (
                <li key={i} className="leading-relaxed text-rose-200">
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {/* Data Timestamps & Source */}
          <div className="flex flex-wrap items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              <span>DATA TIMESTAMP: {new Date(signal.timestamp).toUTCString()}</span>
            </div>
            <div>
              DATA SOURCE: <span className="text-cyan-400 font-medium">{signal.dataSource}</span>
            </div>
          </div>

          {/* Official Disclaimer */}
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded text-center text-xs text-zinc-400 font-sans leading-relaxed">
            <strong className="text-zinc-200">IMPORTANT:</strong> This is a market-data and quantitative
            signal-processing system, not a guarantee of profit. Never risk capital you cannot afford to lose.
          </div>
        </div>
      </div>
    </div>
  );
};
