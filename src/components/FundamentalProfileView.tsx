import React, { useState, useEffect, useMemo } from 'react';
import { CoinFundamentalProfile } from '../types';
import {
  BookOpen,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Globe,
  FileText,
  Database,
  Layers,
  Search,
  TrendingUp,
  Coins,
  Shield,
  Activity,
  Calendar,
  Lock,
  Zap,
  Info,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface Props {
  coin: string;
  onSelectCoin?: (coin: string) => void;
}

const POPULAR_COINS = [
  'BTC',
  'ETH',
  'SOL',
  'XRP',
  'DOGE',
  'ADA',
  'AVAX',
  'LINK',
  'SUI',
  'BNB',
  'NEAR',
  'APT',
  'DOT',
  'POL',
  'PEPE',
  'SHIB',
  'LTC',
  'BCH',
  'UNI',
  'ARB',
  'OP',
  'FET',
  'INJ',
  'RENDER',
  'TIA',
];

export const FundamentalProfileView: React.FC<Props> = ({ coin, onSelectCoin }) => {
  const [data, setData] = useState<{
    exchangeData: any;
    marketData: any;
    externalFundamentalData: CoinFundamentalProfile;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  const fetchProfile = async (c: string) => {
    setIsLoading(true);
    try {
      const cleanCoin = c.replace(/^C-|^P-/, '').split('-')[0].replace(/USD.*$|USDT.*$/, '').toUpperCase();
      const res = await fetch(`/api/fundamental/${cleanCoin}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.warn('Failed to fetch fundamental profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile(coin);
  }, [coin]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchQuery.trim().toUpperCase();
    if (clean && onSelectCoin) {
      onSelectCoin(clean);
      setSearchQuery('');
    }
  };

  const filteredCoins = useMemo(() => {
    if (!searchQuery) return POPULAR_COINS;
    return POPULAR_COINS.filter((c) => c.toLowerCase().includes(searchQuery.toLowerCase().trim()));
  }, [searchQuery]);

  if (!data) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-16 text-center text-zinc-400 font-mono flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading institutional fundamental analysis for {coin}...</span>
      </div>
    );
  }

  const { exchangeData, marketData, externalFundamentalData: f } = data;
  const displaySymbol = (f?.ticker || f?.symbol || coin || 'BTC').toUpperCase();

  // Safely extract pros & cons
  const prosList: string[] =
    f?.pros && f.pros.length > 0
      ? f.pros
      : f?.keyStrengths && f.keyStrengths.length > 0
      ? f.keyStrengths
      : f?.keyFundamentalStrengths && f.keyFundamentalStrengths.length > 0
      ? f.keyFundamentalStrengths
      : [];

  const consList: string[] =
    f?.cons && f.cons.length > 0
      ? f.cons
      : f?.keyRisks && f.keyRisks.length > 0
      ? f.keyRisks
      : [];

  const whatItDoesText = f?.whatItDoes || f?.whatThisCoinDoes || f?.projectDescription || 'No description available.';
  const whichSectorText = f?.whichSector || f?.sectorUseCaseDetails || f?.sectorCategory || 'Digital Asset';

  return (
    <div className="space-y-6">
      {/* Search & Coin Selector Bar */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <Coins className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-zinc-200 uppercase tracking-wider">
              Coin Fundamentals & Valuation Research
            </span>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search coin (e.g. BTC, SOL, NEAR)..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-black font-bold font-mono text-xs rounded-lg transition-colors"
            >
              Analyze
            </button>
          </form>
        </div>

        {/* Popular Coin Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-zinc-900">
          <span className="text-[11px] font-mono text-zinc-500 mr-1 uppercase">Select:</span>
          {filteredCoins.map((c) => {
            const isSelected = displaySymbol === c;
            return (
              <button
                key={c}
                onClick={() => onSelectCoin && onSelectCoin(c)}
                className={`px-2.5 py-1 text-xs font-bold font-mono rounded-lg transition-all ${
                  isSelected
                    ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-black'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Hero Header Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center font-black text-white text-2xl shadow-lg border border-white/10 shrink-0">
              {displaySymbol.slice(0, 3)}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {f?.coinName || displaySymbol}
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 rounded-md">
                  {displaySymbol}
                </span>
                <span className="px-2.5 py-0.5 text-xs font-mono font-semibold bg-purple-950/60 border border-purple-800/60 text-purple-300 rounded-md">
                  {f?.categoryTag || f?.sectorCategory || 'Cryptocurrency'}
                </span>
                {f?.source && (
                  <span className="px-2 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 rounded">
                    Verified Registry
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-400 font-mono flex flex-wrap items-center gap-3">
                <span>
                  <strong className="text-zinc-300">Blockchain:</strong> {f?.blockchain || 'Decentralized Ledger'}
                </span>
                <span className="text-zinc-600">•</span>
                <span>
                  <strong className="text-zinc-300">Consensus:</strong> {f?.consensusMechanism || 'Proof of Stake'}
                </span>
                {f?.launchDate && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span>
                      <strong className="text-zinc-300">Launched:</strong> {f.launchDate}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Key External Links */}
          <div className="flex flex-wrap items-center gap-2">
            {f?.website && f.website.startsWith('http') && (
              <a
                href={f.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-lg text-xs font-mono text-zinc-200 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                Website
                <ExternalLink className="w-3 h-3 text-zinc-500" />
              </a>
            )}
            {f?.whitepaper && f.whitepaper.startsWith('http') && (
              <a
                href={f.whitepaper}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-lg text-xs font-mono text-zinc-200 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                Whitepaper
                <ExternalLink className="w-3 h-3 text-zinc-500" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Primary Market Cap & Valuation Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
            <span>MARKET CAPITALIZATION</span>
            <Coins className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {f?.liveMarketCapFormatted || f?.marketCap || 'N/A'}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
            {f?.liveMarketCapUsd ? (
              <span className="text-emerald-400 font-semibold">Live Real-Time Valuation</span>
            ) : (
              <span>Reported Macro Market Cap</span>
            )}
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
            <span>FULLY DILUTED VALUATION (FDV)</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {f?.fdv || 'N/A'}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Total supply valuation at current market price
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
            <span>CIRCULATING SUPPLY</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-cyan-300 tracking-tight">
            {f?.circulatingSupply || 'N/A'}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Actively circulating on-chain tokens
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
            <span>MAX / TOTAL SUPPLY</span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-bold text-zinc-200 tracking-tight">
            {f?.maxSupply || f?.totalSupply || 'N/A'}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Hard cap or programmatic emission curve
          </div>
        </div>
      </div>

      {/* "WHAT IT DOES" & "WHICH SECTOR IT WORKS IN" */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* WHAT THIS COIN DOES */}
        <div className="bg-zinc-950 border border-cyan-900/30 p-5 rounded-xl shadow-lg space-y-3 relative">
          <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono tracking-wider text-xs uppercase border-b border-zinc-900 pb-2.5">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>WHAT THIS COIN DOES</span>
            <span className="ml-auto text-[10px] text-cyan-500/80 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40 font-mono">
              Core Purpose
            </span>
          </div>
          <p className="text-zinc-200 text-sm leading-relaxed font-sans font-normal">
            {whatItDoesText}
          </p>
        </div>

        {/* WHICH SECTOR & USE CASE IT WORKS IN */}
        <div className="bg-zinc-950 border border-purple-900/30 p-5 rounded-xl shadow-lg space-y-3 relative">
          <div className="flex items-center gap-2 text-purple-400 font-bold font-mono tracking-wider text-xs uppercase border-b border-zinc-900 pb-2.5">
            <Database className="w-4 h-4 text-purple-400" />
            <span>WORKING WHICH SECTOR & INDUSTRY USE CASES</span>
            <span className="ml-auto text-[10px] text-purple-500/80 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/40 font-mono">
              Domain
            </span>
          </div>
          <p className="text-zinc-200 text-sm leading-relaxed font-sans font-normal">
            {whichSectorText}
          </p>
        </div>
      </div>

      {/* PROS & CONS SECTION (EVERYTHING) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PROS (KEY FUNDAMENTAL STRENGTHS) */}
        <div className="bg-gradient-to-b from-emerald-950/30 to-zinc-950 border border-emerald-800/40 p-5 rounded-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>PROS — KEY FUNDAMENTAL STRENGTHS</span>
            </div>
            <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-700/50 text-emerald-400 text-[10px] font-mono font-bold rounded">
              {prosList.length} Advantages
            </span>
          </div>

          <div className="space-y-2.5">
            {prosList.length > 0 ? (
              prosList.map((pro, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-xs font-sans text-zinc-200 leading-relaxed"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="font-medium">{pro}</span>
                </div>
              ))
            ) : (
              <div className="p-4 text-zinc-400 text-xs font-mono">
                No verified strengths registered.
              </div>
            )}
          </div>
        </div>

        {/* CONS (KEY RISKS & REGULATORY CHALLENGES) */}
        <div className="bg-gradient-to-b from-rose-950/30 to-zinc-950 border border-rose-800/40 p-5 rounded-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-rose-900/40 pb-2.5">
            <div className="flex items-center gap-2 text-rose-400 font-bold font-mono text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>CONS — KEY RISKS & CHALLENGES</span>
            </div>
            <span className="px-2 py-0.5 bg-rose-950 border border-rose-700/50 text-rose-400 text-[10px] font-mono font-bold rounded">
              {consList.length} Risk Factors
            </span>
          </div>

          <div className="space-y-2.5">
            {consList.length > 0 ? (
              consList.map((con, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-950/20 border border-rose-900/30 text-xs font-sans text-zinc-200 leading-relaxed"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="font-medium text-rose-100">{con}</span>
                </div>
              ))
            ) : (
              <div className="p-4 text-zinc-400 text-xs font-mono">
                No active risk disclosures registered.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOKENOMICS, UNLOCK SCHEDULE & DEVELOPMENT ACTIVITY */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4 font-mono text-xs">
        <div className="flex items-center gap-2 border-b border-zinc-900 pb-2.5">
          <Layers className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs uppercase font-bold text-amber-400 tracking-wider">
            TOKENOMICS, UNLOCK SCHEDULE & DEVELOPMENT ACTIVITY
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 bg-zinc-900/50 border border-zinc-800/80 rounded-lg space-y-1.5">
            <span className="text-zinc-500 text-[10px] font-bold block uppercase tracking-wider">
              TOKENOMICS & MONETARY POLICY
            </span>
            <p className="text-zinc-300 font-sans text-xs leading-relaxed">
              {f?.tokenomics || 'Standardized tokenomic schedule.'}
            </p>
          </div>

          <div className="p-3.5 bg-zinc-900/50 border border-zinc-800/80 rounded-lg space-y-1.5">
            <span className="text-amber-400 text-[10px] font-bold block uppercase tracking-wider">
              TOKEN UNLOCK SCHEDULE
            </span>
            <p className="text-amber-200 font-sans text-xs leading-relaxed">
              {f?.tokenUnlockSchedule || f?.tokenUnlockInfo || 'Continuous programmatic emission.'}
            </p>
          </div>

          <div className="p-3.5 bg-zinc-900/50 border border-zinc-800/80 rounded-lg space-y-1.5">
            <span className="text-cyan-400 text-[10px] font-bold block uppercase tracking-wider">
              DEVELOPMENT ACTIVITY
            </span>
            <p className="text-zinc-300 font-sans text-xs leading-relaxed">
              {f?.developmentActivity || 'Active developer repositories.'}
            </p>
          </div>
        </div>
      </div>

      {/* EXCHANGE & LIVE DERIVATIVES DATA (DELTA EXCHANGE INDIA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs">
        {/* Section 1: Exchange Specs */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <h2 className="text-xs uppercase font-bold text-cyan-400 tracking-wider">
              DELTA EXCHANGE INDIA SPECIFICATIONS
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">CONTRACT TYPE</span>
              <span className="font-bold text-white">{exchangeData.contractType}</span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">CONTRACT SIZE</span>
              <span className="font-bold text-white">{exchangeData.contractSize}</span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">TICK SIZE</span>
              <span className="font-bold text-white">${exchangeData.tickSize}</span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">MAX LEVERAGE</span>
              <span className="font-bold text-cyan-400">{exchangeData.maxLeverage}</span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">TRADING STATUS</span>
              <span className="font-bold text-emerald-400 uppercase">{exchangeData.tradingStatus}</span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">SETTLEMENT</span>
              <span className="font-bold text-white">Cash in USDT</span>
            </div>
          </div>
        </div>

        {/* Section 2: Live Market Data */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h2 className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
              LIVE MARKET DATA (DELTA DERIVATIVES FEED)
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">LTP (PRICE)</span>
              <span className="font-bold text-white text-sm">
                ${marketData.lastTradedPrice?.toLocaleString() ?? 'N/A'}
              </span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">24H CHANGE</span>
              <span
                className={`font-bold text-sm ${
                  (marketData.change24h || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {marketData.change24h !== null
                  ? `${marketData.change24h >= 0 ? '+' : ''}${marketData.change24h.toFixed(2)}%`
                  : 'N/A'}
              </span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">MARK PRICE</span>
              <span className="font-bold text-zinc-200">
                ${marketData.markPrice?.toLocaleString() ?? 'N/A'}
              </span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">OPEN INTEREST</span>
              <span className="font-bold text-cyan-300">
                ${marketData.openInterestUsd?.toLocaleString() ?? 'N/A'}
              </span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">FUNDING RATE</span>
              <span className="font-bold text-purple-300">
                {marketData.fundingRate !== null
                  ? `${(marketData.fundingRate * 100).toFixed(4)}%`
                  : 'N/A'}
              </span>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">SPOT INDEX</span>
              <span className="font-bold text-zinc-300">
                ${marketData.spotPrice?.toLocaleString() ?? 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
