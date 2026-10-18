import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Play,
  Pause,
  Zap,
  AlertOctagon,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Code,
  Terminal as TerminalIcon,
  Sliders,
  Globe,
  Activity,
  Layers,
  Sparkles,
  TrendingUp,
  XCircle,
  KeyRound,
  Send,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import {
  AutoTraderStatus,
  AutoTraderConfig,
  AutoTradeOrder,
  SupportedExchange,
  ExchangeConnectionStatus,
} from '../types';
import { safeToLocale, safePrice } from '../utils';

interface Props {
  onSelectCoin?: (coin: string) => void;
  initialSubTab?: 'matrix' | 'positions' | 'exchanges' | 'integration' | 'logs';
}

export const AutoTraderView: React.FC<Props> = ({ onSelectCoin, initialSubTab }) => {
  const [status, setStatus] = useState<AutoTraderStatus | null>(null);
  const [config, setConfig] = useState<AutoTraderConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'positions' | 'exchanges' | 'integration' | 'logs'>(
    initialSubTab || 'matrix'
  );
  const [codeSnippetTab, setCodeSnippetTab] = useState<'python' | 'tradingview' | 'curl'>('python');

  // Exchange connector form state
  const [selectedExchange, setSelectedExchange] = useState<SupportedExchange>('DELTA_INDIA');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiSecretInput, setApiSecretInput] = useState('');
  const [passphraseInput, setPassphraseInput] = useState('');
  const [isTestnetInput, setIsTestnetInput] = useState(false);
  const [customWebhookInput, setCustomWebhookInput] = useState('');
  const [exchangeTestStatus, setExchangeTestStatus] = useState<ExchangeConnectionStatus | null>(null);
  const [isTestingExchange, setIsTestingExchange] = useState(false);
  const [exchangeSaveMsg, setExchangeSaveMsg] = useState<string | null>(null);
  const [configuredExchanges, setConfiguredExchanges] = useState<Record<string, { hasSecret: boolean; apiKeyPreview: string }> | null>(null);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Integration snippets
  const [snippets, setSnippets] = useState<{
    baseUrl: string;
    signalsFeedUrl: string;
    webhookUrl: string;
    webhookSecretKey: string;
    pythonCcxt: string;
    tradingViewWebhook: string;
    curlSnippet: string;
  } | null>(null);

  // Outbound Webhook input
  const [outboundWebhookUrl, setOutboundWebhookUrl] = useState('');

  // Resilient JSON fetch helper to prevent unhandled rejection during dev server reloads or network drops
  const safeFetch = async (url: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  // Fetch status and config
  const fetchStatus = useCallback(async (signal?: AbortSignal) => {
    try {
      const [jsonStatus, jsonConfig] = await Promise.all([
        safeFetch('/api/autotrade/status', signal),
        safeFetch('/api/autotrade/config', signal),
      ]);

      if (jsonStatus?.success && jsonStatus.data) {
        setStatus(jsonStatus.data);
      }
      if (jsonConfig?.success && jsonConfig.data) {
        setConfig(jsonConfig.data);
        if (jsonConfig.data.outboundWebhookUrl) {
          setOutboundWebhookUrl(jsonConfig.data.outboundWebhookUrl);
        }
      }
    } catch {
      // Quiet poll
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch static integration data once or upon update
  const fetchIntegrationData = useCallback(async (signal?: AbortSignal) => {
    try {
      const [jsonSnippets, jsonCreds] = await Promise.all([
        safeFetch('/api/autotrade/integration-code', signal),
        safeFetch('/api/autotrade/exchange-credentials', signal),
      ]);

      if (jsonSnippets?.success && jsonSnippets.data) {
        setSnippets(jsonSnippets.data);
      }
      if (jsonCreds?.success && jsonCreds.data) {
        setConfiguredExchanges(jsonCreds.data);
      }
    } catch {
      // Quiet fallback
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchStatus(controller.signal);
    fetchIntegrationData(controller.signal);

    const interval = setInterval(() => {
      fetchStatus(controller.signal);
    }, 4000); // 4-second refresh for live auto-trader updates

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchStatus, fetchIntegrationData]);

  // Master Toggle: Enable / Disable Auto-Trader
  const handleToggleAutoTrader = async () => {
    if (!config) return;
    const newEnabled = !config.enabled;
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/autotrade/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to toggle AutoTrader:', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Toggle Execution Mode: Simulated Live vs Live Exchange
  const handleToggleExecutionMode = async (mode: 'SIMULATED_LIVE' | 'LIVE_EXCHANGE') => {
    setIsSavingConfig(true);
    if (mode === 'LIVE_EXCHANGE') {
      setSelectedExchange('DELTA_INDIA');
      setActiveSubTab('exchanges');
    }
    try {
      const res = await fetch('/api/autotrade/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executionMode: mode }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to update execution mode:', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Force Scan & Auto-Trade Top 5 Now
  const handleForceScanAndTrade = async () => {
    setIsExecuting(true);
    try {
      const res = await fetch('/api/autotrade/execute-top5', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to force execute Top 5:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  // Emergency Kill Switch
  const handleEmergencyStop = async () => {
    if (!window.confirm('EMERGENCY KILL SWITCH: Are you sure you want to CLOSE ALL active positions immediately and PAUSE the Auto-Trader?')) {
      return;
    }
    try {
      const res = await fetch('/api/autotrade/emergency-stop', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.data.message || 'All positions closed and bot paused.');
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to trigger emergency stop:', err);
    }
  };

  // Manually Close Active Position
  const handleClosePosition = async (orderId: string, coin: string) => {
    if (!window.confirm(`Close active position on ${coin} at current market price?`)) return;
    try {
      const res = await fetch('/api/autotrade/close-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to close position:', err);
    }
  };

  // Save Exchange Credentials
  const handleSaveExchangeCreds = async () => {
    if (!apiKeyInput.trim()) {
      alert('Please enter your API Key before saving.');
      return;
    }
    try {
      const res = await fetch('/api/autotrade/exchange-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchange: selectedExchange,
          apiKey: apiKeyInput,
          secret: apiSecretInput,
          passphrase: passphraseInput,
          isTestnet: isTestnetInput,
          customWebhookUrl: customWebhookInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExchangeSaveMsg(data.message || `Credentials for ${selectedExchange} updated.`);
        setTimeout(() => setExchangeSaveMsg(null), 6000);
        // Also update config active exchange
        await fetch('/api/autotrade/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exchange: selectedExchange }),
        });
        await fetchStatus();
        await fetchIntegrationData();
        // Immediately run connection test
        handleTestExchange();
      } else {
        alert(`Failed to save: ${data.error || data.message}`);
      }
    } catch (err) {
      console.error('Failed to save exchange credentials:', err);
    }
  };

  // Test Exchange Connection - Real-time network probe
  const handleTestExchange = async () => {
    setIsTestingExchange(true);
    try {
      const res = await fetch('/api/autotrade/test-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchange: selectedExchange,
          apiKey: apiKeyInput,
          secret: apiSecretInput,
          passphrase: passphraseInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExchangeTestStatus(data.data);
      } else {
        setExchangeTestStatus({
          exchange: selectedExchange,
          exchangeName: selectedExchange,
          status: 'DISCONNECTED',
          pingMs: 0,
          availableBalanceUsd: 0,
          totalEquityUsd: 0,
          currency: 'USD',
          lastChecked: new Date().toISOString(),
          message: data.error || 'Connection failed',
          mode: 'LIVE',
        });
      }
    } catch (err: any) {
      setExchangeTestStatus({
        exchange: selectedExchange,
        exchangeName: selectedExchange,
        status: 'DISCONNECTED',
        pingMs: 0,
        availableBalanceUsd: 0,
        totalEquityUsd: 0,
        currency: 'USD',
        lastChecked: new Date().toISOString(),
        message: err.message || 'Connection test error',
        mode: 'LIVE',
      });
    } finally {
      setIsTestingExchange(false);
    }
  };

  // Save Outbound Webhook URL
  const handleSaveOutboundWebhook = async () => {
    try {
      const res = await fetch('/api/autotrade/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outboundWebhookUrl }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Outbound Webhook URL saved successfully!');
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to save outbound webhook:', err);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const isAutoEnabled = config?.enabled ?? true;
  const isSimulated = config?.executionMode === 'SIMULATED_LIVE';
  const stats = status?.stats || {
    totalTradesExecuted: 0,
    winningTrades: 0,
    losingTrades: 0,
    stopLossHitsCount: 0,
    targetHitsCount: 0,
    breakevenCount: 0,
    winRate: 0,
    totalRealizedPnLUsd: 0,
    totalRealizedR: 0,
    profitFactor: 1.0,
  };

  return (
    <div className="space-y-6">
      {/* Top Hero Banner & Autonomous Control Center */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-5 md:p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Bot className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                    Auto-Trader & Multi-Exchange Bot Hub
                  </h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/80">
                    TOP 5 COIN AI ENGINE
                  </span>
                </div>
                <p className="text-sm text-zinc-400 mt-0.5">
                  Autonomous Buy/Sell order execution with automated protective Stop-Loss & Target 1 Breakeven Trailing. Connects to any exchange or external application.
                </p>
              </div>
            </div>

            {/* Quick Badges */}
            <div className="flex items-center gap-2 pt-1 flex-wrap text-xs font-mono">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                Target Exchange: <strong className="text-white">{config?.exchange || 'DELTA_INDIA'}</strong>
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Stop Loss: <strong className="text-emerald-400">Auto-Armed (-2.2 ATR)</strong>
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                Trailing Breakeven: <strong className="text-amber-300">Active at T1 (0.60R)</strong>
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                Cycle: <strong className="text-zinc-200">Every 15s</strong>
              </span>
            </div>
          </div>

          {/* Master Bot Action Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Direct Connect Delta Exchange Button */}
            <button
              onClick={() => {
                setSelectedExchange('DELTA_INDIA');
                setActiveSubTab('exchanges');
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-all shadow-md shadow-amber-500/20"
              title="Enter Delta Exchange API Key & Secret"
            >
              <KeyRound className="w-4 h-4 fill-black text-black" />
              <span>
                {configuredExchanges?.['DELTA_INDIA']?.hasSecret
                  ? `Delta API: Connected (${configuredExchanges['DELTA_INDIA'].apiKeyPreview})`
                  : 'Connect Delta Exchange API'}
              </span>
            </button>

            {/* Auto Trading Master Switch */}
            <button
              onClick={handleToggleAutoTrader}
              disabled={isSavingConfig}
              className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-lg font-semibold text-sm transition-all shadow-lg ${
                isAutoEnabled
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
              }`}
            >
              {isAutoEnabled ? (
                <>
                  <Play className="w-4 h-4 fill-black text-black" />
                  <span>AUTONOMOUS TRADING: ON</span>
                  <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 text-zinc-400" />
                  <span>AUTONOMOUS TRADING: PAUSED</span>
                </>
              )}
            </button>

            {/* Force Scan & Execute */}
            <button
              onClick={handleForceScanAndTrade}
              disabled={isExecuting}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm transition-all shadow-md shadow-cyan-600/20"
              title="Force instantaneous scan of top candlestick patterns and execute Top 5"
            >
              <RefreshCw className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
              <span>{isExecuting ? 'Executing...' : 'Auto-Trade Top 5 Now'}</span>
            </button>

            {/* Emergency Kill Switch */}
            <button
              onClick={handleEmergencyStop}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white font-medium text-sm transition-all border border-rose-500/50"
              title="Immediately close all open positions and halt bot execution"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>Kill Switch</span>
            </button>
          </div>
        </div>

        {/* Execution Mode Selector Banner */}
        <div className="mt-5 pt-4 border-t border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-zinc-400 font-mono">Execution Engine:</span>
            <div className="inline-flex rounded-lg bg-zinc-950 p-1 border border-zinc-800">
              <button
                onClick={() => handleToggleExecutionMode('SIMULATED_LIVE')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  isSimulated
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Paper / Simulated Live
              </button>
              <button
                onClick={() => handleToggleExecutionMode('LIVE_EXCHANGE')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  !isSimulated
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Live Exchange API
              </button>
            </div>
            <button
              onClick={() => {
                setSelectedExchange('DELTA_INDIA');
                setActiveSubTab('exchanges');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-600/40 font-mono text-xs font-semibold transition-all cursor-pointer"
              title="Click to view or update Delta Exchange API Credentials"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {configuredExchanges?.['DELTA_INDIA']?.hasSecret
                  ? `Delta API: Connected (${configuredExchanges['DELTA_INDIA'].apiKeyPreview})`
                  : '🔑 Enter Delta API Credentials'}
              </span>
            </button>
            <span className="text-zinc-500 hidden sm:inline font-mono">
              {isSimulated
                ? '• Real-time order simulation matching Delta Exchange orderbook'
                : '• Direct live order routing to configured exchange API'}
            </span>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2.5 sm:gap-4 font-mono flex-wrap text-xs">
            <div className="bg-zinc-900/90 px-2.5 py-1 rounded-md border border-zinc-800">
              <span className="text-zinc-500">Active:</span>{' '}
              <strong className="text-cyan-400">{status?.activePositionsCount || 0}</strong> / {status?.maxOpenPositions || 5}
            </div>
            <div className="bg-zinc-900/90 px-2.5 py-1 rounded-md border border-zinc-800">
              <span className="text-zinc-500">Total Trades:</span>{' '}
              <strong className="text-white font-bold">{stats.totalTradesExecuted}</strong>
            </div>
            <div className="bg-zinc-900/90 px-2.5 py-1 rounded-md border border-zinc-800">
              <span className="text-zinc-500">SL Hits:</span>{' '}
              <strong className="text-rose-400 font-bold">{stats.stopLossHitsCount ?? 0}</strong>
              <span className="text-[10px] text-zinc-500 ml-1">(Counted)</span>
            </div>
            <div className="bg-zinc-900/90 px-2.5 py-1 rounded-md border border-zinc-800">
              <span className="text-zinc-500">Target Hits:</span>{' '}
              <strong className="text-emerald-400 font-bold">{stats.targetHitsCount ?? 0}</strong>
              <span className="text-[10px] text-zinc-500 ml-1">(Counted)</span>
            </div>
            <div className="bg-zinc-900/90 px-2.5 py-1 rounded-md border border-zinc-800">
              <span className="text-zinc-500">Win Rate:</span>{' '}
              <strong className={stats.winRate >= 50 ? 'text-emerald-400' : 'text-zinc-300'}>
                {stats.winRate}%
              </strong>
            </div>
            <div className="bg-zinc-900/90 px-2.5 py-1 rounded-md border border-zinc-800">
              <span className="text-zinc-500">Realized PnL:</span>{' '}
              <strong className={stats.totalRealizedPnLUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {stats.totalRealizedPnLUsd >= 0 ? `+$${stats.totalRealizedPnLUsd}` : `-$${Math.abs(stats.totalRealizedPnLUsd)}`}
              </strong>
            </div>
            <div className="bg-zinc-900/90 px-2.5 py-1 rounded-md border border-zinc-800">
              <span className="text-zinc-500">Realized R:</span>{' '}
              <strong className={stats.totalRealizedR >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {stats.totalRealizedR >= 0 ? `+${stats.totalRealizedR}R` : `${stats.totalRealizedR}R`}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === 'matrix'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Top 5 High Probability Coins</span>
          <span className="px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 text-xs font-mono">
            {status?.top5Coins?.length || 5}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('positions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === 'positions'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Positions & Trade History</span>
          {status && (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold">
                {status.activePositions.length} Open
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-normal">
                {stats.totalTradesExecuted} Closed
              </span>
            </div>
          )}
        </button>

        <button
          onClick={() => {
            setSelectedExchange('DELTA_INDIA');
            setActiveSubTab('exchanges');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeSubTab === 'exchanges'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
          }`}
        >
          <KeyRound className="w-4 h-4 text-amber-400" />
          <span>Connect Exchange (Delta API Keys)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
            {configuredExchanges?.['DELTA_INDIA']?.hasSecret ? 'CONNECTED' : 'LOGIN / API'}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('integration')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === 'integration'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Connect Any Application (API / Webhooks)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === 'logs'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <TerminalIcon className="w-4 h-4" />
          <span>Live Execution Logs</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 1. TOP 5 HIGH PROBABILITY TARGET MATRIX                      */}
      {/* ============================================================ */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-4">
          {/* Quick Delta Exchange API Connection Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-amber-950/40 via-zinc-900/90 to-zinc-950 rounded-xl border border-amber-500/30 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Delta Exchange India Live Trading Connector
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    configuredExchanges?.['DELTA_INDIA']?.hasSecret
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                  }`}>
                    {configuredExchanges?.['DELTA_INDIA']?.hasSecret
                      ? `API KEY LINKED: ${configuredExchanges['DELTA_INDIA'].apiKeyPreview}`
                      : 'API CREDENTIALS NEEDED'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {configuredExchanges?.['DELTA_INDIA']?.hasSecret
                    ? 'Your Delta Exchange API keys are securely linked. Automated algorithmic orders will route directly to your Delta account.'
                    : 'To trade live on Delta Exchange, connect your API Key and Secret (generated in your Delta India profile under Settings → API Keys).'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedExchange('DELTA_INDIA');
                setActiveSubTab('exchanges');
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all shadow-md shadow-amber-500/20 whitespace-nowrap cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 fill-black text-black" />
              <span>{configuredExchanges?.['DELTA_INDIA']?.hasSecret ? 'Manage Delta API Keys' : 'Enter Delta Exchange API Credentials'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>Top 5 High Score Probability Target Matrix</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                  MIN SCORE ≥ 75
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                The algorithm continuously evaluates all coins, picks the Top 5 highest confluence setups, and automatically places orders with protective Stop-Loss & Take-Profit targets.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-mono">Status:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-950 text-xs font-mono text-zinc-300 border border-zinc-800">
                <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                Live Delta India Feed
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {status?.top5Coins && status.top5Coins.length > 0 ? (
              status.top5Coins.map((target, idx) => {
                const isBuy = target.signal === 'BUY';
                const hasPosition = target.status === 'POSITION_ACTIVE';
                const hasOrder = target.status === 'ORDER_PLACED';

                return (
                  <div
                    key={target.coin}
                    className={`rounded-xl border p-4 flex flex-col justify-between transition-all relative overflow-hidden ${
                      hasPosition
                        ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                        : hasOrder
                        ? 'bg-cyan-950/20 border-cyan-500/40'
                        : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {/* Top Rank Badge & Direction */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono font-bold flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="text-base font-bold text-white tracking-wide">{target.coin}</span>
                        </div>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono flex items-center gap-1 ${
                            isBuy
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {target.signal}
                        </span>
                      </div>

                      {/* Candlestick Pattern & Confluence Score */}
                      <div className="space-y-1 mb-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400">Pattern:</span>
                          <span className="font-semibold text-zinc-200 text-right truncate max-w-[130px]">
                            {typeof target.candlestickPattern === 'object' && target.candlestickPattern !== null ? (target.candlestickPattern as any).name : (target.candlestickPattern || 'Confluence')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400">Score:</span>
                          <span className="font-mono font-bold text-cyan-400">{target.score}/100</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 rounded-full"
                            style={{ width: `${Math.min(100, target.score)}%` }}
                          />
                        </div>
                      </div>

                      {/* Trade Parameters: Entry, SL, T1 */}
                      <div className="space-y-1.5 p-2.5 bg-zinc-950/80 rounded-lg border border-zinc-800/80 text-xs font-mono mb-3">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Limit Entry:</span>
                          <strong className="text-white">{safePrice(target.entry)}</strong>
                        </div>
                        <div className="flex justify-between items-center text-rose-400">
                          <span>Stop Loss (-2.2 ATR):</span>
                          <strong>{safePrice(target.stopLoss)}</strong>
                        </div>
                        <div className="flex justify-between items-center text-emerald-400">
                          <span>Target 1 (1.50R):</span>
                          <strong>{safePrice(target.target1)}</strong>
                        </div>
                        <div className="flex justify-between items-center text-zinc-500 pt-1 border-t border-zinc-800/60">
                          <span>R:R Ratio:</span>
                          <span className="text-zinc-300 font-semibold">{target.riskRewardRatio}R</span>
                        </div>
                      </div>
                    </div>

                    {/* Status & Quick Action */}
                    <div>
                      <div className="mb-2">
                        {hasPosition ? (
                          <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 py-1 rounded">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            POSITION ACTIVE
                          </div>
                        ) : hasOrder ? (
                          <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/80 py-1 rounded">
                            <Clock className="w-3.5 h-3.5" />
                            LIMIT ORDER ARMED
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-zinc-400 bg-zinc-800/40 border border-zinc-800 py-1 rounded">
                            <Bot className="w-3.5 h-3.5 text-cyan-400" />
                            READY FOR AUTO-TRADE
                          </div>
                        )}
                      </div>

                      {onSelectCoin && (
                        <button
                          onClick={() => onSelectCoin(target.coin)}
                          className="w-full text-center text-xs text-zinc-400 hover:text-cyan-400 transition-colors py-1 flex items-center justify-center gap-1"
                        >
                          <span>View Technical Chart</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-5 text-center py-12 bg-zinc-900/40 rounded-xl border border-zinc-800 text-zinc-400">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-cyan-500" />
                <p className="text-sm">Scanning live Delta Exchange India markets for high-probability setups...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. ACTIVE POSITIONS & OPEN ORDERS PANEL + TRADE LEDGER       */}
      {/* ============================================================ */}
      {activeSubTab === 'positions' && (
        <div className="space-y-8">
          {/* Active Positions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <span>Active Open Positions</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-mono border border-cyan-800">
                  {status?.activePositions.length || 0} Open
                </span>
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span>Auto-trailing SL to Breakeven at Target 1</span>
              </div>
            </div>

            {status?.activePositions && status.activePositions.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900/80 text-xs font-mono text-zinc-400 uppercase border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Position & Trade ID</th>
                      <th className="py-3 px-4">Coin & Setup</th>
                      <th className="py-3 px-4">Signal</th>
                      <th className="py-3 px-4">Time of Execution</th>
                      <th className="py-3 px-4">Entry / Current</th>
                      <th className="py-3 px-4">Stop-Loss Trailing</th>
                      <th className="py-3 px-4">Target 1 (0.60R)</th>
                      <th className="py-3 px-4">Unrealized PnL</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {status.activePositions.map((pos) => {
                      const isLong = pos.signal === 'BUY';
                      const isProfitable = pos.unrealizedPnLPercent >= 0;
                      const execTime = pos.timeOfExecution || pos.entryTime;

                      return (
                        <tr key={pos.id} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-cyan-400 text-xs tracking-wide">
                              {pos.positionId || pos.id}
                            </div>
                            <div className="text-[11px] text-zinc-500 font-mono">
                              Trade: {pos.tradeId || pos.id}
                            </div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">
                              Duration: <strong className="text-zinc-200">{pos.tradeDuration || 'Live'}</strong>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-white flex items-center gap-1.5 font-sans">
                              <span>{pos.coin}</span>
                              <span className="text-xs font-mono text-zinc-400">({pos.symbol})</span>
                            </div>
                            <div className="text-xs text-zinc-400 truncate max-w-[180px]">
                              {(typeof pos.candlestickPattern === 'object' && pos.candlestickPattern !== null ? (pos.candlestickPattern as any).name : pos.candlestickPattern) || 'Confluence'} (Score: {pos.finalScore})
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                isLong
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {pos.signal}
                            </span>
                            <div className="text-[10px] text-zinc-500 mt-0.5">
                              {pos.status.replace('_', ' ')}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-xs">
                            <div className="text-white font-medium">
                              {execTime ? new Date(execTime).toLocaleTimeString() : 'Pending'}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              {execTime ? new Date(execTime).toLocaleDateString() : ''}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-xs">
                            <div>Entry: <strong className="text-white">{safePrice(pos.entryPrice)}</strong></div>
                            <div>Live: <span className="text-zinc-300">{safePrice(pos.currentPrice)}</span></div>
                          </td>

                          <td className="py-3 px-4 text-xs">
                            <div className="flex items-center gap-1 font-bold text-rose-400">
                              <span>{safePrice(pos.stopLossPrice)}</span>
                              {pos.isBreakevenTrailed && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/30">
                                  BREAK-EVEN
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500">
                              Orig: {safePrice(pos.originalStopLoss)}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-xs text-emerald-400 font-semibold">
                            {safePrice(pos.target1Price)}
                          </td>

                          <td className="py-3 px-4">
                            <div
                              className={`font-bold text-sm ${
                                isProfitable ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isProfitable ? `+${pos.unrealizedPnLPercent}%` : `${pos.unrealizedPnLPercent}%`}
                            </div>
                            <div className="text-xs text-zinc-400">
                              {isProfitable ? `+$${pos.unrealizedPnLUsd}` : `-$${Math.abs(pos.unrealizedPnLUsd)}`}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleClosePosition(pos.id, pos.coin)}
                              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-rose-900/80 text-zinc-300 hover:text-white text-xs transition-colors border border-zinc-700"
                            >
                              Close Position
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-400">
                <p className="text-sm font-medium">No open positions at this moment.</p>
                <p className="text-xs text-zinc-500 mt-1">
                  The Auto-Trader will automatically execute when high score candlestick confirmation triggers on the Top 5 coins.
                </p>
                <button
                  onClick={handleForceScanAndTrade}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium inline-flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Scan & Place Orders Now
                </button>
              </div>
            )}
          </div>

          {/* Mapped Completed Trades Ledger */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Mapped Trade Execution & Stop-Loss / Target Ledger</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                    {status?.recentClosedTrades?.length || 0} Trades Recorded
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Every position is mapped with its unique Position ID, exact Time of Execution, Stop-Loss Hit Time, Target Hit Time, and Duration. Every Stop-Loss is strictly counted in trade metrics.
                </p>
              </div>

              {/* Badges Summary */}
              <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
                <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                  Total Counted: <strong className="text-white">{stats.totalTradesExecuted}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-md bg-rose-950/60 border border-rose-800/80 text-rose-300 font-bold">
                  SL Hits Counted: {stats.stopLossHitsCount ?? 0}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 font-bold">
                  Target Hits Counted: {stats.targetHitsCount ?? 0}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-amber-950/60 border border-amber-800/80 text-amber-300">
                  Breakeven Exits: {stats.breakevenCount ?? 0}
                </span>
              </div>
            </div>

            {status?.recentClosedTrades && status.recentClosedTrades.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900/80 text-xs font-mono text-zinc-400 uppercase border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Mapped Position & Trade ID</th>
                      <th className="py-3 px-4">Coin & Setup</th>
                      <th className="py-3 px-4">Time of Execution</th>
                      <th className="py-3 px-4">Exit Event & Trigger Time</th>
                      <th className="py-3 px-4">Entry / Exit Price</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Realized PnL & R</th>
                      <th className="py-3 px-4 text-right">Trade Accounting</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {status.recentClosedTrades.map((trade) => {
                      const isLong = trade.signal === 'BUY';
                      const isProfitable = (trade.realizedPnLUsd || 0) > 0;
                      const isSL = trade.status === 'STOP_LOSS_HIT' || trade.hitType === 'STOP_LOSS';
                      const isTP = trade.status.includes('TARGET') || trade.hitType?.startsWith('TARGET');
                      const execTime = trade.timeOfExecution || trade.entryTime;
                      const slTime = trade.timeOfStopLoss || (isSL ? trade.closeTime : undefined);
                      const tpTime = trade.timeOfTarget || (isTP ? trade.closeTime : undefined);

                      return (
                        <tr key={trade.id} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-cyan-300 text-xs">
                              {trade.positionId || trade.id}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-mono">
                              Trade: {trade.tradeId || trade.id}
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">
                              Order ID: {trade.exchangeOrderId || 'EX_DELTA'}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-white flex items-center gap-1.5 font-sans">
                              <span>{trade.coin}</span>
                              <span className="text-xs font-mono text-zinc-400">({trade.symbol})</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  isLong
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}
                              >
                                {trade.signal}
                              </span>
                            </div>
                            <div className="text-xs text-zinc-400 truncate max-w-[160px]">
                              {(typeof trade.candlestickPattern === 'object' && trade.candlestickPattern !== null ? (trade.candlestickPattern as any).name : trade.candlestickPattern) || 'Confluence'} (Score: {trade.finalScore})
                            </div>
                          </td>

                          <td className="py-3 px-4 text-xs">
                            <div className="text-white font-medium">
                              {execTime ? new Date(execTime).toLocaleTimeString() : 'N/A'}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              {execTime ? new Date(execTime).toLocaleDateString() : ''}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-xs">
                            {isSL ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                  {trade.isBreakevenTrailed ? 'BREAK-EVEN STOP HIT' : 'STOP-LOSS HIT'}
                                </span>
                                <div className="text-[11px] text-rose-400 mt-0.5 font-semibold">
                                  Time: {slTime ? new Date(slTime).toLocaleTimeString() : 'N/A'}
                                </div>
                                <div className="text-[10px] text-zinc-400">
                                  Trigger: {safePrice(trade.exitPrice || trade.stopLossPrice)}
                                </div>
                              </div>
                            ) : isTP ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  TARGET HIT ({trade.status.replace('_HIT', '')})
                                </span>
                                <div className="text-[11px] text-emerald-400 mt-0.5 font-semibold">
                                  Time: {tpTime ? new Date(tpTime).toLocaleTimeString() : 'N/A'}
                                </div>
                                <div className="text-[10px] text-zinc-400">
                                  Exit: {safePrice(trade.exitPrice || trade.target3Price)}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                  MANUAL CLOSE
                                </span>
                                <div className="text-[11px] text-amber-400 mt-0.5">
                                  Time: {trade.closeTime ? new Date(trade.closeTime).toLocaleTimeString() : 'N/A'}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-xs">
                            <div>Entry: <strong className="text-white">{safePrice(trade.entryPrice)}</strong></div>
                            <div>Exit: <strong className="text-zinc-200">{safePrice(trade.exitPrice || trade.currentPrice)}</strong></div>
                            <div className="text-[10px] text-zinc-500">SL: {safePrice(trade.stopLossPrice)}</div>
                          </td>

                          <td className="py-3 px-4 text-xs font-semibold text-zinc-300">
                            {trade.tradeDuration || 'N/A'}
                          </td>

                          <td className="py-3 px-4">
                            <div
                              className={`font-bold text-sm ${
                                isProfitable ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isProfitable ? `+${trade.realizedPnLPercent}%` : `${trade.realizedPnLPercent}%`}
                            </div>
                            <div className="text-xs text-zinc-400">
                              {isProfitable ? `+$${trade.realizedPnLUsd}` : `-$${Math.abs(trade.realizedPnLUsd)}`}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              R: {trade.realizedR >= 0 ? `+${trade.realizedR}R` : `${trade.realizedR}R`}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-700/80 text-emerald-400 text-[11px] font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Counted in Stats</span>
                            </span>
                            <div className="text-[10px] text-zinc-500 mt-1">
                              Distinct Position
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-400">
                <p className="text-sm">No closed trades recorded yet.</p>
                <p className="text-xs text-zinc-500 mt-1">
                  When Stop-Loss or Targets hit, trades will be mapped with execution time and SL trigger time right here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. EXCHANGE CONNECTOR WINDOW ("Connect with Exchange")      */}
      {/* ============================================================ */}
      {activeSubTab === 'exchanges' && (
        <div className="space-y-6">
          <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                <span>Exchange Connectivity & Routing</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Select your target exchange. The system can execute trades directly via native API or simulated paper trading. All secrets are stored securely in encrypted server storage.
              </p>
            </div>

            {/* Exchange Selection Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono text-xs">
              {(
                [
                  { id: 'DELTA_INDIA', name: 'Delta Exchange India' },
                  { id: 'BINANCE', name: 'Binance Futures' },
                  { id: 'BYBIT', name: 'Bybit V5' },
                  { id: 'OKX', name: 'OKX Perpetual' },
                  { id: 'COINDCX', name: 'CoinDCX' },
                  { id: 'UNIVERSAL_WEBHOOK', name: 'Custom / Webhook' },
                ] as const
              ).map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => {
                    setSelectedExchange(ex.id);
                    setExchangeTestStatus(null);
                  }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedExchange === ex.id
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="text-xs uppercase">{ex.name}</div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    {config?.exchange === ex.id ? '● Active Target' : 'Available'}
                  </div>
                </button>
              ))}
            </div>

            {/* Delta Exchange India Tutorial & Status Guide */}
            {selectedExchange === 'DELTA_INDIA' && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Delta Exchange India API Integration Guide</span>
                  </div>
                  <span className={`text-[11px] font-mono px-2.5 py-1 rounded font-bold ${
                    configuredExchanges?.['DELTA_INDIA']?.hasSecret
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {configuredExchanges?.['DELTA_INDIA']?.hasSecret
                      ? `STATUS: CONNECTED (${configuredExchanges['DELTA_INDIA'].apiKeyPreview})`
                      : 'STATUS: NOT CONNECTED (ENTER KEYS BELOW)'}
                  </span>
                </div>

                <div className="text-xs text-zinc-300 space-y-1.5 leading-relaxed">
                  <p className="text-zinc-400">
                    Algorithmic trading on Delta Exchange uses <strong>API Key & Secret authentication</strong> rather than your personal web login password. This protects your account security and allows restricting permissions strictly to order placement.
                  </p>
                  <div className="bg-black/40 rounded-lg p-3 border border-zinc-800 space-y-1.5 font-mono text-[11px]">
                    <div className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                      Quick 4-Step Delta Connection:
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">1.</span>
                      <span>Log in to your account at <a href="https://india.delta.exchange" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline font-semibold">india.delta.exchange</a></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">2.</span>
                      <span>Click your <strong>Profile Avatar</strong> (top right) → select <strong>API Keys</strong></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">3.</span>
                      <span>Click <strong>Create API Key</strong>, select permissions: <strong className="text-emerald-400">Read</strong> and <strong className="text-emerald-400">Trade / Orders</strong> (leave <em>Withdrawal</em> unchecked)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">4.</span>
                      <span>Copy and paste your <strong>API Key</strong> and <strong>API Secret</strong> into the fields below and click <strong>Save & Link API Credentials</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Form Inputs for Selected Exchange */}
            <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  <span>Configure {selectedExchange} API Credentials</span>
                </h3>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTestnetInput}
                      onChange={(e) => setIsTestnetInput(e.target.checked)}
                      className="rounded border-zinc-700 text-cyan-500 focus:ring-0"
                    />
                    <span>Use Testnet / Sandbox</span>
                  </label>
                </div>
              </div>

              {/* Execution Engine Mode Quick-Switch within Credentials */}
              <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-zinc-200 flex items-center gap-2">
                    <span>Order Execution Mode:</span>
                    <span className={`font-mono text-[11px] px-2 py-0.5 rounded font-bold ${
                      config?.executionMode === 'LIVE_EXCHANGE'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}>
                      {config?.executionMode === 'LIVE_EXCHANGE' ? 'LIVE EXCHANGE API' : 'PAPER / SIMULATED LIVE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {config?.executionMode === 'LIVE_EXCHANGE'
                      ? 'Live orders will be placed directly on your Delta Exchange India account.'
                      : 'Orders run in high-fidelity simulation with live Delta prices (0 risk to account capital).'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleExecutionMode('SIMULATED_LIVE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                      config?.executionMode === 'SIMULATED_LIVE'
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    Paper Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleExecutionMode('LIVE_EXCHANGE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      config?.executionMode === 'LIVE_EXCHANGE'
                        ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    Live Exchange API
                  </button>
                </div>
              </div>

              {selectedExchange === 'UNIVERSAL_WEBHOOK' ? (
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    Custom Webhook / External Execution URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://your-server.com/api/orders or Discord/Telegram webhook"
                    value={customWebhookInput}
                    onChange={(e) => setCustomWebhookInput(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none font-mono"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    When the AI triggers a Top 5 trade, it will POST a JSON payload with action, coin, limit price, stop-loss, and targets.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1 flex items-center justify-between">
                      <span>API Key</span>
                      {selectedExchange === 'DELTA_INDIA' && configuredExchanges?.['DELTA_INDIA']?.apiKeyPreview && (
                        <span className="text-[10px] text-emerald-400 font-mono">
                          Linked: {configuredExchanges['DELTA_INDIA'].apiKeyPreview}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder="Paste your exchange API key"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1 flex items-center justify-between">
                      <span>API Secret</span>
                      {selectedExchange === 'DELTA_INDIA' && configuredExchanges?.['DELTA_INDIA']?.hasSecret && (
                        <span className="text-[10px] text-emerald-400 font-mono">
                          ● Secret Saved in Vault
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      placeholder="Paste your Delta Exchange API Secret"
                      value={apiSecretInput}
                      onChange={(e) => setApiSecretInput(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>

                  {(selectedExchange === 'OKX' || selectedExchange === 'COINDCX') && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-mono text-zinc-400 mb-1">Passphrase</label>
                      <input
                        type="password"
                        placeholder="API Passphrase"
                        value={passphraseInput}
                        onChange={(e) => setPassphraseInput(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none font-mono"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Notice if user typed a key that doesn't match saved key */}
              {selectedExchange === 'DELTA_INDIA' &&
                apiKeyInput.trim().length > 4 &&
                configuredExchanges?.['DELTA_INDIA']?.apiKeyPreview &&
                !apiKeyInput.startsWith(configuredExchanges['DELTA_INDIA'].apiKeyPreview.split('.')[0]) && (
                  <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/50 text-amber-300 text-xs font-mono flex items-center justify-between gap-2">
                    <span>
                      ⚠️ <strong>Unsaved Changes:</strong> You typed key <code className="bg-black px-1 py-0.5 rounded text-white">{(apiKeyInput || '').slice(0, 6)}...</code>. Remember to paste your Secret and click <strong>"Save & Link API Credentials"</strong> below to activate it!
                    </span>
                  </div>
                )}

              {exchangeSaveMsg && (
                <div className="p-2.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono">
                  {exchangeSaveMsg}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSaveExchangeCreds}
                  className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 fill-black text-black" />
                  <span>Save & Link API Credentials</span>
                </button>

                <button
                  onClick={handleTestExchange}
                  disabled={isTestingExchange}
                  className="px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Activity className={`w-3.5 h-3.5 ${isTestingExchange ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>{isTestingExchange ? 'Testing Delta API...' : 'Test Connection'}</span>
                </button>
              </div>

              {exchangeTestStatus && (
                <div
                  className={`p-3.5 rounded-lg border text-xs font-mono mt-3 ${
                    exchangeTestStatus.status === 'CONNECTED'
                      ? 'bg-emerald-950/40 border-emerald-500/70 text-emerald-200'
                      : exchangeTestStatus.status === 'AUTH_FAILED' || exchangeTestStatus.status === 'DISCONNECTED'
                      ? 'bg-rose-950/40 border-rose-600/70 text-rose-200'
                      : 'bg-amber-950/40 border-amber-600/70 text-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-sm">
                    <span className="flex items-center gap-1.5">
                      {exchangeTestStatus.status === 'CONNECTED' && '🟢'}
                      {exchangeTestStatus.status === 'AUTH_FAILED' && '🔴'}
                      {exchangeTestStatus.status === 'DISCONNECTED' && '⚪'}
                      {exchangeTestStatus.status === 'SIMULATED' && '🟡'}
                      STATUS: {exchangeTestStatus.status}
                    </span>
                    <span className="text-xs opacity-80">Ping: {exchangeTestStatus.pingMs}ms</span>
                  </div>
                  <div className="mt-1.5 text-zinc-300 leading-relaxed font-sans">{exchangeTestStatus.message}</div>
                  {exchangeTestStatus.status === 'CONNECTED' && (
                    <div className="mt-2 pt-2 border-t border-emerald-800/40 text-[11px] text-emerald-400">
                      Delta Exchange India API keys are verified and ready for automated trading.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. CONNECT ANY APPLICATION (UNIVERSAL INTEGRATION HUB)       */}
      {/* ============================================================ */}
      {activeSubTab === 'integration' && (
        <div className="space-y-6">
          <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">
                  Universal Connectivity: Connect Any External Bot or Application
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Any external system (TradingView alerts, Python scripts, Hummingbot, Telegram bots, or custom backends) can connect to this AI algorithm to fetch Top 5 signals or trigger automated executions.
              </p>
            </div>

            {/* 1. Live Top 5 AI Signals API Endpoint */}
            <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                  1. Universal Top 5 AI Algorithm Signals Feed (GET)
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                  PUBLIC REST ENDPOINT
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Poll this endpoint from any language (Python, Node.js, Go) to get the Top 5 highest probability coins with pre-calculated entry, stop-loss, and target prices.
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={snippets?.signalsFeedUrl || 'http://localhost:3000/api/autotrade/signals/top5'}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
                <button
                  onClick={() =>
                    copyToClipboard(snippets?.signalsFeedUrl || '', 'signalsFeed')
                  }
                  className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono flex items-center gap-1 shrink-0"
                >
                  {copiedField === 'signalsFeed' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'signalsFeed' ? 'Copied' : 'Copy URL'}</span>
                </button>
              </div>
            </div>

            {/* 2. Inbound Webhook Execution Endpoint */}
            <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                  2. Inbound Webhook: Any App Can Trigger Auto-Trades (POST)
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  AUTHENTICATED WEBHOOK
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Send a POST request from TradingView alerts or your own script to automatically execute Buy/Sell orders with protective Stop-Loss.
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={snippets?.webhookUrl || 'http://localhost:3000/api/autotrade/webhook'}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
                <button
                  onClick={() => copyToClipboard(snippets?.webhookUrl || '', 'webhookUrl')}
                  className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono flex items-center gap-1 shrink-0"
                >
                  {copiedField === 'webhookUrl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'webhookUrl' ? 'Copied' : 'Copy URL'}</span>
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 pt-1">
                <span>Webhook Secret Key:</span>
                <strong className="text-white bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                  {snippets?.webhookSecretKey}
                </strong>
                <button
                  onClick={() => copyToClipboard(snippets?.webhookSecretKey || '', 'secretKey')}
                  className="text-cyan-400 hover:underline text-[11px]"
                >
                  {copiedField === 'secretKey' ? 'Copied!' : 'Copy Secret'}
                </button>
              </div>
            </div>

            {/* 3. Outbound Webhook Dispatcher */}
            <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                3. Outbound Webhook: Push AI Trades to Discord / Telegram / External Server
              </span>
              <p className="text-xs text-zinc-400">
                Enter your custom Webhook URL. The system will automatically broadcast an event every time an order is placed, filled, or when the Stop-Loss trails to break-even.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://discord.com/api/webhooks/... or https://your-domain.com/webhook"
                  value={outboundWebhookUrl}
                  onChange={(e) => setOutboundWebhookUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <button
                  onClick={handleSaveOutboundWebhook}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shrink-0"
                >
                  Save Webhook
                </button>
              </div>
            </div>

            {/* 4. Ready-to-Run Code Snippets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-sm font-semibold text-white">
                  Integration Code Templates for External Systems
                </span>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <button
                    onClick={() => setCodeSnippetTab('python')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      codeSnippetTab === 'python'
                        ? 'bg-cyan-600 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Python (CCXT Multi-Exchange)
                  </button>
                  <button
                    onClick={() => setCodeSnippetTab('tradingview')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      codeSnippetTab === 'tradingview'
                        ? 'bg-cyan-600 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    TradingView Alert
                  </button>
                  <button
                    onClick={() => setCodeSnippetTab('curl')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      codeSnippetTab === 'curl'
                        ? 'bg-cyan-600 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    cURL / REST
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-96 selection:bg-cyan-500/30">
                  {codeSnippetTab === 'python' && (snippets?.pythonCcxt || '# Loading Python CCXT snippet...')}
                  {codeSnippetTab === 'tradingview' && (snippets?.tradingViewWebhook || '# Loading TradingView snippet...')}
                  {codeSnippetTab === 'curl' && (snippets?.curlSnippet || '# Loading cURL snippet...')}
                </pre>
                <button
                  onClick={() => {
                    const content =
                      codeSnippetTab === 'python'
                        ? snippets?.pythonCcxt
                        : codeSnippetTab === 'tradingview'
                        ? snippets?.tradingViewWebhook
                        : snippets?.curlSnippet;
                    if (content) copyToClipboard(content, 'codeTab');
                  }}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 text-xs font-mono flex items-center gap-1 border border-zinc-700 backdrop-blur"
                >
                  {copiedField === 'codeTab' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'codeTab' ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. LIVE EXECUTION LOGS & RECENT HISTORY                     */}
      {/* ============================================================ */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <TerminalIcon className="w-5 h-5 text-cyan-400" />
              <span>Real-Time Auto-Trade Audit Logs</span>
            </h2>
            <button
              onClick={fetchStatus}
              className="text-xs text-zinc-400 hover:text-white font-mono flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-4 font-mono text-xs space-y-2 max-h-[500px] overflow-y-auto">
            {status?.recentLogs && status.recentLogs.length > 0 ? (
              status.recentLogs.map((log) => {
                let badgeColor = 'text-zinc-400 bg-zinc-900';
                if (log.type === 'ORDER') badgeColor = 'text-cyan-400 bg-cyan-950/60 border border-cyan-800/60';
                if (log.type === 'SL') badgeColor = 'text-rose-400 bg-rose-950/60 border border-rose-800/60';
                if (log.type === 'TP') badgeColor = 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60';
                if (log.type === 'TRAIL') badgeColor = 'text-amber-400 bg-amber-950/60 border border-amber-800/60';
                if (log.type === 'WEBHOOK') badgeColor = 'text-purple-400 bg-purple-950/60 border border-purple-800/60';

                return (
                  <div key={log.id} className="flex items-start gap-3 py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-500 shrink-0 text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${badgeColor}`}>
                      {log.type}
                    </span>
                    {log.coin && (
                      <strong className="text-white shrink-0 font-sans text-xs">[{log.coin}]</strong>
                    )}
                    <span className="text-zinc-300 flex-1">{log.message}</span>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-zinc-500">
                No execution logs recorded yet. Once the auto-trader runs its cycle, events will stream here.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
