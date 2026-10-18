import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Navigation, TabKey } from './components/Navigation';
import { ScannerView } from './components/ScannerView';
import { BestCoinsView } from './components/BestCoinsView';
import { MarketView } from './components/MarketView';
import { FuturesView } from './components/FuturesView';
import { OptionsChainView } from './components/OptionsChainView';
import { OptionGreeksView } from './components/OptionGreeksView';
import { VolatilityView } from './components/VolatilityView';
import { TechnicalAnalysisView } from './components/TechnicalAnalysisView';
import { FundamentalProfileView } from './components/FundamentalProfileView';
import { SignalHistoryView } from './components/SignalHistoryView';
import { RiskManagementView } from './components/RiskManagementView';
import { ApiHealthView } from './components/ApiHealthView';
import { SettingsView } from './components/SettingsView';
import { AutoTraderView } from './components/AutoTraderView';
import { CommodityAutoTraderView } from './components/CommodityAutoTraderView';
import { CommodityFundamentalsView } from './components/CommodityFundamentalsView';
import { SignalDetailModal } from './components/SignalDetailModal';
import {
  CryptoSignal,
  MarketInstrument,
  FuturesItem,
  ApiHealthStatus,
  SignalPerformanceStats,
  MarketMode,
  CommoditySpec,
} from './types';

export default function App() {
  // Master Market Mode: 'crypto' vs 'commodities'
  const [marketMode, setMarketMode] = useState<MarketMode>('crypto');

  // Navigation & Asset Selection
  const [activeTab, setActiveTab] = useState<TabKey>('scanner');
  const [selectedCoin, setSelectedCoin] = useState<string>('BTC');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('GOLD');
  const [selectedOptionSymbol, setSelectedOptionSymbol] = useState<string>('');
  
  // Crypto Data States
  const [health, setHealth] = useState<ApiHealthStatus | null>(null);
  const [signals, setSignals] = useState<CryptoSignal[]>([]);
  const [bestCoins, setBestCoins] = useState<CryptoSignal[]>([]);
  const [instruments, setInstruments] = useState<MarketInstrument[]>([]);
  const [futures, setFutures] = useState<FuturesItem[]>([]);
  const [history, setHistory] = useState<CryptoSignal[]>([]);
  const [performanceStats, setPerformanceStats] = useState<SignalPerformanceStats | null>(null);

  // Commodity Data States (Gold, Silver, Crude Oil, Zinc, Copper, Nat Gas, etc.)
  const [commoditySignals, setCommoditySignals] = useState<CryptoSignal[]>([]);
  const [commodityBest, setCommodityBest] = useState<CryptoSignal[]>([]);
  const [commodityInstruments, setCommodityInstruments] = useState<MarketInstrument[]>([]);
  const [commodityFutures, setCommodityFutures] = useState<FuturesItem[]>([]);
  const [commodityHistory, setCommodityHistory] = useState<CryptoSignal[]>([]);
  const [commodityPerformanceStats, setCommodityPerformanceStats] = useState<SignalPerformanceStats | null>(null);
  const [commodityPrices, setCommodityPrices] = useState<Record<string, { currentPrice: number; change24h: number }>>({});
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, { currentPrice: number; change24h: number }>>({});
  
  // Modal & Selection States
  const [inspectedSignal, setInspectedSignal] = useState<CryptoSignal | null>(null);
  const [sizingSignal, setSizingSignal] = useState<CryptoSignal | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoTraderSubTab, setAutoTraderSubTab] = useState<'matrix' | 'positions' | 'exchanges' | 'integration' | 'logs'>('matrix');

  // Screen Mode: "remove dark screen without change any other"
  // Default is false (clean light screen with dark screen removed). Toggleable anytime.
  const [isDarkScreen, setIsDarkScreen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vegaedge_screen_mode');
      return saved === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isDarkScreen) {
        document.documentElement.classList.add('dark-screen');
        document.documentElement.classList.remove('light-screen');
        document.body.classList.add('dark-screen');
        document.body.classList.remove('light-screen');
        localStorage.setItem('vegaedge_screen_mode', 'dark');
      } else {
        document.documentElement.classList.remove('dark-screen');
        document.documentElement.classList.add('light-screen');
        document.body.classList.remove('dark-screen');
        document.body.classList.add('light-screen');
        localStorage.setItem('vegaedge_screen_mode', 'light');
      }
    } catch (e) {
      console.warn('Error setting screen mode:', e);
    }
  }, [isDarkScreen]);

  // Fetch telemetry & signals for both Crypto and Commodities
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        healthRes,
        signalsRes,
        bestCoinsRes,
        instrumentsRes,
        futuresRes,
        historyRes,
        commSignalsRes,
        commBestRes,
        commInstrumentsRes,
        commFuturesRes,
        commHistoryRes,
        commListRes,
      ] = await Promise.all([
        fetch('/api/health').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/scanner').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/best-coins').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/instruments').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/futures').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/signals/history').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/commodities/scanner').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/commodities/best').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/commodities/instruments').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/commodities/futures').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/commodities/signals/history').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/commodities/list').then((r) => r.json()).catch(() => ({ success: false })),
      ]);

      // Crypto updates
      if (healthRes.success) setHealth(healthRes.data);
      if (signalsRes.success) setSignals(signalsRes.data || []);
      if (bestCoinsRes.success) setBestCoins(bestCoinsRes.data || []);
      if (instrumentsRes.success) setInstruments(instrumentsRes.data || []);
      if (futuresRes.success && Array.isArray(futuresRes.data)) {
        setFutures(futuresRes.data || []);
        const cpMap: Record<string, { currentPrice: number; change24h: number }> = {};
        futuresRes.data.forEach((f: any) => {
          const coin = f.underlying || (f.symbol ? f.symbol.replace('USD', '') : '');
          const price = f.ltp ?? f.markPrice ?? f.indexPrice;
          if (typeof price === 'number' && price > 0) {
            if (coin) cpMap[coin] = { currentPrice: price, change24h: f.change24h ?? 0 };
            if (f.symbol) cpMap[f.symbol] = { currentPrice: price, change24h: f.change24h ?? 0 };
          }
        });
        setCryptoPrices(cpMap);
      }
      if (historyRes.success) {
        setHistory(historyRes.data || []);
        if (historyRes.stats) setPerformanceStats(historyRes.stats);
      }

      // Commodity updates
      if (commSignalsRes.success) setCommoditySignals(commSignalsRes.data || []);
      if (commBestRes.success) setCommodityBest(commBestRes.data || []);
      if (commInstrumentsRes.success) setCommodityInstruments(commInstrumentsRes.data || []);
      if (commFuturesRes.success) setCommodityFutures(commFuturesRes.data || []);
      if (commHistoryRes.success) {
        setCommodityHistory(commHistoryRes.data || []);
        if (commHistoryRes.stats) setCommodityPerformanceStats(commHistoryRes.stats);
      }
      if (commListRes.success && Array.isArray(commListRes.data)) {
        const pricesMap: Record<string, { currentPrice: number; change24h: number }> = {};
        commListRes.data.forEach((c: CommoditySpec) => {
          pricesMap[c.id] = { currentPrice: c.currentPrice, change24h: c.change24h };
        });
        setCommodityPrices(pricesMap);
      }
    } catch (err) {
      console.error('Error fetching terminal data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and periodic refresh every 10s
  useEffect(() => {
    refreshData();
    const timer = setInterval(() => {
      refreshData();
    }, 10000);
    return () => clearInterval(timer);
  }, [refreshData]);

  // Handle trade sizing request from Scanner or Best Coins/Commodities
  const handleTradeSignal = (sig: CryptoSignal) => {
    setSizingSignal(sig);
    setActiveTab('risk');
  };

  // Handle instrument click to drill-down
  const handleSelectInstrument = (symbol: string) => {
    if (symbol.includes('-C-') || symbol.includes('-P-')) {
      setSelectedOptionSymbol(symbol);
      setActiveTab('greeks');
    } else {
      if (marketMode === 'commodities') {
        const comm = symbol.split('-')[0].replace('USD', '');
        setSelectedCommodity(comm);
        setActiveTab('technicals');
      } else {
        const coin = symbol.replace('USD', '').replace('USDT', '');
        setSelectedCoin(coin);
        setActiveTab('technicals');
      }
    }
  };

  const isCommodity = marketMode === 'commodities';

  return (
    <div
      className={`min-h-screen ${
        isDarkScreen ? 'dark-screen bg-black text-zinc-100' : 'light-screen bg-slate-50 text-zinc-900'
      } flex flex-col font-sans selection:bg-cyan-500 selection:text-black transition-colors duration-200`}
    >
      {/* Top Header with Master Market Switcher (Crypto vs Commodities) */}
      <Header
        health={health}
        marketMode={marketMode}
        onSelectMarketMode={(mode) => setMarketMode(mode)}
        selectedCoin={selectedCoin}
        onSelectCoin={(coin) => {
          setSelectedCoin(coin);
        }}
        selectedCommodity={selectedCommodity}
        onSelectCommodity={(comm) => {
          setSelectedCommodity(comm);
        }}
        commodityPrices={commodityPrices}
        cryptoPrices={cryptoPrices}
        onRefresh={refreshData}
        isLoading={isLoading}
        isDarkScreen={isDarkScreen}
        onToggleDarkScreen={() => setIsDarkScreen((prev) => !prev)}
        onOpenExchange={() => {
          setAutoTraderSubTab('exchanges');
          setActiveTab('autotrader');
        }}
      />

      {/* 13-Module Navigation Bar adapted for Crypto & Commodities */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        bestCoinsCount={isCommodity ? commodityBest.length : bestCoins.length}
        marketMode={marketMode}
      />

      {/* Main View Area with identical quantitative interface structure */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6">
        {/* Module 1: Autonomous Algo Execution Matrix */}
        {activeTab === 'autotrader' && (
          isCommodity ? (
            <CommodityAutoTraderView
              initialSubTab={autoTraderSubTab}
              onSelectCommodity={(comm) => {
                setSelectedCommodity(comm);
                setActiveTab('technicals');
              }}
            />
          ) : (
            <AutoTraderView
              initialSubTab={autoTraderSubTab}
              onSelectCoin={(coin) => {
                setSelectedCoin(coin);
                setActiveTab('technicals');
              }}
            />
          )
        )}

        {/* Module 2: Quantitative Scanner */}
        {activeTab === 'scanner' && (
          <ScannerView
            signals={isCommodity ? commoditySignals : signals}
            onSelectSignal={(sig) => setInspectedSignal(sig)}
            onTradeSignal={handleTradeSignal}
            isLoading={isLoading}
          />
        )}

        {/* Module 3: Best Coins / Best Commodities */}
        {activeTab === 'best-coins' && (
          <BestCoinsView
            bestCoins={isCommodity ? commodityBest : bestCoins}
            onSelectSignal={(sig) => setInspectedSignal(sig)}
            onTradeSignal={handleTradeSignal}
          />
        )}

        {/* Module 4: Market Overview */}
        {activeTab === 'market' && (
          <MarketView
            instruments={isCommodity ? commodityInstruments : instruments}
            isLoading={isLoading}
            onSelectInstrument={handleSelectInstrument}
          />
        )}

        {/* Module 5: Futures & Perps / MCX & Comex */}
        {activeTab === 'futures' && (
          <FuturesView
            futures={isCommodity ? commodityFutures : futures}
            isLoading={isLoading}
            onSelectSymbol={(sym) => {
              if (isCommodity) {
                const comm = sym.split('-')[0].replace('USD', '');
                setSelectedCommodity(comm);
                setActiveTab('technicals');
              } else {
                const coin = sym.replace('USD', '').replace('USDT', '');
                setSelectedCoin(coin);
                setActiveTab('technicals');
              }
            }}
          />
        )}

        {/* Module 6: Options Chain */}
        {activeTab === 'options' && (
          <OptionsChainView
            underlying={isCommodity ? selectedCommodity : selectedCoin}
            onSelectOption={(sym) => {
              setSelectedOptionSymbol(sym);
              setActiveTab('greeks');
            }}
          />
        )}

        {/* Module 7: Option Greeks Sensitivity */}
        {activeTab === 'greeks' && (
          <OptionGreeksView
            initialSymbol={
              selectedOptionSymbol ||
              (isCommodity ? `${selectedCommodity}-2740-C` : '')
            }
          />
        )}

        {/* Module 8: Vega & Volatility Analysis */}
        {activeTab === 'volatility' && (
          <VolatilityView underlying={isCommodity ? selectedCommodity : selectedCoin} />
        )}

        {/* Module 9: Technical Analysis & Candlestick Charts */}
        {activeTab === 'technicals' && (
          <TechnicalAnalysisView
            symbol={isCommodity ? `${selectedCommodity}USD` : `${selectedCoin}USD`}
          />
        )}

        {/* Module 10: Fundamentals Profile */}
        {activeTab === 'fundamentals' && (
          isCommodity ? (
            <CommodityFundamentalsView
              selectedCommodity={selectedCommodity}
              onSelectCommodity={(c) => setSelectedCommodity(c)}
            />
          ) : (
            <FundamentalProfileView
              coin={selectedCoin}
              onSelectCoin={(c) => setSelectedCoin(c)}
            />
          )
        )}

        {/* Module 11: Signal Performance & Day-by-Day Audit */}
        {activeTab === 'history' && (
          <SignalHistoryView
            history={isCommodity ? commodityHistory : history}
            stats={isCommodity ? commodityPerformanceStats : performanceStats}
            onSelectSignal={(sig) => setInspectedSignal(sig)}
            onRefresh={refreshData}
          />
        )}

        {/* Module 12: Risk Management & Contract Sizing */}
        {activeTab === 'risk' && (
          <RiskManagementView
            signals={isCommodity ? commoditySignals : signals}
            selectedSignal={sizingSignal}
          />
        )}

        {/* Module 13: Feeds & Telemetry / API Health */}
        {activeTab === 'health' && (
          <ApiHealthView
            health={health}
            onRefresh={refreshData}
            isLoading={isLoading}
          />
        )}

        {/* Module 14: Quantitative Settings */}
        {activeTab === 'settings' && (
          <SettingsView onSettingsUpdated={refreshData} />
        )}
      </main>

      {/* Footer Disclaimer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 px-4 py-3 text-center text-xs text-zinc-500 font-mono">
        {isCommodity ? (
          <>
            VEGAEDGE COMMODITIES TERMINAL | COMEX · NYMEX · MCX INDIA · LME |{' '}
            <span className="text-zinc-400">
              Gold, Silver, Crude Oil, Zinc, Copper institutional derivatives & quantitative signal intelligence.
            </span>
          </>
        ) : (
          <>
            VEGAEDGE TERMINAL | POWERED BY DELTA EXCHANGE INDIA API |{' '}
            <span className="text-zinc-400">
              IMPORTANT: This is a market-data and quantitative signal-processing system, not a guarantee of profit.
            </span>
          </>
        )}
      </footer>

      {/* Section 23 Structured Report Modal */}
      <SignalDetailModal
        signal={inspectedSignal}
        onClose={() => setInspectedSignal(null)}
      />
    </div>
  );
}
