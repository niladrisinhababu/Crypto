import React from 'react';
import { ApiHealthStatus, MarketMode } from '../types';
import { Activity, Radio, RefreshCw, Zap, Shield, KeyRound, Sun, Moon, TrendingUp, TrendingDown } from 'lucide-react';

import { safePrice } from '../utils';

interface Props {
  health: ApiHealthStatus | null;
  marketMode: MarketMode;
  onSelectMarketMode: (mode: MarketMode) => void;
  selectedCoin: string;
  onSelectCoin: (coin: string) => void;
  selectedCommodity: string;
  onSelectCommodity: (commodity: string) => void;
  commodityPrices?: Record<string, { currentPrice: number; change24h: number }>;
  cryptoPrices?: Record<string, { currentPrice: number; change24h: number }>;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenExchange?: () => void;
  isDarkScreen?: boolean;
  onToggleDarkScreen?: () => void;
}

const TOP_COINS = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'SUI', 'BNB'];

const TOP_COMMODITIES = [
  { id: 'GOLD', label: 'GOLD', defaultPrice: 2738.4, defaultChange: 0.45 },
  { id: 'SILVER', label: 'SILVER', defaultPrice: 31.92, defaultChange: 1.49 },
  { id: 'CRUDEOIL', label: 'CRUDE OIL', defaultPrice: 71.45, defaultChange: -1.18 },
  { id: 'ZINC', label: 'ZINC', defaultPrice: 3124.5, defaultChange: 1.18 },
  { id: 'COPPER', label: 'COPPER', defaultPrice: 4.43, defaultChange: 1.07 },
  { id: 'NATGAS', label: 'NAT GAS', defaultPrice: 2.87, defaultChange: 2.83 },
  { id: 'ALUMINIUM', label: 'ALU', defaultPrice: 2635.0, defaultChange: 0.65 },
  { id: 'PLATINUM', label: 'PLAT', defaultPrice: 1018.5, defaultChange: 1.02 },
];

export const Header: React.FC<Props> = ({
  health,
  marketMode,
  onSelectMarketMode,
  selectedCoin,
  onSelectCoin,
  selectedCommodity,
  onSelectCommodity,
  commodityPrices = {},
  cryptoPrices = {},
  onRefresh,
  isLoading,
  onOpenExchange,
  isDarkScreen,
  onToggleDarkScreen,
}) => {
  const isConnected = health?.websocketStatus === 'CONNECTED';
  const isOperational = health?.restApiStatus === 'OPERATIONAL';

  const isCommodity = marketMode === 'commodities';

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-40 px-4 py-2.5">
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Brand & Market Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Logo & Terminal Identity */}
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${isCommodity ? 'bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-600 shadow-amber-900/30' : 'bg-gradient-to-tr from-cyan-600 to-indigo-500 shadow-cyan-900/20'} flex items-center justify-center font-black text-black text-base shadow-lg`}>
              {isCommodity ? 'C' : 'V'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-wider text-white">VEGAEDGE</span>
                <span className={`px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded ${isCommodity ? 'bg-amber-950 text-amber-300 border border-amber-800/70' : 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'}`}>
                  {isCommodity ? 'COMEX · MCX · LME' : 'DELTA INDIA API'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {isCommodity
                  ? 'Institutional Commodities Intelligence, Comex/MCX & Volatility Terminal'
                  : 'Institutional Crypto Derivatives & Volatility Terminal'}
              </p>
            </div>
          </div>

          {/* Master Market Mode Switcher: Crypto vs Commodities */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 shadow-inner">
            <button
              onClick={() => onSelectMarketMode('crypto')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                marketMode === 'crypto'
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/25'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <span>🪙 Crypto</span>
            </button>
            <button
              onClick={() => onSelectMarketMode('commodities')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                marketMode === 'commodities'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md shadow-amber-500/25'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <span>🏺 Commodities</span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-sans font-bold ${marketMode === 'commodities' ? 'bg-black/20 text-black' : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'}`}>
                GOLD·SILVER·CRUDE·ZINC
              </span>
            </button>
          </div>

          {/* Telemetry pill */}
          <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-zinc-800">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isConnected || isCommodity
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                  : 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{isCommodity ? 'MCX / COMEX LIVE' : isConnected ? 'LIVE FEED' : 'RECONNECTING'}</span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
              <Activity className="w-3.5 h-3.5 text-zinc-500" />
              <span>{isCommodity ? '45ms' : `${health?.restLatencyMs ?? 78}ms`}</span>
            </div>

            <div className="text-[11px] text-zinc-400 font-mono">
              <span className="text-zinc-500">FEED: </span>
              <span className="text-zinc-300 font-semibold">{isCommodity ? 'COMEX·NYMEX·MCX·LME' : `${health?.totalProductsLoaded ?? '1,184'} Prods`}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Asset Selector Chips & Action Controls */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          {/* Asset Chips: Crypto Coins or Commodities */}
          {marketMode === 'crypto' ? (
            <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800/70">
              {TOP_COINS.map((coin) => {
                const live = cryptoPrices?.[coin] || cryptoPrices?.[`${coin}USD`];
                const price = live?.currentPrice;
                const change = live?.change24h;
                const isSelected = selectedCoin === coin;
                const isPositive = (change ?? 0) >= 0;

                return (
                  <button
                    key={coin}
                    onClick={() => onSelectCoin(coin)}
                    className={`px-2.5 py-1 rounded text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-cyan-500 text-black shadow-sm shadow-cyan-500/30'
                        : 'text-zinc-300 hover:text-white hover:bg-zinc-800/70'
                    }`}
                  >
                    <span>{coin}</span>
                    {price !== undefined && (
                      <span className={`text-[10px] ${isSelected ? 'text-black font-extrabold' : isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {safePrice(price)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800/70">
              {TOP_COMMODITIES.map((c) => {
                const live = commodityPrices[c.id];
                const price = live?.currentPrice ?? c.defaultPrice;
                const change = live?.change24h ?? c.defaultChange;
                const isSelected = selectedCommodity === c.id;
                const isPositive = change >= 0;

                return (
                  <button
                    key={c.id}
                    onClick={() => onSelectCommodity(c.id)}
                    className={`px-2.5 py-1 rounded text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-sm shadow-amber-500/30'
                        : 'text-zinc-300 hover:text-white hover:bg-zinc-800/70'
                    }`}
                  >
                    <span>{c.label}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-black font-extrabold' : isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${price > 100 ? price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : price.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {onOpenExchange && marketMode === 'crypto' && (
            <button
              onClick={onOpenExchange}
              title="Connect / Manage Delta Exchange API Credentials"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold font-mono transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Connect Delta API</span>
              <span className="sm:hidden">API</span>
            </button>
          )}

          {onToggleDarkScreen && (
            <button
              onClick={onToggleDarkScreen}
              title={isDarkScreen ? 'Switch to Light Screen (Dark screen removed)' : 'Switch to Dark Screen'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors text-xs font-mono font-medium cursor-pointer"
            >
              {isDarkScreen ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Light Screen</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Dark Screen</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh Live Data"
            className="p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
