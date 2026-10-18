import React, { useState, useEffect } from 'react';
import { AdminSettings } from '../types';
import { Sliders, ShieldCheck, Lock, Key, Save, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  onSettingsUpdated?: () => void;
}

export const SettingsView: React.FC<Props> = ({ onSettingsUpdated }) => {
  const [settings, setSettings] = useState<AdminSettings>({
    minSignalScore: 70,
    minLiquidityScore: 65,
    minVolumeUsd: 100000,
    minOpenInterest: 500,
    minRiskReward: 1.5,
    maxLeverageCap: 20,
    riskPerTradePercent: 1.5,
    atrMultiplierSL: 1.5,
    atrMultiplierTarget1: 1.5,
    atrMultiplierTarget2: 2.5,
    refreshIntervalSeconds: 10,
    allowedInstrumentTypes: ['perpetual_futures', 'futures', 'call_options', 'put_options'],
  });

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [apiPassphrase, setApiPassphrase] = useState('');
  const [isCredsConfigured, setIsCredsConfigured] = useState(false);
  const [apiKeyPreview, setApiKeyPreview] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          if (json.data.settings) setSettings(json.data.settings);
          setIsCredsConfigured(json.data.credentialsConfigured);
          setApiKeyPreview(json.data.apiKeyPreview || '');
        }
      })
      .catch(console.error);
  }, []);

  const handleVerifyCredentials = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const res = await fetch('/api/credentials/verify');
      const json = await res.json();
      setVerificationResult({
        valid: json.valid,
        message: json.message || (json.valid ? 'Credentials validated successfully!' : 'Verification failed.'),
      });
    } catch (err: any) {
      setVerificationResult({
        valid: false,
        message: err.message || 'Error communicating with verification endpoint.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        setSaveStatus('Quantitative thresholds updated successfully.');
        if (onSettingsUpdated) onSettingsUpdated();
      }
    } catch (err) {
      setSaveStatus('Failed to update settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!apiKey) return;
    setIsLoading(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          secret: apiSecret,
          passphrase: apiPassphrase,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsCredsConfigured(true);
        setApiKeyPreview(`${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`);
        setApiKey('');
        setApiSecret('');
        setApiPassphrase('');
        setSaveStatus('API Credentials encrypted with AES-256-GCM and stored securely on server.');
      }
    } catch (err) {
      setSaveStatus('Failed to encrypt credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              TERMINAL CONFIGURATION
            </span>
            <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono">
              SECURITY & THRESHOLDS
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            Engine Calibration & Server-Side Credential Vault
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure signal scoring strictness, stop-loss ATR factors, and manage encrypted Delta Exchange India read-only keys.
          </p>
        </div>

        {saveStatus && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-emerald-300 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveStatus}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quantitative Thresholds */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4 font-mono">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <div className="text-white font-bold text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Scanner & Signal Quality Gates
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded text-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save Gates
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Minimum Signal Score */}
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Minimum Signal Score (Best Coins Gate)</span>
                <span className="text-cyan-400 font-bold">{settings.minSignalScore} / 100</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                value={settings.minSignalScore}
                onChange={(e) =>
                  setSettings({ ...settings, minSignalScore: Number(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Minimum Liquidity Score */}
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Minimum Liquidity Score (%)</span>
                <span className="text-white font-bold">{settings.minLiquidityScore}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="85"
                step="5"
                value={settings.minLiquidityScore}
                onChange={(e) =>
                  setSettings({ ...settings, minLiquidityScore: Number(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Minimum Risk:Reward */}
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Minimum Risk / Reward Ratio (R:R)</span>
                <span className="text-amber-400 font-bold">1 : {settings.minRiskReward}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.25"
                value={settings.minRiskReward}
                onChange={(e) =>
                  setSettings({ ...settings, minRiskReward: Number(e.target.value) })
                }
                className="w-full accent-amber-400"
              />
            </div>

            {/* ATR Multipliers */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-zinc-500 block mb-1">Stop Loss ATR Factor</label>
                <input
                  type="number"
                  step="0.25"
                  value={settings.atrMultiplierSL}
                  onChange={(e) =>
                    setSettings({ ...settings, atrMultiplierSL: Number(e.target.value) })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded px-2.5 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="text-zinc-500 block mb-1">Target 1 ATR Factor</label>
                <input
                  type="number"
                  step="0.25"
                  value={settings.atrMultiplierTarget1}
                  onChange={(e) =>
                    setSettings({ ...settings, atrMultiplierTarget1: Number(e.target.value) })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded px-2.5 py-1.5 font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Server-Side Encrypted Credentials Vault */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4 font-mono">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <div className="text-white font-bold text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              Delta Exchange India API Security Vault
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isCredsConfigured
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {isCredsConfigured ? 'VAULT ACTIVE' : 'NO KEY SET'}
            </span>
          </div>

          <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800 text-xs font-sans text-zinc-300 leading-relaxed">
            <strong className="text-white font-mono">CRITICAL SECURITY RULE:</strong> API credentials are encrypted server-side using AES-256-GCM. The API Secret is never exposed to client-side code. Use READ-ONLY API permissions.
          </div>

          {isCredsConfigured && apiKeyPreview && (
            <div className="flex items-center justify-between p-2.5 bg-zinc-900/40 rounded border border-zinc-800 text-xs">
              <span className="text-zinc-400">Current Key:</span>
              <span className="text-cyan-300 font-bold">{apiKeyPreview}</span>
            </div>
          )}

          {/* Test / Verify API Connection */}
          <div className="pt-1">
            <button
              onClick={handleVerifyCredentials}
              disabled={isVerifying || !isCredsConfigured}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-cyan-500/40 font-bold rounded text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Key className="w-3.5 h-3.5" />
              {isVerifying ? 'Verifying Delta India API...' : 'Test Delta API Authenticated Signature'}
            </button>
          </div>

          {verificationResult && (
            <div
              className={`p-3 rounded-lg border text-xs font-mono flex items-start gap-2 ${
                verificationResult.valid
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
              }`}
            >
              {verificationResult.valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold">{verificationResult.valid ? 'AUTHENTICATED:' : 'VALIDATION NOTICE:'} </span>
                <span>{verificationResult.message}</span>
              </div>
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-zinc-400 block mb-1">Delta India API Key</label>
              <input
                type="text"
                placeholder="Enter Delta API Key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Delta India API Secret</label>
              <input
                type="password"
                placeholder="Enter Delta API Secret..."
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">API Passphrase (Optional)</label>
              <input
                type="password"
                placeholder="Optional Passphrase..."
                value={apiPassphrase}
                onChange={(e) => setApiPassphrase(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <button
              onClick={handleSaveCredentials}
              disabled={isLoading || !apiKey}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              Encrypt & Store Credentials on Server
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
