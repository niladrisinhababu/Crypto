export type MarketMode = 'crypto' | 'commodities';

export type InstrumentType = 'perpetual_futures' | 'futures' | 'call_options' | 'put_options' | 'spot' | 'all';

export interface DeltaProduct {
  id: number;
  symbol: string;
  description: string;
  contract_type: string;
  contract_unit_currency?: string;
  contract_value?: string;
  strike_price?: string;
  settlement_time?: string;
  tick_size?: string;
  impact_size?: number;
  trading_status?: string;
  state?: string;
  underlying_asset?: {
    id: number;
    name: string;
    symbol: string;
  };
  quoting_asset?: {
    id: number;
    name: string;
    symbol: string;
  };
  settling_asset?: {
    id: number;
    name: string;
    symbol: string;
  };
  spot_index?: {
    symbol: string;
    description: string;
  };
}

export interface DeltaTicker {
  symbol: string;
  product_id?: number;
  contract_type: string;
  close?: number;
  mark_price?: string | number;
  spot_price?: string | number;
  high?: number;
  low?: number;
  open?: number;
  volume?: number;
  turnover_usd?: number;
  oi?: string | number;
  oi_contracts?: string | number;
  oi_value_usd?: string | number;
  oi_change_usd_6h?: string | number;
  funding_rate?: string | number;
  mark_basis?: string | number;
  ltp_change_24h?: string | number;
  mark_vol?: string | number;
  strike_price?: string | number;
  time?: string;
  timestamp?: number;
  quotes?: {
    best_bid?: string | number;
    best_ask?: string | number;
    bid_size?: string | number;
    ask_size?: string | number;
    bid_iv?: string | number;
    ask_iv?: string | number;
    mark_iv?: string | number;
  };
  greeks?: {
    delta?: string | number;
    gamma?: string | number;
    theta?: string | number;
    vega?: string | number;
    rho?: string | number;
    spot?: string | number;
  } | null;
}

export interface Candle {
  time: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  ema9: number | null;
  ema20: number | null;
  ema50: number | null;
  ema100: number | null;
  ema200: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi: number | null;
  macd: {
    macd: number | null;
    signal: number | null;
    histogram: number | null;
  };
  adx: {
    adx: number | null;
    plusDI: number | null;
    minusDI: number | null;
  };
  atr: number | null;
  bollingerBands: {
    upper: number | null;
    middle: number | null;
    lower: number | null;
    bandwidth: number | null;
  };
  stochRsi: {
    k: number | null;
    d: number | null;
  };
  vwap: number | null;
  volume: number;
  avgVolume: number | null;
  obv: number | null;
  roc: number | null;
  momentum: number | null;
  support: number | null;
  resistance: number | null;
  pivotPoints: {
    pivot: number | null;
    r1: number | null;
    r2: number | null;
    s1: number | null;
    s2: number | null;
  };
  previousHigh: number | null;
  previousLow: number | null;
  dailyHigh: number | null;
  dailyLow: number | null;
  weeklyHigh: number | null;
  weeklyLow: number | null;
}

export interface MarketStructure {
  structure: 'Bullish' | 'Bearish' | 'Sideways' | 'N/A';
  swingPoints: {
    type: 'HH' | 'HL' | 'LH' | 'LL';
    price: number;
    time: number;
  }[];
  breakoutDetected: boolean;
  breakdownDetected: boolean;
  volumeExpansion: boolean;
  volatilityExpansion: boolean;
  rsiDivergence: 'Bullish Divergence' | 'Bearish Divergence' | 'None';
}

export interface MultiTimeframeTrend {
  shortTerm: 'Bullish' | 'Bearish' | 'Neutral' | 'N/A'; // 5m / 15m
  intraday: 'Bullish' | 'Bearish' | 'Neutral' | 'N/A';   // 1h
  swing: 'Bullish' | 'Bearish' | 'Neutral' | 'N/A';      // 4h / 1d
  overall: 'Bullish' | 'Bearish' | 'Neutral' | 'N/A';
  confluenceScore: number; // 0-100
}

export type SignalType = 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL' | 'INVALID / WAIT';

export type SignalOutcome =
  | 'ACTIVE'
  | 'TRIGGERED'
  | 'WAITING_ENTRY'
  | 'TARGET_1_HIT'
  | 'TARGET_2_HIT'
  | 'TARGET_3_HIT'
  | 'STOP_LOSS_HIT'
  | 'BREAKEVEN_EXIT'
  | 'INVALIDATED'
  | 'CLOSED';

export interface DailyPerformanceRecord {
  date: string; // 'YYYY-MM-DD'
  displayDate: string; // 'Sep 18, 2026'
  dayOfWeek: string; // 'Friday'
  totalSignals: number;
  buySignals: number;
  sellSignals: number;
  target1Hits: number;
  target2Hits: number;
  target3Hits: number;
  totalTargetHits: number;
  stopLossHits: number;
  breakevenHits: number;
  activeCount: number;
  waitingEntryCount: number;
  winRate: number; // percentage of completed setups
  realizedPnLPercent: number; // sum of realized PnL %
  unrealizedPnLPercent?: number; // active positions floating PnL %
  totalPnLPercent?: number; // combined realized + active floating PnL %
  realizedR: number; // sum of realized R
  floatingR?: number; // active positions floating R
  totalR?: number; // combined realized + active floating R
  profitFactor: number;
  avgRiskReward: number;
  signals: CryptoSignal[];
}

export interface SignalPerformanceStats {
  totalSignals: number;
  totalBuySignals: number;
  totalSellSignals: number;
  target1HitCount: number;
  target2HitCount: number;
  target3HitCount: number;
  totalTargetHits: number;
  stopLossHitCount: number;
  breakevenCount?: number;
  waitingEntryCount?: number;
  activeCount: number;
  invalidatedCount: number;
  winRate: number; // percentage of completed trades that hit target
  profitFactor: number;
  totalRealizedR: number;
  totalFloatingR?: number;
  totalCombinedR?: number;
  averageRiskReward: number;
  netPnLPercent: number; // closed trades realized PnL %
  activeFloatingPnLPercent?: number; // live floating PnL % of positions currently in trade
  totalAuditPnLPercent?: number; // combined netPnLPercent + activeFloatingPnLPercent
  dailyAudit?: DailyPerformanceRecord[];
}

export interface CryptoSignal {
  id: string;
  coin: string;
  symbol: string;
  instrumentType: string;
  price: number;
  signal: SignalType;
  finalScore: number;
  scores: {
    trend: number;
    momentum: number;
    volume: number;
    openInterest: number;
    structure: number;
    volatility: number;
    multiTimeframe: number;
  };
  technicalScore: number;
  derivativesScore: number;
  fundamentalScore: number;
  volatilityScore: number;
  trend: string;
  marketStructure: string;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskPerUnit: number;
  potentialReward: number;
  riskReward: number;
  buildupType: 'Long Buildup' | 'Short Buildup' | 'Short Covering' | 'Long Unwinding' | 'N/A';
  confirmations: string[];
  invalidationRules: string[];
  candlestickPattern?: {
    name: string;
    type: 'BULLISH' | 'BEARISH';
    reliability: 'HIGH' | 'VERY_HIGH';
    description: string;
    patternTime?: string;
  };
  entryStrategy?: {
    type: 'PULLBACK_RETEST' | 'BREAKOUT_CONFIRMATION' | 'KEY_LEVEL_REJECTION';
    entryTriggerPrice: number;
    isTriggered: boolean;
    triggeredAt?: string;
    entryBufferPercent?: number;
  };
  breakevenMoved?: boolean;
  isEntryTriggered?: boolean;
  metrics: {
    rsi: number | null;
    adx: number | null;
    emaTrend: string;
    macdHist: number | null;
    atr: number | null;
    vwap: number | null;
    volume24h: number | null;
    oi: number | null;
    oiChange24h: number | null;
    fundingRate: number | null;
    iv: number | null;
  };
  optionGreeks?: {
    delta: number | null;
    gamma: number | null;
    theta: number | null;
    vega: number | null;
    iv: number | null;
  };
  fundamental?: {
    sector: string;
    useCase: string;
    blockchain: string;
    marketCap: string;
    tokenomics: string;
  };
  timestamp: string;
  dataSource: string;
  status: SignalOutcome;
  outcome?: SignalOutcome;
  targetHit?: boolean;
  targetHitLevel?: 1 | 2 | 3 | null;
  stopLossHit?: boolean;
  exitPrice?: number | null;
  realizedPnLPercent?: number | null;
  realizedR?: number | null;
  verifiedAt?: string | null;
  verifiedCandlesCount?: number | null;
  currentPrice?: number;
  unrealizedPnLPercent?: number | null;
  floatingR?: number | null;
  distanceToEntryPercent?: number | null;
  distanceToT1Percent?: number | null;
  distanceToSLPercent?: number | null;
  priceDirection?: 'UP' | 'DOWN' | 'EQUAL';
  lastPriceUpdate?: string;
  entryTime?: string;
  closeTime?: string;
}

export interface OptionsChainRow {
  strike: number;
  isATM: boolean;
  moneynessCall: 'ITM' | 'ATM' | 'OTM';
  moneynessPut: 'ITM' | 'ATM' | 'OTM';
  call: {
    symbol: string;
    ltp: number | null;
    bid: number | null;
    ask: number | null;
    volume: number | null;
    oi: number | null;
    oiChange: number | null;
    iv: number | null;
    delta: number | null;
    gamma: number | null;
    theta: number | null;
    vega: number | null;
    rho: number | null;
    intrinsicValue: number | null;
    extrinsicValue: number | null;
    breakeven: number | null;
  } | null;
  put: {
    symbol: string;
    ltp: number | null;
    bid: number | null;
    ask: number | null;
    volume: number | null;
    oi: number | null;
    oiChange: number | null;
    iv: number | null;
    delta: number | null;
    gamma: number | null;
    theta: number | null;
    vega: number | null;
    rho: number | null;
    intrinsicValue: number | null;
    extrinsicValue: number | null;
    breakeven: number | null;
  } | null;
}

export interface OptionsChainSummary {
  underlyingPrice: number;
  atmStrike: number;
  totalCallOI: number;
  totalPutOI: number;
  putCallRatio: number;
  maxPainStrike: number | null;
  highestCallOIStrike: number | null;
  highestPutOIStrike: number | null;
  callOIChangeTotal: number;
  putOIChangeTotal: number;
  totalCallVolume: number;
  totalPutVolume: number;
  supportFromOI: number | null;
  resistanceFromOI: number | null;
}

export interface VolatilityAnalytics {
  currentIV: number | null;
  ivRank: number | null; // 0-100 or null if not enough history
  ivPercentile: number | null;
  historicalVolatility10d: number | null;
  historicalVolatility30d: number | null;
  realizedVolatility: number | null;
  ivVsHvSpread: number | null;
  vega: number | null;
  vegaExposure: number | null;
  atmIV: number | null;
  otmCallIV: number | null;
  otmPutIV: number | null;
  volatilitySkew: { strike: number; iv: number; type: 'call' | 'put' }[];
  termStructure: { expiry: string; daysToExpiry: number; iv: number }[];
  regimes: {
    highIV: boolean;
    lowIV: boolean;
    ivRising: boolean;
    ivFalling: boolean;
    ivGreaterThanHV: boolean;
    ivLessThanHV: boolean;
    volatilityBreakout: boolean;
  };
  hasSufficientHistoricalData: boolean;
}

export interface FundamentalProfile {
  coinName: string;
  ticker: string;
  blockchain: string;
  network: string;
  sectorCategory: string;
  projectDescription: string;
  primaryUseCase: string;
  technology: string;
  consensusMechanism: string;
  totalSupply: string;
  maxSupply: string;
  circulatingSupply: string;
  circulatingSupplyNumber?: number;
  marketCap: string;
  fdv: string;
  tokenomics: string;
  utility: string;
  majorEcosystem: string;
  categoryTag: string; // DeFi / AI / L1 / L2 / Meme / Infrastructure
  majorExchanges: string[];
  website: string;
  whitepaper: string;
  officialSocials: {
    twitter?: string;
    telegram?: string;
    discord?: string;
    github?: string;
  };
  launchDate: string;
  developmentActivity: string;
  importantRisks: string[];
  tokenUnlockInfo: string;
  whatThisCoinDoes: string;
  sectorUseCaseDetails: string;
  keyFundamentalStrengths: string[];
  keyRisks: string[];
  source: string;
  lastUpdated: string;
}

export interface ApiHealthStatus {
  restApiStatus: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';
  restLatencyMs: number;
  websocketStatus: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
  websocketLastPingMs: number;
  lastMessageTimestamp: string;
  dataQualityScore: number;
  isStaleData: boolean;
  staleThresholdSeconds: number;
  totalProductsLoaded: number;
  totalTickersLoaded: number;
}

export interface AdminSettings {
  minSignalScore: number;
  minLiquidityScore: number;
  minVolumeUsd: number;
  minOpenInterest?: number;
  minOIContracts?: number;
  minRiskReward: number;
  riskPerTradePercent: number;
  atrMultiplierSL: number;
  atrMultiplierTarget1: number;
  atrMultiplierTarget2: number;
  accountCapitalUsd?: number;
  maxDailyLossUsd?: number;
  maxOpenPositions?: number;
  maxLeverage?: number;
  maxLeverageCap?: number;
  allowedInstruments?: string[];
  allowedInstrumentTypes?: string[];
  signalRefreshIntervalSec?: number;
  refreshIntervalSeconds?: number;
}

export interface MarketInstrument {
  id: number;
  symbol: string;
  name: string;
  coinName?: string;
  underlying: string;
  underlyingAsset?: string;
  instrumentType: string;
  contractType: string;
  expiry: string;
  strike: string;
  strikePrice?: string;
  quotingAsset: string;
  settlingAsset: string;
  tickSize: string;
  contractValue: string;
  tradingStatus: string;
  ltp: number | null;
  price?: number | null;
  markPrice?: number | null;
  indexPrice?: number | null;
  bid?: number | null;
  ask?: number | null;
  spread?: number | null;
  change24h: number | null;
  volume24h: number | null;
  turnoverUsd: number | null;
  openInterest: number | null;
  fundingRate: number | null;
  impliedVolatility?: number | null;
}

export interface FuturesItem {
  symbol: string;
  underlying?: string;
  description: string;
  contractType: string;
  expiry: string;
  lastPrice: number;
  ltp?: number;
  markPrice: number;
  spotPrice: number;
  indexPrice?: number;
  basis: number;
  premiumDiscountPct?: number;
  change24h: number;
  volume?: number;
  volume24h: number;
  turnover?: number;
  turnoverUsd: number;
  openInterest?: number;
  openInterestUsd: number;
  openInterestContracts: number;
  oiChange?: number;
  fundingRate: number | null;
  buildup?: string;
  buildupType: 'Long Buildup' | 'Short Buildup' | 'Short Covering' | 'Long Unwinding' | 'N/A';
  longShortRatio?: number | null;
  liquidation24h?: number | null;
  nextFunding?: string;
}

export interface OptionGreekSensitivity {
  symbol: string;
  underlyingPrice: number;
  strike: number;
  premium: number;
  contractType: string;
  description: string;
  timeToExpiryDays: number;
  impliedVolatility: number | null;
  greeks: {
    delta: number | null;
    gamma: number | null;
    theta: number | null;
    vega: number | null;
    rho: number | null;
  };
  sensitivityScenarios: {
    underlyingPlus1Pct: { shock?: string; dollarMove?: number; optionPriceChange: number; newTheoreticalPrice: number } | null;
    underlyingMinus1Pct: { shock?: string; dollarMove?: number; optionPriceChange: number; newTheoreticalPrice: number } | null;
    ivPlus1Pct: { shock?: string; optionPriceChange: number; newTheoreticalPrice: number } | null;
    ivMinus1Pct: { shock?: string; optionPriceChange: number; newTheoreticalPrice: number } | null;
    timeDecay1Day: { shock?: string; optionPriceChange: number; newTheoreticalPrice: number } | null;
    interestRatePlus1Pct: { shock?: string; optionPriceChange: number; newTheoreticalPrice: number } | null;
  };
}

export interface CoinFundamentalProfile {
  symbol: string;
  ticker?: string;
  coinName: string;
  blockchain: string;
  network?: string;
  sectorCategory: string;
  categoryTag?: string;
  whatItDoes: string;
  whatThisCoinDoes?: string;
  projectDescription?: string;
  whichSector: string;
  sectorUseCaseDetails?: string;
  primaryUseCase?: string;
  consensusMechanism: string;
  technology?: string;
  marketCap: string;
  liveMarketCapUsd?: number | null;
  liveMarketCapFormatted?: string;
  fdv: string;
  circulatingSupply: string;
  circulatingSupplyNumber?: number;
  maxSupply: string;
  totalSupply?: string;
  tokenomics: string;
  tokenUnlockSchedule: string;
  tokenUnlockInfo?: string;
  developmentActivity: string;
  keyStrengths: string[];
  keyFundamentalStrengths?: string[];
  pros: string[];
  keyRisks: string[];
  cons: string[];
  utility?: string;
  majorEcosystem?: string;
  majorExchanges?: string[];
  website?: string;
  whitepaper?: string;
  launchDate?: string;
  source?: string;
  lastUpdated?: string;
}

export interface MultiTimeframeTrends {
  tf15m: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  tf1h: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  tf4h: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confluenceScore: number;
}

export type SupportedExchange = 'DELTA_INDIA' | 'BINANCE' | 'BYBIT' | 'OKX' | 'COINDCX' | 'UNIVERSAL_WEBHOOK' | 'MCX_INDIA' | 'COMEX';

export interface ExchangeCredentials {
  exchange: SupportedExchange;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  isTestnet?: boolean;
  subaccount?: string;
  customWebhookUrl?: string;
}

export interface ExchangeConnectionStatus {
  exchange: SupportedExchange;
  exchangeName: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONFIGURED' | 'SIMULATED' | 'ERROR';
  pingMs: number;
  availableBalanceUsd: number;
  totalEquityUsd: number;
  currency: string;
  lastChecked: string;
  message: string;
  mode: 'LIVE' | 'TESTNET' | 'SIMULATED';
}

export interface AutoTraderConfig {
  enabled: boolean;
  executionMode: 'SIMULATED_LIVE' | 'LIVE_EXCHANGE';
  exchange: SupportedExchange;
  targetSelection: 'TOP_5_HIGH_PROBABILITY' | 'TOP_3' | 'ALL_QUALIFIED';
  riskPerTradePercent: number; // e.g. 1.5%
  accountCapitalUsd: number; // e.g. 10000
  maxAllocPerTradeUsd: number; // e.g. 1000
  maxOpenPositions: number; // default 5 for top 5 coins
  orderType: 'LIMIT_PULLBACK' | 'MARKET';
  autoStopLoss: boolean; // default true
  autoTakeProfit: boolean; // default true
  trailStopToBreakevenAtT1: boolean; // default true
  minScoreThreshold: number; // default 75
  outboundWebhookUrl: string; // optional webhook to broadcast trades to external apps
  webhookSecretKey: string; // for securing incoming webhooks
  scanIntervalSeconds: number; // e.g. 15s
}

export interface AutoTradeLog {
  id: string;
  timestamp: string;
  type: 'INFO' | 'ORDER' | 'SL' | 'TP' | 'TRAIL' | 'CANCEL' | 'ERROR' | 'WEBHOOK';
  coin: string;
  message: string;
}

export interface AutoTradeOrder {
  id: string;
  positionId: string;
  tradeId: string;
  signalId: string;
  coin: string;
  symbol: string;
  signal: 'BUY' | 'SELL';
  candlestickPattern?: string;
  finalScore: number;
  exchange: SupportedExchange;
  executionMode: 'SIMULATED_LIVE' | 'LIVE_EXCHANGE';
  status:
    | 'WAITING_ENTRY'
    | 'FILLED'
    | 'TARGET_1_HIT'
    | 'TARGET_2_HIT'
    | 'TARGET_3_HIT'
    | 'STOP_LOSS_HIT'
    | 'CANCELLED'
    | 'MANUALLY_CLOSED';
  entryPrice: number;
  currentPrice: number;
  stopLossPrice: number;
  originalStopLoss: number;
  isBreakevenTrailed: boolean;
  target1Price: number;
  target2Price: number;
  target3Price: number;
  quantity: number;
  positionSizeUsd: number;
  leverage: number;
  unrealizedPnLUsd: number;
  unrealizedPnLPercent: number;
  realizedPnLUsd: number;
  realizedPnLPercent: number;
  realizedR: number;
  entryTime: string;
  timeOfExecution: string;
  timeOfStopLoss?: string;
  timeOfTarget?: string;
  hitType?: 'STOP_LOSS' | 'TARGET_1' | 'TARGET_2' | 'TARGET_3' | 'MANUAL' | 'CANCELLED';
  exitPrice?: number;
  tradeDuration?: string;
  closeTime?: string;
  closeReason?: string;
  exchangeOrderId?: string;
  exchangeStopLossId?: string;
  exchangeTakeProfitId?: string;
  logs: AutoTradeLog[];
}

export interface AutoTraderStatus {
  enabled: boolean;
  executionMode: 'SIMULATED_LIVE' | 'LIVE_EXCHANGE';
  exchange: SupportedExchange;
  activePositionsCount: number;
  maxOpenPositions: number;
  top5Coins: {
    coin: string;
    symbol: string;
    signal: 'BUY' | 'SELL';
    score: number;
    candlestickPattern: string;
    entry: number;
    stopLoss: number;
    target1: number;
    target2: number;
    target3: number;
    riskRewardRatio: number;
    status: 'ARMED' | 'ORDER_PLACED' | 'POSITION_ACTIVE' | 'WAITING_TRIGGER';
    activeOrderId?: string;
  }[];
  activePositions: AutoTradeOrder[];
  recentClosedTrades: AutoTradeOrder[];
  recentLogs: AutoTradeLog[];
  stats: {
    totalTradesExecuted: number;
    winningTrades: number;
    losingTrades: number;
    stopLossHitsCount: number;
    targetHitsCount: number;
    breakevenCount: number;
    winRate: number;
    totalRealizedPnLUsd: number;
    totalRealizedR: number;
    profitFactor: number;
  };
  exchangeStatus: ExchangeConnectionStatus;
  lastScanTime: string;
  uptimeSeconds: number;
}

export interface CommoditySpec {
  id: string;
  name: string;
  symbol: string;
  category: 'Precious Metals' | 'Energy' | 'Base Metals';
  basePrice: number;
  currentPrice: number;
  open24h: number;
  high24h: number;
  low24h: number;
  change24h: number;
  volume: number;
  openInterest: number;
  oiChange: number;
  unit: string;
  comexContractSize: string;
  mcxContractSize: string;
  tickSize: number;
  tickValueUsd: number;
  tradingHours: string;
  exchange: string;
  description: string;
  displayUnit?: string;
  pricePerPound?: number;
  pricePerMetricTon?: number;
  mcxPriceInr?: number;
  mcxUnit?: string;
}

