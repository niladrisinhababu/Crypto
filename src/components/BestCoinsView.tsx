import React from 'react';
import { CryptoSignal } from '../types';
import { safePrice } from '../utils';
import { Sparkles, ShieldCheck, CheckCircle, ArrowUpRight, TrendingUp, AlertCircle } from 'lucide-react';

interface Props {
  bestCoins: CryptoSignal[];
  onSelectSignal: (signal: CryptoSignal) => void;
  onTradeSignal: (signal: CryptoSignal) => void;
}

export const BestCoinsView: React.FC<Props> = ({
  bestCoins,
  onSelectSignal,
  onTradeSignal,
}) => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Institutional Quality Gate Filter
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            Best Coins ({bestCoins.length} Opportunities Qualified)
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Strict filtration active: Minimum Liquidity ≥ 70%, Technical Confluence ≥ 65%, Valid Spread & Non-Chop Market Structure.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono bg-zinc-950 px-4 py-2 rounded-lg border border-zinc-800">
          <div>
            <span className="text-zinc-500 block">QUALIFICATION RATE</span>
            <span className="text-emerald-400 font-bold">{bestCoins.length > 0 ? `${bestCoins.length}/10 Scanned` : '0/10'}</span>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div>
            <span className="text-zinc-500 block">QUALITY THRESHOLD</span>
            <span className="text-cyan-400 font-bold">Score ≥ 70 / 100</span>
          </div>
        </div>
      </div>

      {/* Qualified Coin Cards Grid */}
      {bestCoins.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-12 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Coins Currently Pass All Quality Gates</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
            The quantitative engine rejects low-conviction or consolidating chop markets. Check back as new candle closes confirm multi-timeframe breakouts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bestCoins.map((coin) => {
            const isLong = coin.signal.includes('BUY');
            return (
              <div
                key={coin.id}
                onClick={() => onSelectSignal(coin)}
                className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 shadow-lg transition-all hover:shadow-cyan-950/10 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-white text-base">
                        {(coin.coin || coin.symbol || 'CRYPTO').slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">{coin.coin}</span>
                          <span className="text-xs text-zinc-400 font-mono">{coin.symbol}</span>
                        </div>
                        <span className="text-[10px] text-cyan-400 font-mono">{coin.instrumentType}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold font-mono uppercase border ${
                          isLong
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {coin.signal}
                      </span>
                      <div className="text-[11px] font-mono text-zinc-400 mt-1">
                        Score: <strong className="text-white">{coin.finalScore}</strong>/100
                      </div>
                    </div>
                  </div>

                  {/* Core Metrics with Real-Time Delta Price & Floating Performance */}
                  <div className="grid grid-cols-3 gap-2 my-4 text-xs font-mono">
                    <div className="bg-zinc-900/60 p-2 rounded border border-zinc-800/40">
                      <span className="text-zinc-500 text-[10px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        REAL-TIME LTP
                      </span>
                      <span className="font-bold text-white text-xs block">
                        {safePrice(coin.currentPrice ?? coin.price)}
                      </span>
                      {coin.distanceToEntryPercent !== null && coin.distanceToEntryPercent !== undefined && (
                        <span
                          className={`text-[9px] block ${
                            coin.distanceToEntryPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {coin.distanceToEntryPercent >= 0 ? '+' : ''}
                          {coin.distanceToEntryPercent}% vs Entry
                        </span>
                      )}
                    </div>
                    <div className="bg-zinc-900/60 p-2 rounded border border-zinc-800/40">
                      <span className="text-zinc-500 text-[10px] block">PERFORMANCE</span>
                      {coin.status === 'ACTIVE' || coin.isEntryTriggered ? (
                        <span
                          className={`font-bold text-xs block ${
                            (coin.unrealizedPnLPercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {(coin.unrealizedPnLPercent ?? 0) >= 0 ? '+' : ''}
                          {coin.unrealizedPnLPercent ?? 0}%
                          <span className="text-[9px] text-zinc-400 block font-normal">
                            {coin.floatingR !== null && coin.floatingR !== undefined
                              ? `${coin.floatingR >= 0 ? '+' : ''}${coin.floatingR} R`
                              : 'Floating'}
                          </span>
                        </span>
                      ) : coin.status === 'TARGET_1_HIT' || coin.targetHit ? (
                        <span className="font-bold text-xs text-emerald-400 block">
                          +{coin.realizedPnLPercent ?? 2.5}%
                          <span className="text-[9px] text-emerald-500 block font-normal">T1 Hit</span>
                        </span>
                      ) : (
                        <span className="font-semibold text-[11px] text-amber-300 block">
                          ⏳ Waiting Entry
                          <span className="text-[9px] text-zinc-400 block font-normal">Armed Setup</span>
                        </span>
                      )}
                    </div>
                    <div className="bg-zinc-900/60 p-2 rounded border border-zinc-800/40">
                      <span className="text-zinc-500 text-[10px] block">RISK:REWARD</span>
                      <span className="font-bold text-amber-300 text-xs">1 : {coin.riskReward}</span>
                      <div className="text-[9px] flex items-center gap-1 mt-0.5 truncate">
                        <span
                          className={`font-medium ${
                            coin.buildupType === 'Long Buildup'
                              ? 'text-emerald-400'
                              : coin.buildupType === 'Short Buildup'
                              ? 'text-rose-400'
                              : coin.buildupType === 'Short Covering'
                              ? 'text-cyan-400'
                              : coin.buildupType === 'Long Unwinding'
                              ? 'text-amber-400'
                              : 'text-zinc-400'
                          }`}
                        >
                          {coin.buildupType}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span
                          className={`font-medium ${
                            coin.marketStructure === 'Bullish'
                              ? 'text-emerald-400'
                              : coin.marketStructure === 'Bearish'
                              ? 'text-rose-400'
                              : 'text-zinc-400'
                          }`}
                        >
                          {coin.marketStructure}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Execution Setup Prices with Status Badges */}
                  <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-lg p-3 space-y-1.5 text-xs font-mono mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        Setup Entry:
                        {coin.isEntryTriggered ? (
                          <span className="text-[9px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1 rounded">
                            ✓ Triggered
                          </span>
                        ) : (
                          <span className="text-[9px] text-amber-400 bg-amber-950/60 border border-amber-800/40 px-1 rounded">
                            ⏳ Waiting Pullback
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-blue-400">{safePrice(coin.entry)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        Stop Loss:
                        {coin.breakevenMoved && (
                          <span className="text-[9px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-1 rounded">
                            Trailed BE
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-rose-400">{safePrice(coin.stopLoss)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Target 1:</span>
                      <span className="font-bold text-emerald-400">{safePrice(coin.target1)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Target 2:</span>
                      <span className="font-bold text-emerald-400">{safePrice(coin.target2)}</span>
                    </div>
                  </div>

                  {/* Confirmations List */}
                  <div className="space-y-1 text-xs mb-4">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
                      VERIFIED CONFLUENCES
                    </span>
                    {(coin.confirmations || []).slice(0, 3).map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-zinc-300 text-[11px]">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-zinc-900">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSignal(coin);
                    }}
                    className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-lg text-xs font-bold font-mono transition-colors"
                  >
                    View Report
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTradeSignal(coin);
                    }}
                    className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-black rounded-lg text-xs font-bold font-mono transition-colors flex items-center justify-center gap-1"
                  >
                    Calculate Sizing
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
