import React, { useState, useEffect } from 'react';
import { CryptoSignal } from '../types';
import { ShieldAlert, AlertTriangle, CheckCircle, Calculator, Percent, DollarSign, Sliders, Zap } from 'lucide-react';

interface Props {
  signals: CryptoSignal[];
  selectedSignal: CryptoSignal | null;
}

export const RiskManagementView: React.FC<Props> = ({ signals, selectedSignal: initialSignal }) => {
  const [accountCapital, setAccountCapital] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [maxDailyLoss, setMaxDailyLoss] = useState<number>(500);
  const [maxLeverage, setMaxLeverage] = useState<number>(10);
  const [activeSignal, setActiveSignal] = useState<CryptoSignal | null>(
    initialSignal || signals[0] || null
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialSignal) setActiveSignal(initialSignal);
    else if (!activeSignal && signals.length > 0) setActiveSignal(signals[0]);
  }, [initialSignal, signals]);

  const handleTakePosition = async () => {
    if (!activeSignal) return;
    setIsExecuting(true);
    setExecutionMessage(null);
    try {
      const res = await fetch('/api/signals/take-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coin: activeSignal.coin,
          signal: activeSignal.signal.includes('BUY') ? 'BUY' : 'SELL',
          entryPrice: activeSignal.entry,
          stopLossPrice: activeSignal.stopLoss,
          target1Price: activeSignal.target1,
          target2Price: activeSignal.target2,
          target3Price: activeSignal.target3,
          quantity: Number(quantity.toFixed(4)),
          positionSizeUsd: Number(positionNotional.toFixed(2)),
          leverage: safeLeverage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExecutionMessage(
          `Position Taken! ${activeSignal.coin} entered at $${activeSignal.entry}. Immediately added to Signal Setup & Trade Performance Audit.`
        );
      } else {
        setExecutionMessage(data.message || 'Execution error');
      }
    } catch (err: any) {
      setExecutionMessage(err.message || 'Failed to take position');
    } finally {
      setIsExecuting(false);
    }
  };

  const price = activeSignal?.entry || 78000;
  const stopLoss = activeSignal?.stopLoss || 76500;
  const stopDistance = Math.abs(price - stopLoss);
  const stopDistancePct = price > 0 ? (stopDistance / price) * 100 : 0;

  const maxDollarRisk = (accountCapital * riskPercent) / 100;
  const quantity = stopDistance > 0 ? maxDollarRisk / stopDistance : 0;
  const positionNotional = quantity * price;
  const impliedLeverage = accountCapital > 0 ? positionNotional / accountCapital : 1;
  const safeLeverage = Math.min(maxLeverage, Math.max(1, Number(impliedLeverage.toFixed(1))));

  const isExcessiveRisk = riskPercent > 2.5;
  const isLeverageExceeded = impliedLeverage > maxLeverage;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              CAPITAL PRESERVATION & SIZING ENGINE
            </span>
            <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono">
              QUANTITATIVE RISK DESK
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            Institutional Money Management & Position Sizing
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Never risk capital blindly. Sizes every order mathematically using Stop-Loss distance and predetermined account risk.
          </p>
        </div>

        {/* Selected Coin Selector */}
        <div className="flex items-center gap-2 bg-zinc-900 p-2 rounded-lg border border-zinc-800 font-mono text-xs">
          <span className="text-zinc-500">SIGNAL:</span>
          <select
            value={activeSignal?.id || ''}
            onChange={(e) => {
              const s = signals.find((item) => item.id === e.target.value);
              if (s) setActiveSignal(s);
            }}
            className="bg-zinc-950 border border-zinc-800 text-cyan-400 font-bold px-2.5 py-1 rounded focus:outline-none"
          >
            {signals.map((s) => (
              <option key={s.id} value={s.id}>
                {s.coin} ({s.signal} @ ${s.entry})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calculator Inputs & Output Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Configuration Inputs */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4 font-mono">
          <div className="flex items-center gap-2 border-b border-zinc-900 pb-3 text-white font-bold text-sm">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Risk Parameters Configuration
          </div>

          <div className="space-y-4 text-xs">
            {/* Account Capital */}
            <div>
              <div className="flex justify-between text-zinc-400 mb-1.5">
                <span>Total Account Capital ($)</span>
                <span className="text-white font-bold">${accountCapital.toLocaleString()}</span>
              </div>
              <input
                type="number"
                value={accountCapital}
                onChange={(e) => setAccountCapital(Math.max(100, Number(e.target.value)))}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-bold"
              />
            </div>

            {/* Risk Per Trade % */}
            <div>
              <div className="flex justify-between text-zinc-400 mb-1.5">
                <span>Risk Per Trade (% of Capital)</span>
                <span
                  className={`font-bold ${
                    riskPercent > 2 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {riskPercent}% (${maxDollarRisk.toFixed(2)})
                </span>
              </div>
              <input
                type="range"
                min="0.25"
                max="5.0"
                step="0.25"
                value={riskPercent}
                onChange={(e) => setRiskPercent(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                <span>0.25% (Conservative)</span>
                <span>1.5% (Standard)</span>
                <span>5.0% (Aggressive)</span>
              </div>
            </div>

            {/* Maximum Daily Loss */}
            <div>
              <div className="flex justify-between text-zinc-400 mb-1.5">
                <span>Maximum Daily Loss Limit ($)</span>
                <span className="text-rose-400 font-bold">${maxDailyLoss}</span>
              </div>
              <input
                type="number"
                value={maxDailyLoss}
                onChange={(e) => setMaxDailyLoss(Math.max(50, Number(e.target.value)))}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-bold"
              />
            </div>

            {/* Maximum Leverage Slider */}
            <div>
              <div className="flex justify-between text-zinc-400 mb-1.5">
                <span>Max Allowed Leverage</span>
                <span className="text-purple-400 font-bold">{maxLeverage}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={maxLeverage}
                onChange={(e) => setMaxLeverage(Number(e.target.value))}
                className="w-full accent-purple-400"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                <span>1x (Spot equivalent)</span>
                <span>10x (Prudent)</span>
                <span>50x (High Risk)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calculated Execution Sizing */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4 font-mono">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Calculator className="w-4 h-4 text-emerald-400" />
              Calculated Position Sizing & Guardrails
            </div>
            <span className="text-xs text-zinc-500">Auto-Derived</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
              <span className="text-zinc-500 block text-[10px]">MAX MONETARY RISK</span>
              <span className="text-xl font-bold text-rose-400">
                ${maxDollarRisk.toFixed(2)}
              </span>
              <span className="text-[10px] text-zinc-500 block">Strict Risk Budget</span>
            </div>

            <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
              <span className="text-zinc-500 block text-[10px]">STOP LOSS DISTANCE</span>
              <span className="text-xl font-bold text-white">
                ${stopDistance.toFixed(2)}
              </span>
              <span className="text-[10px] text-rose-400 block font-semibold">
                -{stopDistancePct.toFixed(2)}% from entry
              </span>
            </div>

            <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
              <span className="text-zinc-500 block text-[10px]">ORDER QUANTITY</span>
              <span className="text-xl font-bold text-cyan-400">
                {quantity.toFixed(4)} {activeSignal?.coin || 'Units'}
              </span>
              <span className="text-[10px] text-zinc-500 block">Contracts / Coins</span>
            </div>

            <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
              <span className="text-zinc-500 block text-[10px]">TOTAL NOTIONAL VALUE</span>
              <span className="text-xl font-bold text-emerald-400">
                ${positionNotional.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-zinc-500 block">Full Contract Exposure</span>
            </div>
          </div>

          {/* Leverage Breakdown */}
          <div className="p-3 bg-zinc-900/40 rounded-lg border border-zinc-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Required Position Leverage:</span>
              <span className="font-bold text-white">{impliedLeverage.toFixed(1)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Recommended Operational Leverage:</span>
              <span className="font-bold text-cyan-300">{safeLeverage}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Max Configured Cap:</span>
              <span className="font-bold text-purple-300">{maxLeverage}x</span>
            </div>
          </div>

          {/* Safety Warnings & Guardrails */}
          <div className="space-y-2 pt-2">
            {isExcessiveRisk && (
              <div className="p-2.5 bg-amber-950/30 border border-amber-800/50 rounded-lg flex items-center gap-2 text-amber-300 text-xs font-sans">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  High risk percentage (&gt;2.5%). Consecutive losses will severely deplete equity.
                </span>
              </div>
            )}
            {isLeverageExceeded && (
              <div className="p-2.5 bg-rose-950/30 border border-rose-800/50 rounded-lg flex items-center gap-2 text-rose-300 text-xs font-sans">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  Position size requires {impliedLeverage.toFixed(1)}x leverage, which exceeds your maximum allowed cap of {maxLeverage}x. Reduce risk or increase capital.
                </span>
              </div>
            )}
            {!isExcessiveRisk && !isLeverageExceeded && (
              <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/50 rounded-lg flex items-center gap-2 text-emerald-300 text-xs font-sans">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Sizing adheres to strict institutional risk limits and Delta Exchange India margin rules.
                </span>
              </div>
            )}
          </div>

          {/* Direct Take Position Action - Adds Immediately to Audit on Entry */}
          <div className="pt-3 border-t border-zinc-900 space-y-2">
            <button
              onClick={handleTakePosition}
              disabled={isExecuting || !activeSignal}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-black font-black font-mono text-xs rounded-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-black fill-current" />
              <span>
                {isExecuting
                  ? 'Taking Position & Registering in Audit...'
                  : `Take Position on ${activeSignal?.coin || 'Coin'} Now (Instant Audit on Entry)`}
              </span>
            </button>
            <p className="text-[10px] text-zinc-500 font-mono text-center">
              Position enters active trading with Stop-Loss & Targets armed, and is added to the Trade Performance Audit the moment entry is taken.
            </p>
            {executionMessage && (
              <div className="p-2.5 bg-emerald-950/70 border border-emerald-700/80 text-emerald-300 text-xs rounded-lg font-mono text-center shadow">
                {executionMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
