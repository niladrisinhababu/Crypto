import React from 'react';
import {
  Radar,
  Sparkles,
  LayoutGrid,
  TrendingUp,
  Layers,
  Cpu,
  Flame,
  LineChart,
  BookOpen,
  Target,
  ShieldAlert,
  Activity,
  Sliders,
  Bot,
} from 'lucide-react';

export type TabKey =
  | 'autotrader'
  | 'scanner'
  | 'best-coins'
  | 'market'
  | 'futures'
  | 'options'
  | 'greeks'
  | 'volatility'
  | 'technicals'
  | 'fundamentals'
  | 'history'
  | 'risk'
  | 'health'
  | 'settings';

import { MarketMode } from '../types';

interface Props {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  bestCoinsCount: number;
  marketMode?: MarketMode;
}

export const Navigation: React.FC<Props> = ({ activeTab, onSelectTab, bestCoinsCount, marketMode = 'crypto' }) => {
  const isCommodity = marketMode === 'commodities';

  const tabs: { key: TabKey; label: string; icon: any; badge?: string | number }[] = [
    { key: 'autotrader', label: isCommodity ? 'Commodity Auto-Trader' : 'Auto-Trader (Top 5)', icon: Bot, badge: 'AUTO' },
    { key: 'scanner', label: isCommodity ? 'Commodity Scanner' : 'Scanner', icon: Radar },
    { key: 'best-coins', label: isCommodity ? 'Best Commodities' : 'Best Coins', icon: Sparkles, badge: bestCoinsCount },
    { key: 'market', label: isCommodity ? 'Commodities Market' : 'Crypto Market', icon: LayoutGrid },
    { key: 'futures', label: isCommodity ? 'Futures & MCX/Comex' : 'Futures & Perps', icon: TrendingUp },
    { key: 'options', label: isCommodity ? 'Commodity Options' : 'Options Chain', icon: Layers },
    { key: 'greeks', label: 'Option Greeks', icon: Cpu },
    { key: 'volatility', label: isCommodity ? 'Vega & GVZ/OVX' : 'Vega & Volatility', icon: Flame },
    { key: 'technicals', label: 'Technical Analysis', icon: LineChart },
    { key: 'fundamentals', label: isCommodity ? 'Commodity Fundamentals' : 'Fundamentals', icon: BookOpen },
    { key: 'history', label: isCommodity ? 'Commodity Audit & Setups' : 'Signal Performance & Setups', icon: Target },
    { key: 'risk', label: isCommodity ? 'Risk & Lot Sizing' : 'Risk Management', icon: ShieldAlert },
    { key: 'health', label: isCommodity ? 'Feeds & Telemetry' : 'API Health', icon: Activity },
    { key: 'settings', label: 'Settings', icon: Sliders },
  ];

  return (
    <nav className="bg-zinc-950 border-b border-zinc-800/80 px-4">
      <div className="max-w-[1600px] mx-auto flex items-center gap-1 overflow-x-auto py-2 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onSelectTab(tab.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-zinc-800 text-cyan-400 border border-zinc-700/80 shadow-inner'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-zinc-500'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
