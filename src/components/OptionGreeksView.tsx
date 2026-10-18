import React, { useState, useEffect } from 'react';
import { OptionGreekSensitivity } from '../types';
import { safePrice } from '../utils';
import { Cpu, ShieldCheck, HelpCircle, Activity, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

interface Props {
  initialSymbol?: string;
}

export const OptionGreeksView: React.FC<Props> = ({ initialSymbol }) => {
  const [data, setData] = useState<OptionGreekSensitivity | null>(null);
  const [symbolInput, setSymbolInput] = useState<string>(initialSymbol || '');
  const [isLoading, setIsLoading] = useState(false);

  const fetchGreeks = async (sym?: string) => {
    setIsLoading(true);
    try {
      const url = `/api/options/greeks${sym ? `?symbol=${encodeURIComponent(sym)}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        if (!symbolInput) setSymbolInput(json.data.symbol);
      }
    } catch (err) {
      console.warn('Failed to fetch Option Greeks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGreeks(initialSymbol);
  }, [initialSymbol]);

  if (!data) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-12 text-center text-zinc-400 font-mono">
        Loading Option Greeks Engine...
      </div>
    );
  }

  const { greeks, sensitivityScenarios } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider">
              QUANTITATIVE GREEKS & STRESS TESTING
            </span>
            <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono">
              BLACK-SCHOLES DERIVATIVES
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            Option Greeks & Mathematical Sensitivity Simulator
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Active Option Contract:{' '}
            <strong className="text-cyan-300 font-mono">{data.symbol}</strong> ({data.description || data.contractType})
          </p>
        </div>

        {/* Contract Quick Specs */}
        <div className="flex items-center gap-3 text-xs font-mono bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
          <div>
            <span className="text-zinc-500 block">UNDERLYING</span>
            <span className="text-white font-bold">{safePrice(data.underlyingPrice)}</span>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div>
            <span className="text-zinc-500 block">STRIKE</span>
            <span className="text-cyan-400 font-bold">{safePrice(data.strike)}</span>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div>
            <span className="text-zinc-500 block">PREMIUM</span>
            <span className="text-emerald-400 font-bold">{safePrice(data.premium)}</span>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div>
            <span className="text-zinc-500 block">DTE</span>
            <span className="text-amber-400 font-bold">{data.timeToExpiryDays} Days</span>
          </div>
        </div>
      </div>

      {/* 5 Core Greeks Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Delta */}
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-bold uppercase tracking-wider text-cyan-400">DELTA (Δ)</span>
            <span className="text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded">Direction</span>
          </div>
          <div className="text-2xl font-black font-mono text-white mb-2">
            {greeks.delta !== null && greeks.delta !== undefined ? greeks.delta : 'N/A'}
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Measures option price change for every $1 move in underlying asset. Also serves as the rough probability of expiring in-the-money.
          </p>
        </div>

        {/* Gamma */}
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-bold uppercase tracking-wider text-purple-400">GAMMA (Γ)</span>
            <span className="text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded">Acceleration</span>
          </div>
          <div className="text-2xl font-black font-mono text-white mb-2">
            {greeks.gamma !== null && greeks.gamma !== undefined ? greeks.gamma : 'N/A'}
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Rate of change of Delta per $1 move in underlying asset. Highest at-the-money near expiry (causes explosive gamma squeezes).
          </p>
        </div>

        {/* Theta */}
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-bold uppercase tracking-wider text-rose-400">THETA (Θ)</span>
            <span className="text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded">Decay / Day</span>
          </div>
          <div className="text-2xl font-black font-mono text-rose-400 mb-2">
            {greeks.theta !== null && greeks.theta !== undefined ? greeks.theta : 'N/A'}
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Daily time decay erosion in dollar terms. Accelerates dramatically in the final 7 days before contract settlement.
          </p>
        </div>

        {/* Vega */}
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-bold uppercase tracking-wider text-amber-400">VEGA (ν)</span>
            <span className="text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded">Vol Sensitivity</span>
          </div>
          <div className="text-2xl font-black font-mono text-amber-300 mb-2">
            {greeks.vega !== null && greeks.vega !== undefined ? greeks.vega : 'N/A'}
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Dollar change in option price for a 1% shift in Implied Volatility. Crucial for trading events and volatility shocks.
          </p>
        </div>

        {/* Rho */}
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-bold uppercase tracking-wider text-emerald-400">RHO (ρ)</span>
            <span className="text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded">Interest Rate</span>
          </div>
          <div className="text-2xl font-black font-mono text-white mb-2">
            {greeks.rho !== null && greeks.rho !== undefined ? greeks.rho : 'N/A'}
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Sensitivity of option price relative to a 1% change in the benchmark interest rate or cost-of-carry risk-free rate.
          </p>
        </div>
      </div>

      {/* Mathematical Stress-Testing Matrix */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Mathematical Sensitivity Scenarios (Taylor Series Greek Expansion)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Calculates theoretical premium expansion or collapse under simultaneous market shocks.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-500">Base Premium: ${data.premium}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
          {/* Scenario 1: Underlying +1% */}
          <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="font-bold text-emerald-400">Underlying +1.00% Move</span>
                <span>Δ + ½Γ(ΔS)²</span>
              </div>
              <div className="text-xs text-zinc-500 mb-3">
                Spot climbs by ${(data.underlyingPrice * 0.01).toFixed(2)}
              </div>
            </div>
            {sensitivityScenarios.underlyingPlus1Pct ? (
              <>
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800/80 flex items-center justify-between">
                  <span className="text-zinc-400">Price Shift:</span>
                  <span
                    className={`font-bold ${
                      sensitivityScenarios.underlyingPlus1Pct.optionPriceChange >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {sensitivityScenarios.underlyingPlus1Pct.optionPriceChange >= 0 ? '+' : ''}$
                    {sensitivityScenarios.underlyingPlus1Pct.optionPriceChange}
                  </span>
                </div>
                <div className="mt-2 text-right text-zinc-300">
                  New Price:{' '}
                  <strong className="text-white">
                    ${sensitivityScenarios.underlyingPlus1Pct.newTheoreticalPrice}
                  </strong>
                </div>
              </>
            ) : (
              <div className="text-zinc-500 text-center py-2">N/A (Requires Delta & Gamma)</div>
            )}
          </div>

          {/* Scenario 2: Underlying -1% */}
          <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="font-bold text-rose-400">Underlying -1.00% Move</span>
                <span>-Δ + ½Γ(ΔS)²</span>
              </div>
              <div className="text-xs text-zinc-500 mb-3">
                Spot drops by ${(data.underlyingPrice * 0.01).toFixed(2)}
              </div>
            </div>
            {sensitivityScenarios.underlyingMinus1Pct ? (
              <>
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800/80 flex items-center justify-between">
                  <span className="text-zinc-400">Price Shift:</span>
                  <span
                    className={`font-bold ${
                      sensitivityScenarios.underlyingMinus1Pct.optionPriceChange >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {sensitivityScenarios.underlyingMinus1Pct.optionPriceChange >= 0 ? '+' : ''}$
                    {sensitivityScenarios.underlyingMinus1Pct.optionPriceChange}
                  </span>
                </div>
                <div className="mt-2 text-right text-zinc-300">
                  New Price:{' '}
                  <strong className="text-white">
                    ${sensitivityScenarios.underlyingMinus1Pct.newTheoreticalPrice}
                  </strong>
                </div>
              </>
            ) : (
              <div className="text-zinc-500 text-center py-2">N/A (Requires Delta & Gamma)</div>
            )}
          </div>

          {/* Scenario 3: IV +1% */}
          <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="font-bold text-amber-400">Implied Vol +1.00%</span>
                <span>+1.0% IV (Vega)</span>
              </div>
              <div className="text-xs text-zinc-500 mb-3">Vol expansion shock</div>
            </div>
            {sensitivityScenarios.ivPlus1Pct ? (
              <>
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800/80 flex items-center justify-between">
                  <span className="text-zinc-400">Price Shift:</span>
                  <span className="font-bold text-emerald-400">
                    +${sensitivityScenarios.ivPlus1Pct.optionPriceChange}
                  </span>
                </div>
                <div className="mt-2 text-right text-zinc-300">
                  New Price:{' '}
                  <strong className="text-white">
                    ${sensitivityScenarios.ivPlus1Pct.newTheoreticalPrice}
                  </strong>
                </div>
              </>
            ) : (
              <div className="text-zinc-500 text-center py-2">N/A (Requires Vega)</div>
            )}
          </div>

          {/* Scenario 4: IV -1% */}
          <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="font-bold text-rose-400">Implied Vol -1.00%</span>
                <span>-1.0% IV (Vol Crush)</span>
              </div>
              <div className="text-xs text-zinc-500 mb-3">Post-event volatility collapse</div>
            </div>
            {sensitivityScenarios.ivMinus1Pct ? (
              <>
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800/80 flex items-center justify-between">
                  <span className="text-zinc-400">Price Shift:</span>
                  <span className="font-bold text-rose-400">
                    ${sensitivityScenarios.ivMinus1Pct.optionPriceChange}
                  </span>
                </div>
                <div className="mt-2 text-right text-zinc-300">
                  New Price:{' '}
                  <strong className="text-white">
                    ${sensitivityScenarios.ivMinus1Pct.newTheoreticalPrice}
                  </strong>
                </div>
              </>
            ) : (
              <div className="text-zinc-500 text-center py-2">N/A (Requires Vega)</div>
            )}
          </div>

          {/* Scenario 5: Time Decay 1 Day */}
          <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="font-bold text-purple-400">1-Day Time Decay</span>
                <span>Θ / 365 Days</span>
              </div>
              <div className="text-xs text-zinc-500 mb-3">24-hour weekend/overnight passage</div>
            </div>
            {sensitivityScenarios.timeDecay1Day ? (
              <>
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800/80 flex items-center justify-between">
                  <span className="text-zinc-400">Price Shift:</span>
                  <span className="font-bold text-rose-400">
                    ${sensitivityScenarios.timeDecay1Day.optionPriceChange}
                  </span>
                </div>
                <div className="mt-2 text-right text-zinc-300">
                  New Price:{' '}
                  <strong className="text-white">
                    ${sensitivityScenarios.timeDecay1Day.newTheoreticalPrice}
                  </strong>
                </div>
              </>
            ) : (
              <div className="text-zinc-500 text-center py-2">N/A (Requires Theta)</div>
            )}
          </div>

          {/* Scenario 6: Rate +1% */}
          <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="font-bold text-blue-400">Interest Rate +100 bps</span>
                <span>+1.00% Risk-Free Rate</span>
              </div>
              <div className="text-xs text-zinc-500 mb-3">Macro rate hike shock</div>
            </div>
            {sensitivityScenarios.interestRatePlus1Pct ? (
              <>
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800/80 flex items-center justify-between">
                  <span className="text-zinc-400">Price Shift:</span>
                  <span className="font-bold text-cyan-400">
                    +${sensitivityScenarios.interestRatePlus1Pct.optionPriceChange}
                  </span>
                </div>
                <div className="mt-2 text-right text-zinc-300">
                  New Price:{' '}
                  <strong className="text-white">
                    ${sensitivityScenarios.interestRatePlus1Pct.newTheoreticalPrice}
                  </strong>
                </div>
              </>
            ) : (
              <div className="text-zinc-500 text-center py-2">N/A (Requires Rho)</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
