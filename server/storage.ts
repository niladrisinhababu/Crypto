import fs from 'fs';
import path from 'path';
import {
  AdminSettings,
  CryptoSignal,
  AutoTraderConfig,
  AutoTradeOrder,
  AutoTradeLog,
  SupportedExchange,
  ExchangeCredentials,
} from '../src/types';
import { encryptCredential, decryptCredential } from './security';

export interface StorageData {
  settings: AdminSettings;
  encryptedCredentials: {
    apiKey: string;
    encryptedSecret: string;
    passphrase?: string;
  };
  exchangeCredentials?: Partial<
    Record<
      SupportedExchange,
      {
        apiKey: string;
        encryptedSecret: string;
        passphrase?: string;
        isTestnet?: boolean;
        subaccount?: string;
        customWebhookUrl?: string;
      }
    >
  >;
  signalHistory: CryptoSignal[];
  activeSignals: CryptoSignal[];
  userRiskConfig: {
    accountCapital: number;
    riskPerTradePercent: number;
    maxDailyLoss: number;
    maxOpenPositions: number;
    maxLeverage: number;
  };
  autoTraderConfig?: AutoTraderConfig;
  autoTradeOrders?: AutoTradeOrder[];
  autoTradeHistory?: AutoTradeOrder[];
  autoTradeLogs?: AutoTradeLog[];
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'vegaedge.json');

const DEFAULT_SETTINGS: AdminSettings = {
  minSignalScore: 75,
  minLiquidityScore: 70,
  minVolumeUsd: 10000,
  minOIContracts: 100,
  minRiskReward: 1.5,
  riskPerTradePercent: 1.5,
  atrMultiplierSL: 1.5,
  atrMultiplierTarget1: 2.0,
  atrMultiplierTarget2: 3.5,
  accountCapitalUsd: 10000,
  maxDailyLossUsd: 500,
  maxOpenPositions: 3,
  maxLeverage: 10,
  allowedInstruments: ['perpetual_futures', 'futures', 'call_options', 'put_options'],
  signalRefreshIntervalSec: 15,
};

const DEFAULT_AUTOTRADER_CONFIG: AutoTraderConfig = {
  enabled: true,
  executionMode: 'SIMULATED_LIVE',
  exchange: 'DELTA_INDIA',
  targetSelection: 'TOP_5_HIGH_PROBABILITY',
  riskPerTradePercent: 1.5,
  accountCapitalUsd: 10000,
  maxAllocPerTradeUsd: 1000,
  maxOpenPositions: 5,
  orderType: 'LIMIT_PULLBACK',
  autoStopLoss: true,
  autoTakeProfit: true,
  trailStopToBreakevenAtT1: true,
  minScoreThreshold: 75,
  outboundWebhookUrl: '',
  webhookSecretKey: 'vega_wh_sec_' + Math.random().toString(36).substring(2, 10),
  scanIntervalSeconds: 15,
};

class Storage {
  private data: StorageData;

  constructor() {
    this.data = this.load();
  }

  private load(): StorageData {
    const envApiKey = process.env.API_KEY || process.env.DELTA_API_KEY || '';
    const envSecret = process.env.API_SECRET || process.env.DELTA_API_SECRET || '';

    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);

        const loadedCreds = parsed.encryptedCredentials || { apiKey: '', encryptedSecret: '' };
        if (envApiKey) loadedCreds.apiKey = envApiKey;
        if (envSecret) loadedCreds.encryptedSecret = encryptCredential(envSecret);

        return {
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          encryptedCredentials: loadedCreds,
          exchangeCredentials: parsed.exchangeCredentials || {},
          signalHistory: parsed.signalHistory || [],
          activeSignals: parsed.activeSignals || [],
          userRiskConfig: parsed.userRiskConfig || {
            accountCapital: 10000,
            riskPerTradePercent: 1.5,
            maxDailyLoss: 500,
            maxOpenPositions: 3,
            maxLeverage: 10,
          },
          autoTraderConfig: { ...DEFAULT_AUTOTRADER_CONFIG, ...(parsed.autoTraderConfig || {}) },
          autoTradeOrders: parsed.autoTradeOrders || [],
          autoTradeHistory: parsed.autoTradeHistory || [],
          autoTradeLogs: parsed.autoTradeLogs || [],
        };
      }
    } catch (e) {
      console.warn('Could not read existing storage file, using defaults', e);
    }

    return {
      settings: DEFAULT_SETTINGS,
      encryptedCredentials: {
        apiKey: envApiKey,
        encryptedSecret: envSecret ? encryptCredential(envSecret) : '',
        passphrase: '',
      },
      exchangeCredentials: {},
      signalHistory: [],
      activeSignals: [],
      userRiskConfig: {
        accountCapital: 10000,
        riskPerTradePercent: 1.5,
        maxDailyLoss: 500,
        maxOpenPositions: 3,
        maxLeverage: 10,
      },
      autoTraderConfig: DEFAULT_AUTOTRADER_CONFIG,
      autoTradeOrders: [],
      autoTradeHistory: [],
      autoTradeLogs: [],
    };
  }

  public save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Error persisting VegaEdge storage:', e);
    }
  }

  public getSettings(): AdminSettings {
    return this.data.settings;
  }

  public updateSettings(partial: Partial<AdminSettings>): AdminSettings {
    this.data.settings = { ...this.data.settings, ...partial };
    this.save();
    return this.data.settings;
  }

  public getCredentials(): {
    apiKey: string;
    secret: string;
    passphrase?: string;
    hasSecret: boolean;
    isFromEnv: boolean;
    source: 'ENV' | 'VAULT' | 'NONE';
  } {
    // 1. Check user-configured encrypted server vault first (User settings override defaults)
    const rawSecret = decryptCredential(this.data.encryptedCredentials?.encryptedSecret);
    const vaultApiKey = (this.data.encryptedCredentials?.apiKey || '').trim();
    const hasVaultSecret = Boolean(rawSecret && rawSecret.length > 0);

    if (vaultApiKey && hasVaultSecret) {
      return {
        apiKey: vaultApiKey,
        secret: rawSecret,
        passphrase: '',
        hasSecret: true,
        isFromEnv: false,
        source: 'VAULT',
      };
    }

    // 2. Check environment variables (DELTA_API_KEY & DELTA_API_SECRET or API_KEY & API_SECRET)
    const envApiKey = (process.env.DELTA_API_KEY || process.env.API_KEY || '').trim();
    const envSecret = (process.env.DELTA_API_SECRET || process.env.API_SECRET || '').trim();

    if (envApiKey && envSecret) {
      return {
        apiKey: vaultApiKey || envApiKey,
        secret: hasVaultSecret ? rawSecret : envSecret,
        passphrase: '',
        hasSecret: true,
        isFromEnv: !hasVaultSecret,
        source: hasVaultSecret ? 'VAULT' : 'ENV',
      };
    }

    return {
      apiKey: vaultApiKey || envApiKey || '',
      secret: rawSecret || envSecret || '',
      passphrase: '',
      hasSecret: hasVaultSecret || Boolean(envSecret),
      isFromEnv: Boolean(envApiKey && envSecret && !vaultApiKey),
      source: hasVaultSecret ? 'VAULT' : envApiKey ? 'ENV' : 'NONE',
    };
  }

  public saveCredentials(apiKey: string, secret: string, passphrase?: string): void {
    this.data.encryptedCredentials = {
      apiKey: apiKey.trim(),
      encryptedSecret: secret ? encryptCredential(secret.trim()) : this.data.encryptedCredentials.encryptedSecret,
      passphrase: '',
    };
    this.save();
  }

  private isValidRealMarketSignal(s: any): boolean {
    if (!s || typeof s !== 'object') return false;
    if (!s.symbol || !s.coin) return false;
    if (typeof s.entry !== 'number' || s.entry <= 0 || isNaN(s.entry)) return false;
    if (typeof s.stopLoss !== 'number' || s.stopLoss <= 0 || isNaN(s.stopLoss)) return false;
    if (typeof s.target1 !== 'number' || s.target1 <= 0 || isNaN(s.target1)) return false;
    if (s.dataSource && typeof s.dataSource === 'string') {
      const src = s.dataSource.toLowerCase();
      if (
        src.includes('mock') ||
        src.includes('fake') ||
        src.includes('dummy') ||
        src.includes('sample') ||
        src.includes('random') ||
        src.includes('synthetic')
      ) {
        return false;
      }
    }
    return true;
  }

  public getSignalHistory(): CryptoSignal[] {
    // Strict Mock Data Blocker Gate: Only return authentic Delta Exchange India signals
    return this.data.signalHistory.filter((s) => this.isValidRealMarketSignal(s));
  }

  public setSignalHistory(signals: CryptoSignal[]): void {
    // Strictly filter out any mock, fake, dummy, sample, or corrupted signals before saving
    const validRealSignals = signals.filter((s) => this.isValidRealMarketSignal(s));
    this.data.signalHistory = validRealSignals.slice(0, 300);
    this.save();
  }

  public addSignal(signal: CryptoSignal): void {
    // Strict Mock Data Blocker Gate: Reject non-authentic data
    if (!this.isValidRealMarketSignal(signal)) {
      return;
    }

    // Check if signal already exists by exact ID
    const idx = this.data.signalHistory.findIndex((s) => s.id === signal.id);
    if (idx >= 0) {
      this.data.signalHistory[idx] = signal;
      this.save();
      return;
    }

    // Prevent duplicate signals for the same coin within 2 hours if price hasn't shifted > 1.5%
    const now = Date.now();
    const existingRecent = this.data.signalHistory.find((s) => {
      if (s.coin !== signal.coin || s.signal !== signal.signal) return false;
      const sigTime = new Date(s.timestamp).getTime();
      const ageHours = (now - sigTime) / (1000 * 3600);
      const priceDiffPercent = Math.abs(s.entry - signal.entry) / s.entry;
      return ageHours < 2 && priceDiffPercent < 0.015;
    });

    if (existingRecent) {
      // Update recent record with latest live price, metrics, and performance
      existingRecent.price = signal.price;
      existingRecent.currentPrice = signal.currentPrice ?? signal.price;
      existingRecent.lastPriceUpdate = new Date().toISOString();
      if (signal.status) existingRecent.status = signal.status;
      if (signal.outcome) existingRecent.outcome = signal.outcome;
      if (signal.targetHit !== undefined) existingRecent.targetHit = signal.targetHit;
      if (signal.targetHitLevel !== undefined) existingRecent.targetHitLevel = signal.targetHitLevel;
      if (signal.stopLossHit !== undefined) existingRecent.stopLossHit = signal.stopLossHit;
      if (signal.exitPrice !== undefined && signal.exitPrice !== null) existingRecent.exitPrice = signal.exitPrice;
      if (signal.realizedPnLPercent !== undefined && signal.realizedPnLPercent !== null) existingRecent.realizedPnLPercent = signal.realizedPnLPercent;
      if (signal.realizedR !== undefined && signal.realizedR !== null) existingRecent.realizedR = signal.realizedR;
      if (signal.unrealizedPnLPercent !== undefined) existingRecent.unrealizedPnLPercent = signal.unrealizedPnLPercent;
      if (signal.floatingR !== undefined) existingRecent.floatingR = signal.floatingR;
      if (signal.distanceToEntryPercent !== undefined) existingRecent.distanceToEntryPercent = signal.distanceToEntryPercent;
      if (signal.distanceToT1Percent !== undefined) existingRecent.distanceToT1Percent = signal.distanceToT1Percent;
      if (signal.distanceToSLPercent !== undefined) existingRecent.distanceToSLPercent = signal.distanceToSLPercent;
      if (signal.isEntryTriggered) existingRecent.isEntryTriggered = true;
      if (signal.entryTime) existingRecent.entryTime = signal.entryTime;
      if (signal.closeTime) existingRecent.closeTime = signal.closeTime;
      if (signal.metrics) Object.assign(existingRecent.metrics, signal.metrics);
      this.save();
      return;
    }

    this.data.signalHistory.unshift(signal);
    if (this.data.signalHistory.length > 300) {
      this.data.signalHistory.pop();
    }
    this.save();
  }

  public getActiveSignals(): CryptoSignal[] {
    return (this.data.activeSignals || []).filter((s) => this.isValidRealMarketSignal(s));
  }

  public setActiveSignals(signals: CryptoSignal[]): void {
    const valid = (signals || []).filter((s) => this.isValidRealMarketSignal(s));
    this.data.activeSignals = valid;
    this.save();
  }

  public getUserRiskConfig() {
    return this.data.userRiskConfig;
  }

  public updateUserRiskConfig(config: Partial<StorageData['userRiskConfig']>) {
    this.data.userRiskConfig = { ...this.data.userRiskConfig, ...config };
    this.save();
    return this.data.userRiskConfig;
  }

  // --- AutoTrader Specific Storage Methods ---

  public getAutoTraderConfig(): AutoTraderConfig {
    if (!this.data.autoTraderConfig) {
      this.data.autoTraderConfig = { ...DEFAULT_AUTOTRADER_CONFIG };
    }
    return this.data.autoTraderConfig;
  }

  public updateAutoTraderConfig(partial: Partial<AutoTraderConfig>): AutoTraderConfig {
    this.data.autoTraderConfig = {
      ...this.getAutoTraderConfig(),
      ...partial,
    };
    this.save();
    return this.data.autoTraderConfig;
  }

  public getAutoTradeOrders(): AutoTradeOrder[] {
    return this.data.autoTradeOrders || [];
  }

  public saveAutoTradeOrders(orders: AutoTradeOrder[]): void {
    this.data.autoTradeOrders = orders;
    this.save();
  }

  public getAutoTradeHistory(): AutoTradeOrder[] {
    return this.data.autoTradeHistory || [];
  }

  public addAutoTradeHistory(order: AutoTradeOrder): void {
    if (!this.data.autoTradeHistory) {
      this.data.autoTradeHistory = [];
    }
    const idx = this.data.autoTradeHistory.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      this.data.autoTradeHistory[idx] = order;
    } else {
      this.data.autoTradeHistory.unshift(order);
      if (this.data.autoTradeHistory.length > 200) {
        this.data.autoTradeHistory.pop();
      }
    }
    this.save();
  }

  public getAutoTradeLogs(): AutoTradeLog[] {
    return this.data.autoTradeLogs || [];
  }

  public addAutoTradeLog(log: Omit<AutoTradeLog, 'id' | 'timestamp'>): AutoTradeLog {
    if (!this.data.autoTradeLogs) {
      this.data.autoTradeLogs = [];
    }
    const fullLog: AutoTradeLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.data.autoTradeLogs.unshift(fullLog);
    if (this.data.autoTradeLogs.length > 150) {
      this.data.autoTradeLogs.pop();
    }
    this.save();
    return fullLog;
  }

  public clearAutoTradeLogs(): void {
    this.data.autoTradeLogs = [];
    this.save();
  }

  public getExchangeCredentials(exchange: SupportedExchange): {
    apiKey: string;
    secret: string;
    passphrase?: string;
    isTestnet?: boolean;
    subaccount?: string;
    customWebhookUrl?: string;
    hasSecret: boolean;
  } {
    if (exchange === 'DELTA_INDIA') {
      const creds = this.getCredentials();
      return {
        apiKey: creds.apiKey,
        secret: creds.secret,
        hasSecret: creds.hasSecret,
      };
    }

    const exCreds = this.data.exchangeCredentials?.[exchange];
    if (!exCreds) {
      return { apiKey: '', secret: '', hasSecret: false, isTestnet: false };
    }

    const rawSecret = exCreds.encryptedSecret ? decryptCredential(exCreds.encryptedSecret) : '';
    return {
      apiKey: exCreds.apiKey || '',
      secret: rawSecret,
      passphrase: exCreds.passphrase || '',
      isTestnet: Boolean(exCreds.isTestnet),
      subaccount: exCreds.subaccount || '',
      customWebhookUrl: exCreds.customWebhookUrl || '',
      hasSecret: Boolean(rawSecret && rawSecret.length > 0),
    };
  }

  public saveExchangeCredentials(
    exchange: SupportedExchange,
    creds: {
      apiKey: string;
      secret: string;
      passphrase?: string;
      isTestnet?: boolean;
      subaccount?: string;
      customWebhookUrl?: string;
    }
  ): void {
    if (exchange === 'DELTA_INDIA') {
      this.saveCredentials(creds.apiKey, creds.secret, creds.passphrase);
      return;
    }

    if (!this.data.exchangeCredentials) {
      this.data.exchangeCredentials = {};
    }

    this.data.exchangeCredentials[exchange] = {
      apiKey: creds.apiKey.trim(),
      encryptedSecret: creds.secret ? encryptCredential(creds.secret.trim()) : (this.data.exchangeCredentials[exchange]?.encryptedSecret || ''),
      passphrase: creds.passphrase ? creds.passphrase.trim() : '',
      isTestnet: creds.isTestnet,
      subaccount: creds.subaccount ? creds.subaccount.trim() : '',
      customWebhookUrl: creds.customWebhookUrl ? creds.customWebhookUrl.trim() : '',
    };
    this.save();
  }
}

export const storage = new Storage();
