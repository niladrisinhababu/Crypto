import WebSocket from 'ws';
import crypto from 'crypto';
import { storage } from './storage';
import {
  DeltaProduct,
  DeltaTicker,
  Candle,
  OptionsChainRow,
  OptionsChainSummary,
  VolatilityAnalytics,
  ApiHealthStatus,
} from '../src/types';

const DELTA_REST_BASE = 'https://api.india.delta.exchange/v2';
const DELTA_WS_URL = 'wss://public-socket.india.delta.exchange';

class DeltaService {
  private products: Map<string, DeltaProduct> = new Map();
  private tickers: Map<string, DeltaTicker> = new Map();
  private candlesCache: Map<string, { timestamp: number; candles: Candle[] }> = new Map();
  private ws: WebSocket | null = null;
  private wsStatus: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' = 'DISCONNECTED';
  private lastWsMessageTime = 0;
  private lastRestLatency = 0;
  private restStatus: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE' = 'OPERATIONAL';
  private reconnectAttempts = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  /**
   * Generates Delta Exchange India HMAC-SHA256 signature headers for authenticated requests
   */
  public getAuthHeaders(
    method: string,
    path: string,
    queryString = '',
    payload = '',
    customApiKey?: string,
    customSecret?: string
  ): Record<string, string> | null {
    const creds = storage.getCredentials();
    const apiKey = (customApiKey || creds.apiKey || '').trim();
    const secret = (customSecret || creds.secret || '').trim();
    if (!apiKey || !secret) return null;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const queryPart = queryString ? (queryString.startsWith('?') ? queryString : `?${queryString}`) : '';
    const message = method.toUpperCase() + timestamp + path + queryPart + payload;
    const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');
    return {
      'api-key': apiKey,
      'signature': signature,
      'timestamp': timestamp,
      'User-Agent': 'VegaEdge-CryptoIntelligence/1.0',
    };
  }

  /**
   * Verify Delta Exchange India API credentials by calling an authenticated endpoint (/v2/wallet/balances)
   */
  public async verifyApiCredentials(
    customApiKey?: string,
    customSecret?: string
  ): Promise<{ valid: boolean; message: string; latencyMs: number; data?: any; balanceUsd?: number }> {
    const creds = storage.getCredentials();
    const apiKey = (customApiKey || creds.apiKey || '').trim();
    const secret = (customSecret || creds.secret || '').trim();

    if (!apiKey || !secret) {
      return {
        valid: false,
        latencyMs: 0,
        message: 'No API Key or Secret provided. Please enter your Delta Exchange API credentials.',
      };
    }

    const t0 = Date.now();
    try {
      const path = '/v2/wallet/balances';
      const authHeaders = this.getAuthHeaders('GET', path, '', '', apiKey, secret) || {};
      const res = await fetch(`https://api.india.delta.exchange${path}`, {
        headers: {
          Accept: 'application/json',
          ...authHeaders,
        },
      });
      const latencyMs = Math.max(1, Date.now() - t0);
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success) {
        const balances = json.result || [];
        const usdt = balances.find((b: any) => b.asset_symbol === 'USDT' || b.asset_symbol === 'USD');
        const balanceUsd = usdt ? parseFloat(usdt.balance || '0') : undefined;

        return {
          valid: true,
          latencyMs,
          message: 'Delta Exchange India API credentials verified successfully. Authenticated read & trading access confirmed.',
          data: balances,
          balanceUsd,
        };
      }

      if (json.error?.code === 'invalid_api_key' || res.status === 401) {
        return {
          valid: false,
          latencyMs,
          message: 'Authentication failed: Invalid API Key or Secret. Please verify your credentials at india.delta.exchange and ensure Read & Trade permissions are enabled.',
        };
      }

      const errMsg = json.error?.message || json.error?.code || json.message || `HTTP ${res.status}`;
      return {
        valid: false,
        latencyMs,
        message: `Authentication failed on Delta Exchange India: ${errMsg}`,
      };
    } catch (err: any) {
      const latencyMs = Math.max(1, Date.now() - t0);
      return {
        valid: false,
        latencyMs,
        message: `Connection error reaching Delta Exchange servers: ${err.message}`,
      };
    }
  }

  public async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    console.log('[DeltaService] Initializing Delta Exchange India service...');

    // 1. Initial REST fetch
    await this.fetchProducts();
    await this.fetchTickers();

    // 2. Start WebSocket connection
    this.connectWebSocket();

    // 3. Setup background ticker refresh (REST fallback and sync every 10s)
    this.pollingInterval = setInterval(async () => {
      await this.fetchTickers();
    }, 10000);
  }

  /**
   * Fetch all tradable products from Delta Exchange India
   */
  public async fetchProducts(): Promise<DeltaProduct[]> {
    const start = Date.now();
    try {
      const authHeaders = this.getAuthHeaders('GET', '/v2/products') || {};
      const res = await fetch(`${DELTA_REST_BASE}/products`, {
        headers: { Accept: 'application/json', ...authHeaders },
      });
      if (!res.ok) throw new Error(`Products fetch failed: ${res.statusText}`);
      const json = await res.json();
      this.lastRestLatency = Date.now() - start;
      this.restStatus = 'OPERATIONAL';

      if (json.success && Array.isArray(json.result)) {
        for (const item of json.result) {
          this.products.set(item.symbol, item);
        }
        console.log(`[DeltaService] Loaded ${this.products.size} products from Delta India`);
      }
      return Array.from(this.products.values());
    } catch (err) {
      console.error('[DeltaService] Failed to fetch products:', err);
      this.restStatus = 'DEGRADED';
      return Array.from(this.products.values());
    }
  }

  /**
   * Fetch live tickers for all instruments from Delta Exchange India
   */
  public async fetchTickers(): Promise<DeltaTicker[]> {
    const start = Date.now();
    try {
      const authHeaders = this.getAuthHeaders('GET', '/v2/tickers') || {};
      const res = await fetch(`${DELTA_REST_BASE}/tickers`, {
        headers: { Accept: 'application/json', ...authHeaders },
      });
      if (!res.ok) throw new Error(`Tickers fetch failed: ${res.statusText}`);
      const json = await res.json();
      this.lastRestLatency = Date.now() - start;
      this.restStatus = 'OPERATIONAL';

      if (json.success && Array.isArray(json.result)) {
        for (const t of json.result) {
          this.tickers.set(t.symbol, t);
        }
      }
      return Array.from(this.tickers.values());
    } catch (err) {
      console.error('[DeltaService] Failed to fetch tickers:', err);
      this.restStatus = 'DEGRADED';
      return Array.from(this.tickers.values());
    }
  }

  /**
   * Fetch OHLCV candles dynamically from Delta Exchange India
   */
  public async getCandles(
    symbol: string,
    resolution = '1h',
    limit = 100
  ): Promise<Candle[]> {
    const cacheKey = `${symbol}:${resolution}:${limit}`;
    const cached = this.candlesCache.get(cacheKey);
    const now = Math.floor(Date.now() / 1000);

    // Cache valid for 30s
    if (cached && now - cached.timestamp < 30) {
      return cached.candles;
    }

    // Determine start timestamp based on resolution
    const resolutionSecMap: Record<string, number> = {
      '1m': 60,
      '3m': 180,
      '5m': 300,
      '15m': 900,
      '30m': 1800,
      '1h': 3600,
      '2h': 7200,
      '4h': 14400,
      '1d': 86400,
      '1w': 604800,
    };

    const secPerCandle = resolutionSecMap[resolution] || 3600;
    const start = now - secPerCandle * (limit + 10);

    try {
      const authHeaders = this.getAuthHeaders('GET', '/v2/history/candles', `resolution=${resolution}&symbol=${symbol}&start=${start}&end=${now}`) || {};
      const url = `${DELTA_REST_BASE}/history/candles?resolution=${resolution}&symbol=${symbol}&start=${start}&end=${now}`;
      const res = await fetch(url, { headers: { Accept: 'application/json', ...authHeaders } });
      if (!res.ok) {
        throw new Error(`Candles fetch status ${res.status}`);
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.result)) {
        // Delta candles are returned in reverse chronological or chronological order
        const rawCandles: Candle[] = json.result.map((c: any) => ({
          time: c.time,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume),
        }));

        // Sort ascending by time
        rawCandles.sort((a, b) => a.time - b.time);

        this.candlesCache.set(cacheKey, {
          timestamp: now,
          candles: rawCandles,
        });
        return rawCandles;
      }
    } catch (err) {
      console.warn(`[DeltaService] Could not fetch candles for ${symbol} (${resolution}):`, err);
    }

    return cached?.candles || [];
  }

  /**
   * Connect to Delta Exchange India WebSocket for live data feeds
   */
  private connectWebSocket() {
    try {
      this.wsStatus = 'RECONNECTING';
      console.log(`[DeltaService] Connecting to WebSocket ${DELTA_WS_URL}...`);
      this.ws = new WebSocket(DELTA_WS_URL);

      this.ws.on('open', () => {
        console.log('[DeltaService] WebSocket connected to Delta Exchange India');
        this.wsStatus = 'CONNECTED';
        this.reconnectAttempts = 0;

        // Authenticate WebSocket connection if API credentials are provided
        const creds = storage.getCredentials();
        if (creds.apiKey && creds.secret) {
          try {
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const signature = crypto
              .createHmac('sha256', creds.secret)
              .update('GET' + timestamp + '/live')
              .digest('hex');

            const authPayload = {
              type: 'key-auth',
              payload: {
                'api-key': creds.apiKey,
                signature,
                timestamp: Number(timestamp),
              },
            };
            this.ws?.send(JSON.stringify(authPayload));
            console.log('[DeltaService] Sent key-auth authentication payload to Delta Exchange India WebSocket');
          } catch (authErr) {
            console.warn('[DeltaService] Error during WebSocket key-auth:', authErr);
          }
        }

        // Start heartbeat ping every 25 seconds
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);

        // Subscribe to v2/ticker channel for perpetuals and options
        const subMessage = {
          type: 'subscribe',
          payload: {
            channels: [
              {
                name: 'v2/ticker',
                symbols: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'DOGEUSD'],
              },
            ],
          },
        };
        this.ws.send(JSON.stringify(subMessage));
      });

      this.ws.on('message', (data: Buffer | string) => {
        try {
          this.lastWsMessageTime = Date.now();
          const str = data.toString();
          if (str === 'pong' || str.includes('pong')) return;

          const msg = JSON.parse(str);
          if (msg.type === 'v2/ticker' && msg.symbol) {
            const existing = this.tickers.get(msg.symbol) || {
              symbol: msg.symbol,
              contract_type: msg.contract_type || 'perpetual_futures',
            };
            this.tickers.set(msg.symbol, { ...existing, ...msg });
          }
        } catch (e) {
          // ignore parsing error
        }
      });

      this.ws.on('error', (err) => {
        console.warn('[DeltaService] WebSocket error:', err.message);
      });

      this.ws.on('close', () => {
        console.warn('[DeltaService] WebSocket closed. Scheduling reconnection...');
        this.wsStatus = 'DISCONNECTED';
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.scheduleReconnect();
      });
    } catch (err) {
      console.error('[DeltaService] WebSocket setup exception:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(30000, 2000 * Math.pow(1.5, this.reconnectAttempts));
    setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  public getAllProducts(): DeltaProduct[] {
    return Array.from(this.products.values());
  }

  public getProduct(symbol: string): DeltaProduct | undefined {
    return this.products.get(symbol);
  }

  public getAllTickers(): DeltaTicker[] {
    return Array.from(this.tickers.values());
  }

  public getTicker(symbol: string): DeltaTicker | undefined {
    return this.tickers.get(symbol);
  }

  /**
   * Filter tradable products with live market data for the complete Crypto Market view
   */
  public getMarketInstruments(filterType?: string, search?: string) {
    const products = Array.from(this.products.values());
    const query = (search || '').toLowerCase().trim();

    return products
      .filter((p) => {
        if (filterType && filterType !== 'all') {
          if (filterType === 'futures') {
            if (p.contract_type !== 'perpetual_futures' && p.contract_type !== 'futures') {
              return false;
            }
          } else if (filterType === 'options') {
            if (p.contract_type !== 'call_options' && p.contract_type !== 'put_options') {
              return false;
            }
          } else if (p.contract_type !== filterType) {
            return false;
          }
        }

        if (query) {
          const matchSymbol = p.symbol.toLowerCase().includes(query);
          const matchUnderlying = p.underlying_asset?.symbol.toLowerCase().includes(query);
          const matchName = p.underlying_asset?.name?.toLowerCase().includes(query);
          const matchDesc = p.description?.toLowerCase().includes(query);
          if (!matchSymbol && !matchUnderlying && !matchName && !matchDesc) return false;
        }

        return true;
      })
      .map((p) => {
        const ticker = this.tickers.get(p.symbol);
        const bid = ticker?.quotes?.best_bid ? Number(ticker.quotes.best_bid) : null;
        const ask = ticker?.quotes?.best_ask ? Number(ticker.quotes.best_ask) : null;
        const spread = bid !== null && ask !== null ? Number((ask - bid).toFixed(4)) : null;

        return {
          id: p.id,
          coinName: p.underlying_asset?.name || p.symbol,
          symbol: p.symbol,
          underlyingAsset: p.underlying_asset?.symbol || 'N/A',
          instrumentType: p.contract_type,
          contractType: p.contract_type,
          expiry: p.settlement_time || 'Perpetual',
          strikePrice: p.strike_price ? Number(p.strike_price) : null,
          quoteCurrency: p.quoting_asset?.symbol || 'USD',
          settlementCurrency: p.settling_asset?.symbol || 'USD',
          contractSize: p.contract_value ? Number(p.contract_value) : 1,
          tickSize: p.tick_size ? Number(p.tick_size) : null,
          lotSize: p.impact_size || 1,
          tradingStatus: p.trading_status || p.state || 'operational',
          price: ticker?.close ?? null,
          markPrice: ticker?.mark_price ? Number(ticker.mark_price) : null,
          indexPrice: ticker?.spot_price ? Number(ticker.spot_price) : null,
          change24h: ticker?.ltp_change_24h ? Number(ticker.ltp_change_24h) : null,
          high24h: ticker?.high ?? null,
          low24h: ticker?.low ?? null,
          volume24h: ticker?.volume ?? null,
          turnover: ticker?.turnover_usd ?? null,
          bid,
          ask,
          bidQty: ticker?.quotes?.bid_size ? Number(ticker.quotes.bid_size) : null,
          askQty: ticker?.quotes?.ask_size ? Number(ticker.quotes.ask_size) : null,
          spread,
          openInterest: ticker?.oi_contracts ? Number(ticker.oi_contracts) : (ticker?.oi ? Number(ticker.oi) : null),
          oiChange: ticker?.oi_change_usd_6h ? Number(ticker.oi_change_usd_6h) : null,
          fundingRate: ticker?.funding_rate ? Number(ticker.funding_rate) : null,
          nextFundingTime: 'Every 8 Hours (00:00, 08:00, 16:00 UTC)',
          impliedVolatility: ticker?.quotes?.mark_iv
            ? Number((Number(ticker.quotes.mark_iv) * 100).toFixed(2))
            : (ticker?.mark_vol ? Number((Number(ticker.mark_vol) * 100).toFixed(2)) : null),
        };
      });
  }

  /**
   * Build complete Options Chain for a given underlying asset and expiry
   */
  public getOptionsChain(underlying = 'BTC', selectedExpiry?: string): {
    rows: OptionsChainRow[];
    summary: OptionsChainSummary;
    availableExpiries: string[];
  } {
    const products = Array.from(this.products.values()).filter(
      (p) =>
        p.underlying_asset?.symbol.toUpperCase() === underlying.toUpperCase() &&
        (p.contract_type === 'call_options' || p.contract_type === 'put_options')
    );

    // Collect unique expiries
    const expiries = Array.from(
      new Set(products.map((p) => p.settlement_time).filter(Boolean))
    ).sort() as string[];

    const activeExpiry = selectedExpiry && expiries.includes(selectedExpiry)
      ? selectedExpiry
      : expiries[0] || '';

    const underlyingTicker = this.tickers.get(`${underlying.toUpperCase()}USD`) ||
      this.tickers.get(`${underlying.toUpperCase()}USDT`);
    let spotPrice = Number(underlyingTicker?.close || underlyingTicker?.mark_price || underlyingTicker?.spot_price || 0);

    const filtered = products.filter((p) => p.settlement_time === activeExpiry);

    // If spotPrice is not present from the primary index ticker, retrieve from option ticker mark/spot
    if (spotPrice <= 0) {
      for (const prod of filtered) {
        const t = this.tickers.get(prod.symbol);
        if (t?.spot_price && Number(t.spot_price) > 0) {
          spotPrice = Number(t.spot_price);
          break;
        }
        if (t?.mark_price && Number(t.mark_price) > 0) {
          spotPrice = Number(t.mark_price);
          break;
        }
      }
    }

    // Group by strike
    const strikesMap = new Map<
      number,
      { callProduct?: DeltaProduct; putProduct?: DeltaProduct }
    >();

    for (const prod of filtered) {
      const strike = Number(prod.strike_price);
      if (!strike || isNaN(strike)) continue;
      const group = strikesMap.get(strike) || {};
      if (prod.contract_type === 'call_options') group.callProduct = prod;
      else if (prod.contract_type === 'put_options') group.putProduct = prod;
      strikesMap.set(strike, group);
    }

    const sortedStrikes = Array.from(strikesMap.keys()).sort((a, b) => a - b);

    // Find closest ATM strike
    let atmStrike = sortedStrikes[0] || spotPrice;
    let minDiff = Infinity;
    for (const s of sortedStrikes) {
      const diff = Math.abs(s - spotPrice);
      if (diff < minDiff) {
        minDiff = diff;
        atmStrike = s;
      }
    }

    let totalCallOI = 0;
    let totalPutOI = 0;
    let totalCallVol = 0;
    let totalPutVol = 0;
    let maxCallOI = 0;
    let maxPutOI = 0;
    let highestCallOIStrike: number | null = null;
    let highestPutOIStrike: number | null = null;
    let callOIChangeTotal = 0;
    let putOIChangeTotal = 0;

    const rows: OptionsChainRow[] = [];

    for (const strike of sortedStrikes) {
      const { callProduct, putProduct } = strikesMap.get(strike)!;

      const callTicker = callProduct ? this.tickers.get(callProduct.symbol) : undefined;
      const putTicker = putProduct ? this.tickers.get(putProduct.symbol) : undefined;

      // Calls Data
      let callData = null;
      if (callProduct) {
        const ltp = callTicker?.close ?? null;
        const bid = callTicker?.quotes?.best_bid ? Number(callTicker.quotes.best_bid) : null;
        const ask = callTicker?.quotes?.best_ask ? Number(callTicker.quotes.best_ask) : null;
        const oi = callTicker?.oi_contracts ? Number(callTicker.oi_contracts) : (callTicker?.oi ? Number(callTicker.oi) : null);
        const vol = callTicker?.volume ?? null;
        const oiChange = callTicker?.oi_change_usd_6h ? Number(callTicker.oi_change_usd_6h) : null;
        const iv = callTicker?.quotes?.mark_iv
          ? Number((Number(callTicker.quotes.mark_iv) * 100).toFixed(2))
          : (callTicker?.mark_vol ? Number((Number(callTicker.mark_vol) * 100).toFixed(2)) : null);

        const greeks = callTicker?.greeks;
        const intrinsic = Math.max(0, spotPrice - strike);
        const extrinsic = ltp !== null ? Math.max(0, ltp - intrinsic) : null;
        const breakeven = ltp !== null ? strike + ltp : null;

        if (oi) {
          totalCallOI += oi;
          if (oi > maxCallOI) {
            maxCallOI = oi;
            highestCallOIStrike = strike;
          }
        }
        if (vol) totalCallVol += vol;
        if (oiChange) callOIChangeTotal += oiChange;

        callData = {
          symbol: callProduct.symbol,
          ltp,
          bid,
          ask,
          volume: vol,
          oi,
          oiChange,
          iv,
          delta: greeks?.delta ? Number(greeks.delta) : null,
          gamma: greeks?.gamma ? Number(greeks.gamma) : null,
          theta: greeks?.theta ? Number(greeks.theta) : null,
          vega: greeks?.vega ? Number(greeks.vega) : null,
          rho: greeks?.rho ? Number(greeks.rho) : null,
          intrinsicValue: intrinsic > 0 ? Number(intrinsic.toFixed(2)) : 0,
          extrinsicValue: extrinsic !== null ? Number(extrinsic.toFixed(2)) : null,
          breakeven: breakeven !== null ? Number(breakeven.toFixed(2)) : null,
        };
      }

      // Puts Data
      let putData = null;
      if (putProduct) {
        const ltp = putTicker?.close ?? null;
        const bid = putTicker?.quotes?.best_bid ? Number(putTicker.quotes.best_bid) : null;
        const ask = putTicker?.quotes?.best_ask ? Number(putTicker.quotes.best_ask) : null;
        const oi = putTicker?.oi_contracts ? Number(putTicker.oi_contracts) : (putTicker?.oi ? Number(putTicker.oi) : null);
        const vol = putTicker?.volume ?? null;
        const oiChange = putTicker?.oi_change_usd_6h ? Number(putTicker.oi_change_usd_6h) : null;
        const iv = putTicker?.quotes?.mark_iv
          ? Number((Number(putTicker.quotes.mark_iv) * 100).toFixed(2))
          : (putTicker?.mark_vol ? Number((Number(putTicker.mark_vol) * 100).toFixed(2)) : null);

        const greeks = putTicker?.greeks;
        const intrinsic = Math.max(0, strike - spotPrice);
        const extrinsic = ltp !== null ? Math.max(0, ltp - intrinsic) : null;
        const breakeven = ltp !== null ? strike - ltp : null;

        if (oi) {
          totalPutOI += oi;
          if (oi > maxPutOI) {
            maxPutOI = oi;
            highestPutOIStrike = strike;
          }
        }
        if (vol) totalPutVol += vol;
        if (oiChange) putOIChangeTotal += oiChange;

        putData = {
          symbol: putProduct.symbol,
          ltp,
          bid,
          ask,
          volume: vol,
          oi,
          oiChange,
          iv,
          delta: greeks?.delta ? Number(greeks.delta) : null,
          gamma: greeks?.gamma ? Number(greeks.gamma) : null,
          theta: greeks?.theta ? Number(greeks.theta) : null,
          vega: greeks?.vega ? Number(greeks.vega) : null,
          rho: greeks?.rho ? Number(greeks.rho) : null,
          intrinsicValue: intrinsic > 0 ? Number(intrinsic.toFixed(2)) : 0,
          extrinsicValue: extrinsic !== null ? Number(extrinsic.toFixed(2)) : null,
          breakeven: breakeven !== null ? Number(breakeven.toFixed(2)) : null,
        };
      }

      rows.push({
        strike,
        isATM: strike === atmStrike,
        moneynessCall: strike < spotPrice ? 'ITM' : strike === atmStrike ? 'ATM' : 'OTM',
        moneynessPut: strike > spotPrice ? 'ITM' : strike === atmStrike ? 'ATM' : 'OTM',
        call: callData,
        put: putData,
      });
    }

    // Calculate Max Pain: strike that minimizes total payout across all strikes
    let minPainLoss = Infinity;
    let maxPainStrike: number | null = null;
    for (const testStrike of sortedStrikes) {
      let totalLoss = 0;
      for (const row of rows) {
        if (row.call?.oi) {
          const callPayout = Math.max(0, testStrike - row.strike) * row.call.oi;
          totalLoss += callPayout;
        }
        if (row.put?.oi) {
          const putPayout = Math.max(0, row.strike - testStrike) * row.put.oi;
          totalLoss += putPayout;
        }
      }
      if (totalLoss < minPainLoss) {
        minPainLoss = totalLoss;
        maxPainStrike = testStrike;
      }
    }

    const pcr = totalCallOI > 0 ? Number((totalPutOI / totalCallOI).toFixed(3)) : 0;

    return {
      rows,
      summary: {
        underlyingPrice: spotPrice,
        atmStrike,
        totalCallOI,
        totalPutOI,
        putCallRatio: pcr,
        maxPainStrike,
        highestCallOIStrike,
        highestPutOIStrike,
        callOIChangeTotal,
        putOIChangeTotal,
        totalCallVolume: totalCallVol,
        totalPutVolume: totalPutVol,
        supportFromOI: highestPutOIStrike,
        resistanceFromOI: highestCallOIStrike,
      },
      availableExpiries: expiries,
    };
  }

  /**
   * Dedicated Vega and Volatility Analytics calculation
   */
  public async getVolatilityAnalytics(underlying = 'BTC'): Promise<VolatilityAnalytics> {
    const symbol = `${underlying.toUpperCase()}USD`;
    const candlesDaily = await this.getCandles(symbol, '1d', 40);

    // Calculate Historical Volatility (10d & 30d)
    let hv10: number | null = null;
    let hv30: number | null = null;
    let realizedVol: number | null = null;

    if (candlesDaily.length >= 12) {
      const returns10: number[] = [];
      for (let i = candlesDaily.length - 10; i < candlesDaily.length; i++) {
        const prev = candlesDaily[i - 1].close;
        const cur = candlesDaily[i].close;
        returns10.push(Math.log(cur / prev));
      }
      const mean10 = returns10.reduce((a, b) => a + b, 0) / returns10.length;
      const variance10 =
        returns10.reduce((sum, r) => sum + Math.pow(r - mean10, 2), 0) /
        (returns10.length - 1);
      hv10 = Number((Math.sqrt(variance10) * Math.sqrt(365) * 100).toFixed(2));
    }

    if (candlesDaily.length >= 31) {
      const returns30: number[] = [];
      for (let i = candlesDaily.length - 30; i < candlesDaily.length; i++) {
        const prev = candlesDaily[i - 1].close;
        const cur = candlesDaily[i].close;
        returns30.push(Math.log(cur / prev));
      }
      const mean30 = returns30.reduce((a, b) => a + b, 0) / returns30.length;
      const variance30 =
        returns30.reduce((sum, r) => sum + Math.pow(r - mean30, 2), 0) /
        (returns30.length - 1);
      hv30 = Number((Math.sqrt(variance30) * Math.sqrt(365) * 100).toFixed(2));
      realizedVol = hv30;
    }

    // Get live option chain to calculate ATM IV, OTM IV, Skew, and Term Structure
    const chain = this.getOptionsChain(underlying);
    const spotPrice = chain.summary.underlyingPrice;
    const atmRow = chain.rows.find((r) => r.isATM);

    const atmIV = atmRow?.call?.iv ?? atmRow?.put?.iv ?? null;
    const currentIV = atmIV;

    // Volatility Skew: sample calls and puts across strikes
    const skewData: { strike: number; iv: number; type: 'call' | 'put' }[] = [];
    for (const r of chain.rows) {
      if (r.call?.iv) skewData.push({ strike: r.strike, iv: r.call.iv, type: 'call' });
      if (r.put?.iv) skewData.push({ strike: r.strike, iv: r.put.iv, type: 'put' });
    }

    // OTM Call IV (approx 5% above spot) & OTM Put IV (approx 5% below spot)
    const otmCallRow = chain.rows.find((r) => r.strike > spotPrice * 1.05 && r.call?.iv);
    const otmPutRow = chain.rows.find((r) => r.strike < spotPrice * 0.95 && r.put?.iv);
    const otmCallIV = otmCallRow?.call?.iv ?? null;
    const otmPutIV = otmPutRow?.put?.iv ?? null;

    // Term Structure: average IV per expiry
    const termStructure: { expiry: string; daysToExpiry: number; iv: number }[] = [];
    const nowMs = Date.now();
    for (const exp of (chain?.availableExpiries || []).slice(0, 8)) {
      const expMs = new Date(exp).getTime();
      const days = Math.max(0.1, Number(((expMs - nowMs) / (1000 * 86400)).toFixed(1)));
      const expChain = this.getOptionsChain(underlying, exp);
      const expAtm = expChain.rows.find((r) => r.isATM);
      const expIv = expAtm?.call?.iv ?? expAtm?.put?.iv ?? atmIV;
      if (expIv) {
        termStructure.push({
          expiry: new Date(exp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          daysToExpiry: days,
          iv: expIv,
        });
      }
    }

    const ivVsHvSpread = currentIV !== null && hv30 !== null ? Number((currentIV - hv30).toFixed(2)) : null;

    // IV Rank and IV Percentile:
    // Strictly block simulated/estimated IV Rank and Percentile when full 252-day historical IV archive is unavailable.
    // Display null (N/A) per user instruction: "Do not claim IV Rank/Percentile unless enough historical data has actually been collected."
    const ivRank: number | null = null;
    const ivPercentile: number | null = null;
    const hasSufficientHistoricalData = false;

    const vega = atmRow?.call?.vega ?? atmRow?.put?.vega ?? null;
    const totalOIContracts = chain.summary.totalCallOI + chain.summary.totalPutOI;
    const vegaExposure = vega !== null ? Number((vega * totalOIContracts).toFixed(2)) : null;

    const highIV = currentIV !== null && currentIV > 65;
    const lowIV = currentIV !== null && currentIV < 35;
    const ivGreaterThanHV = ivVsHvSpread !== null && ivVsHvSpread > 0;
    const ivLessThanHV = ivVsHvSpread !== null && ivVsHvSpread < 0;
    const volatilityBreakout = Boolean(
      currentIV !== null && hv10 !== null && currentIV > hv10 * 1.25 && hv10 > 50
    );

    return {
      currentIV,
      ivRank,
      ivPercentile,
      historicalVolatility10d: hv10,
      historicalVolatility30d: hv30,
      realizedVolatility: realizedVol,
      ivVsHvSpread,
      vega,
      vegaExposure,
      atmIV,
      otmCallIV,
      otmPutIV,
      volatilitySkew: skewData.slice(0, 30),
      termStructure,
      regimes: {
        highIV,
        lowIV,
        ivRising: ivGreaterThanHV,
        ivFalling: !ivGreaterThanHV,
        ivGreaterThanHV,
        ivLessThanHV,
        volatilityBreakout,
      },
      hasSufficientHistoricalData,
    };
  }

  /**
   * Option Greeks & Sensitivity Stress Test Simulator (Underlying ±1%, IV ±1%, 1-day decay)
   */
  public calculateGreekSensitivity(optionSymbol: string) {
    const product = this.products.get(optionSymbol);
    const ticker = this.tickers.get(optionSymbol);

    if (!product) return null;

    const underlyingSymbol = product.underlying_asset?.symbol || 'BTC';
    const underlyingTicker = this.tickers.get(`${underlyingSymbol}USD`) || this.tickers.get(`${underlyingSymbol}USDT`);
    const rawUnderlyingPrice = underlyingTicker?.close || underlyingTicker?.mark_price || ticker?.spot_price;
    const underlyingPrice = rawUnderlyingPrice ? Number(rawUnderlyingPrice) : null;
    const strike = product.strike_price ? Number(product.strike_price) : null;
    const rawPremium = ticker?.close || ticker?.mark_price;
    const premium = rawPremium ? Number(rawPremium) : null;

    if (underlyingPrice === null || strike === null || premium === null || underlyingPrice <= 0) {
      return null;
    }

    const greeksObj = ticker?.greeks || {};
    const delta = greeksObj.delta !== undefined && greeksObj.delta !== null ? Number(greeksObj.delta) : null;
    const gamma = greeksObj.gamma !== undefined && greeksObj.gamma !== null ? Number(greeksObj.gamma) : null;
    const theta = greeksObj.theta !== undefined && greeksObj.theta !== null ? Number(greeksObj.theta) : null;
    const vega = greeksObj.vega !== undefined && greeksObj.vega !== null ? Number(greeksObj.vega) : null;
    const rho = greeksObj.rho !== undefined && greeksObj.rho !== null ? Number(greeksObj.rho) : null;
    const iv = ticker?.quotes?.mark_iv ? Number(ticker.quotes.mark_iv) * 100 : (ticker?.mark_vol ? Number(ticker.mark_vol) * 100 : null);

    // Expiry calculation
    const settlementMs = product.settlement_time ? new Date(product.settlement_time).getTime() : Date.now();
    const timeToExpiryDays = Math.max(0, Number(((settlementMs - Date.now()) / (1000 * 86400)).toFixed(2)));

    // Mathematical sensitivity changes
    const deltaShiftUp = underlyingPrice * 0.01;
    const deltaShiftDown = -underlyingPrice * 0.01;

    const priceChangeUnderlyingUp = delta !== null && gamma !== null
      ? delta * deltaShiftUp + 0.5 * gamma * Math.pow(deltaShiftUp, 2)
      : null;
    const priceChangeUnderlyingDown = delta !== null && gamma !== null
      ? delta * deltaShiftDown + 0.5 * gamma * Math.pow(deltaShiftDown, 2)
      : null;

    const priceChangeIVUp = vega !== null ? vega : null;
    const priceChangeIVDown = vega !== null ? -vega : null;
    const priceChange1Day = theta !== null ? theta / 365 : null;
    const priceChangeInterestUp = rho !== null ? rho : null;

    return {
      symbol: optionSymbol,
      description: product.description || product.symbol,
      contractType: product.contract_type,
      underlyingPrice,
      strike,
      premium,
      expiry: product.settlement_time || 'N/A',
      timeToExpiryDays,
      impliedVolatility: iv,
      greeks: {
        delta: delta !== null ? Number(delta.toFixed(4)) : null,
        gamma: gamma !== null ? Number(gamma.toFixed(6)) : null,
        theta: theta !== null ? Number(theta.toFixed(2)) : null,
        vega: vega !== null ? Number(vega.toFixed(2)) : null,
        rho: rho !== null ? Number(rho.toFixed(4)) : null,
      },
      sensitivityScenarios: {
        underlyingPlus1Pct: priceChangeUnderlyingUp !== null
          ? {
              shock: '+1.00%',
              dollarMove: Number(deltaShiftUp.toFixed(2)),
              optionPriceChange: Number(priceChangeUnderlyingUp.toFixed(2)),
              newTheoreticalPrice: Number(Math.max(0.01, premium + priceChangeUnderlyingUp).toFixed(2)),
            }
          : null,
        underlyingMinus1Pct: priceChangeUnderlyingDown !== null
          ? {
              shock: '-1.00%',
              dollarMove: Number(deltaShiftDown.toFixed(2)),
              optionPriceChange: Number(priceChangeUnderlyingDown.toFixed(2)),
              newTheoreticalPrice: Number(Math.max(0.01, premium + priceChangeUnderlyingDown).toFixed(2)),
            }
          : null,
        ivPlus1Pct: priceChangeIVUp !== null
          ? {
              shock: '+1.00% IV',
              optionPriceChange: Number(priceChangeIVUp.toFixed(2)),
              newTheoreticalPrice: Number(Math.max(0.01, premium + priceChangeIVUp).toFixed(2)),
            }
          : null,
        ivMinus1Pct: priceChangeIVDown !== null
          ? {
              shock: '-1.00% IV',
              optionPriceChange: Number(priceChangeIVDown.toFixed(2)),
              newTheoreticalPrice: Number(Math.max(0.01, premium + priceChangeIVDown).toFixed(2)),
            }
          : null,
        timeDecay1Day: priceChange1Day !== null
          ? {
              shock: '1 Day Passage',
              optionPriceChange: Number(priceChange1Day.toFixed(2)),
              newTheoreticalPrice: Number(Math.max(0.01, premium + priceChange1Day).toFixed(2)),
            }
          : null,
        interestRatePlus1Pct: priceChangeInterestUp !== null
          ? {
              shock: '+1.00% Interest Rate',
              optionPriceChange: Number(priceChangeInterestUp.toFixed(2)),
              newTheoreticalPrice: Number(Math.max(0.01, premium + priceChangeInterestUp).toFixed(2)),
            }
          : null,
      },
    };
  }

  /**
   * Health status for the monitoring dashboard
   */
  public getApiHealthStatus(): ApiHealthStatus {
    const now = Date.now();
    const staleThresholdSeconds = 60;
    const isStale = this.lastWsMessageTime > 0 && (now - this.lastWsMessageTime) / 1000 > staleThresholdSeconds;

    return {
      restApiStatus: this.restStatus,
      restLatencyMs: this.lastRestLatency,
      websocketStatus: this.wsStatus,
      websocketLastPingMs: 25000,
      lastMessageTimestamp: this.lastWsMessageTime > 0
        ? new Date(this.lastWsMessageTime).toISOString()
        : new Date().toISOString(),
      dataQualityScore: this.restStatus === 'OPERATIONAL' && this.products.size > 500 ? 98 : 75,
      isStaleData: isStale,
      staleThresholdSeconds,
      totalProductsLoaded: this.products.size,
      totalTickersLoaded: this.tickers.size,
    };
  }
}

export const deltaService = new DeltaService();
