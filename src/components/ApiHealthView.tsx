import React from 'react';
import { ApiHealthStatus } from '../types';
import { Activity, Radio, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, Server, Database } from 'lucide-react';

interface Props {
  health: ApiHealthStatus | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export const ApiHealthView: React.FC<Props> = ({ health, onRefresh, isLoading }) => {
  if (!health) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-12 text-center text-zinc-400 font-mono">
        Connecting to Delta Exchange India Telemetry Engine...
      </div>
    );
  }

  const isWsConnected = health.websocketStatus === 'CONNECTED';
  const isRestOperational = health.restApiStatus === 'OPERATIONAL';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              SYSTEM TELEMETRY & DATA HEALTH
            </span>
            <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono">
              OFFICIAL DELTA EXCHANGE INDIA API
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            API Health, Stale-Data Detection & Failover Monitor
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitors REST API endpoints, real-time public WebSocket feed, latency thresholds, and automated failover polling.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-mono font-bold text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          Run Diagnostics
        </button>
      </div>

      {/* Stale Data Alert if triggered */}
      {health.isStaleData && (
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 flex items-center gap-3 text-rose-300 text-xs font-mono">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <div className="font-bold text-sm text-white">Stale-Data Warning Triggered</div>
            <div>
              No WebSocket messages received for over {health.staleThresholdSeconds} seconds. REST polling fallback is active to ensure data continuity.
            </div>
          </div>
        </div>
      )}

      {/* 4 Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        {/* REST Status */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-bold text-zinc-500">REST API STATUS</span>
            <Server className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRestOperational ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
            <span className="text-lg font-bold text-white">{health.restApiStatus}</span>
          </div>
          <div className="text-zinc-400 text-[11px] pt-1 border-t border-zinc-900">
            Endpoint: <span className="text-zinc-200">api.india.delta.exchange/v2</span>
          </div>
        </div>

        {/* REST Latency */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-bold text-zinc-500">REST ROUNDTRIP LATENCY</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {health.restLatencyMs} <span className="text-sm font-normal text-zinc-400">ms</span>
          </div>
          <div className="text-zinc-400 text-[11px] pt-1 border-t border-zinc-900">
            Rating:{' '}
            <strong className="text-emerald-300">
              {health.restLatencyMs < 150 ? 'Excellent (<150ms)' : 'Operational'}
            </strong>
          </div>
        </div>

        {/* WebSocket Status */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-bold text-zinc-500">WEBSOCKET FEED</span>
            <Radio className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isWsConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            <span className="text-lg font-bold text-white">{health.websocketStatus}</span>
          </div>
          <div className="text-zinc-400 text-[11px] pt-1 border-t border-zinc-900">
            Heartbeat: <span className="text-cyan-300">Every 25s Ping</span>
          </div>
        </div>

        {/* Data Quality Score */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-bold text-zinc-500">DATA INTEGRITY SCORE</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {health.dataQualityScore} <span className="text-sm font-normal text-zinc-400">/ 100</span>
          </div>
          <div className="text-zinc-400 text-[11px] pt-1 border-t border-zinc-900">
            Zero synthetic data tolerated
          </div>
        </div>
      </div>

      {/* Infrastructure Telemetry & Failover Details */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4 font-mono text-xs">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Feed Specifications & Reconnection Protocols
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900/40 p-4 rounded-lg border border-zinc-800 space-y-2">
            <div className="text-zinc-400 font-bold uppercase text-[11px] text-cyan-400">
              Live Feed Metrics
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Total Tradable Products:</span>
              <span className="font-bold text-white">{health.totalProductsLoaded}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Active Ticker Subscriptions:</span>
              <span className="font-bold text-white">{health.totalTickersLoaded}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Last Stream Message:</span>
              <span className="text-zinc-300">{new Date(health.lastMessageTimestamp).toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="bg-zinc-900/40 p-4 rounded-lg border border-zinc-800 space-y-2">
            <div className="text-zinc-400 font-bold uppercase text-[11px] text-purple-400">
              Resilience & Failover Protocols
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">WebSocket Timeout Protection:</span>
              <span className="font-bold text-emerald-400">Active (Auto 25s ping)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Reconnection Backoff:</span>
              <span className="font-bold text-white">Exponential (2s to 30s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">REST Fallback Polling:</span>
              <span className="font-bold text-cyan-300">Continuous 10s sync</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
