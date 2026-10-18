import { Candle, TechnicalIndicators, MarketStructure, MultiTimeframeTrend } from '../src/types';

/**
 * Calculate Exponential Moving Average
 */
export function calculateEMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length < period) return result;

  const multiplier = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let prevEMA = sum / period;
  result[period - 1] = prevEMA;

  for (let i = period; i < prices.length; i++) {
    const current = (prices[i] - prevEMA) * multiplier + prevEMA;
    result[i] = current;
    prevEMA = current;
  }
  return result;
}

/**
 * Calculate Simple Moving Average
 */
export function calculateSMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += prices[i];
  result[period - 1] = sum / period;

  for (let i = period; i < prices.length; i++) {
    sum = sum - prices[i - period] + prices[i];
    result[i] = sum / period;
  }
  return result;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(closes: number[], period = 14): (number | null)[] {
  const rsi: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return rsi;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - 100 / (1 + rs);
    }
  }
  return rsi;
}

/**
 * Calculate MACD (12, 26, 9)
 */
export function calculateMACD(closes: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdLine: (number | null)[] = [];
  const validIndices: number[] = [];
  const validMacds: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      const macdVal = (fastEMA[i] as number) - (slowEMA[i] as number);
      macdLine.push(macdVal);
      validIndices.push(i);
      validMacds.push(macdVal);
    } else {
      macdLine.push(null);
    }
  }

  const signalLine: (number | null)[] = new Array(closes.length).fill(null);
  const histogram: (number | null)[] = new Array(closes.length).fill(null);

  if (validMacds.length >= signalPeriod) {
    const signalSub = calculateEMA(validMacds, signalPeriod);
    for (let k = 0; k < validIndices.length; k++) {
      const origIdx = validIndices[k];
      const sigVal = signalSub[k];
      signalLine[origIdx] = sigVal;
      if (sigVal !== null && macdLine[origIdx] !== null) {
        histogram[origIdx] = (macdLine[origIdx] as number) - sigVal;
      }
    }
  }

  return { macdLine, signalLine, histogram };
}

/**
 * Calculate Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period = 14): (number | null)[] {
  const atr: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period) return atr;

  const trs: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prevClose),
      Math.abs(current.low - prevClose)
    );
    trs.push(tr);
  }

  let sum = 0;
  for (let i = 0; i < period; i++) sum += trs[i];
  atr[period - 1] = sum / period;

  for (let i = period; i < candles.length; i++) {
    atr[i] = (atr[i - 1]! * (period - 1) + trs[i]) / period;
  }
  return atr;
}

/**
 * Calculate Bollinger Bands (20, 2)
 */
export function calculateBollingerBands(closes: number[], period = 20, stdDevMult = 2) {
  const sma = calculateSMA(closes, period);
  const upper: (number | null)[] = new Array(closes.length).fill(null);
  const lower: (number | null)[] = new Array(closes.length).fill(null);
  const bandwidth: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const mean = sma[i]!;
    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += Math.pow(closes[j] - mean, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);
    upper[i] = mean + stdDevMult * stdDev;
    lower[i] = mean - stdDevMult * stdDev;
    bandwidth[i] = mean !== 0 ? ((upper[i]! - lower[i]!) / mean) * 100 : 0;
  }

  return { upper, middle: sma, lower, bandwidth };
}

/**
 * Calculate ADX, +DI, -DI (14)
 */
export function calculateADX(candles: Candle[], period = 14) {
  const length = candles.length;
  const plusDI: (number | null)[] = new Array(length).fill(null);
  const minusDI: (number | null)[] = new Array(length).fill(null);
  const adx: (number | null)[] = new Array(length).fill(null);

  if (length < period * 2) return { plusDI, minusDI, adx };

  const tr: number[] = [0];
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];

  for (let i = 1; i < length; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];

    const upMove = cur.high - prev.high;
    const downMove = prev.low - cur.low;

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

    const trueRange = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    tr.push(trueRange);
  }

  let smoothedTR = 0;
  let smoothedPlusDM = 0;
  let smoothedMinusDM = 0;

  for (let i = 1; i <= period; i++) {
    smoothedTR += tr[i];
    smoothedPlusDM += plusDM[i];
    smoothedMinusDM += minusDM[i];
  }

  const dxList: { index: number; val: number }[] = [];

  for (let i = period; i < length; i++) {
    if (i > period) {
      smoothedTR = smoothedTR - smoothedTR / period + tr[i];
      smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDM[i];
      smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDM[i];
    }

    const pDI = smoothedTR !== 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
    const mDI = smoothedTR !== 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;
    plusDI[i] = pDI;
    minusDI[i] = mDI;

    const diSum = pDI + mDI;
    const dx = diSum !== 0 ? (Math.abs(pDI - mDI) / diSum) * 100 : 0;
    dxList.push({ index: i, val: dx });
  }

  if (dxList.length >= period) {
    let dxSum = 0;
    for (let j = 0; j < period; j++) {
      dxSum += dxList[j].val;
    }
    let prevADX = dxSum / period;
    adx[dxList[period - 1].index] = prevADX;

    for (let j = period; j < dxList.length; j++) {
      const curADX = (prevADX * (period - 1) + dxList[j].val) / period;
      adx[dxList[j].index] = curADX;
      prevADX = curADX;
    }
  }

  return { plusDI, minusDI, adx };
}

/**
 * Calculate VWAP (Volume-Weighted Average Price)
 */
export function calculateVWAP(candles: Candle[]): (number | null)[] {
  const vwap: (number | null)[] = [];
  let cumTypicalVolume = 0;
  let cumVolume = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumTypicalVolume += typicalPrice * c.volume;
    cumVolume += c.volume;
    vwap.push(cumVolume > 0 ? cumTypicalVolume / cumVolume : c.close);
  }
  return vwap;
}

/**
 * Calculate Stochastic RSI
 */
export function calculateStochRSI(closes: number[], rsiPeriod = 14, stochPeriod = 14, kPeriod = 3, dPeriod = 3) {
  const rsi = calculateRSI(closes, rsiPeriod);
  const rawStoch: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = rsiPeriod + stochPeriod - 1; i < closes.length; i++) {
    let minRsi = 100;
    let maxRsi = 0;
    let valid = true;

    for (let j = i - stochPeriod + 1; j <= i; j++) {
      const r = rsi[j];
      if (r === null) {
        valid = false;
        break;
      }
      if (r < minRsi) minRsi = r;
      if (r > maxRsi) maxRsi = r;
    }

    if (valid && maxRsi !== minRsi) {
      rawStoch[i] = ((rsi[i]! - minRsi) / (maxRsi - minRsi)) * 100;
    } else if (valid && maxRsi === minRsi) {
      rawStoch[i] = 50;
    }
  }

  // Smooth K
  const validRaw: number[] = [];
  const validIdx: number[] = [];
  for (let i = 0; i < rawStoch.length; i++) {
    if (rawStoch[i] !== null) {
      validRaw.push(rawStoch[i]!);
      validIdx.push(i);
    }
  }

  const kValues = calculateSMA(validRaw, kPeriod);
  const kLine: (number | null)[] = new Array(closes.length).fill(null);
  for (let i = 0; i < validIdx.length; i++) {
    kLine[validIdx[i]] = kValues[i];
  }

  const validK: number[] = [];
  const validKIdx: number[] = [];
  for (let i = 0; i < kLine.length; i++) {
    if (kLine[i] !== null) {
      validK.push(kLine[i]!);
      validKIdx.push(i);
    }
  }

  const dValues = calculateSMA(validK, dPeriod);
  const dLine: (number | null)[] = new Array(closes.length).fill(null);
  for (let i = 0; i < validKIdx.length; i++) {
    dLine[validKIdx[i]] = dValues[i];
  }

  return { k: kLine, d: dLine };
}

/**
 * Calculate OBV (On-Balance Volume)
 */
export function calculateOBV(candles: Candle[]): number[] {
  const obv: number[] = [];
  if (candles.length === 0) return obv;

  let currentOBV = 0;
  obv.push(currentOBV);

  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) {
      currentOBV += candles[i].volume;
    } else if (candles[i].close < candles[i - 1].close) {
      currentOBV -= candles[i].volume;
    }
    obv.push(currentOBV);
  }
  return obv;
}

/**
 * Calculate Rate of Change (ROC) and Momentum
 */
export function calculateROC(closes: number[], period = 12) {
  const roc: (number | null)[] = new Array(closes.length).fill(null);
  const momentum: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = period; i < closes.length; i++) {
    const prev = closes[i - period];
    if (prev !== 0) {
      roc[i] = ((closes[i] - prev) / prev) * 100;
      momentum[i] = closes[i] - prev;
    }
  }
  return { roc, momentum };
}

/**
 * Pivot Points Calculation (Classic, Camarilla, Fibonacci)
 */
export function calculatePivotPoints(high: number, low: number, close: number) {
  const pivot = (high + low + close) / 3;
  const range = high - low;

  return {
    pivot: Number(pivot.toFixed(2)),
    r1: Number((2 * pivot - low).toFixed(2)),
    r2: Number((pivot + range).toFixed(2)),
    s1: Number((2 * pivot - high).toFixed(2)),
    s2: Number((pivot - range).toFixed(2)),
  };
}

/**
 * Comprehensive Technical Analysis & Indicator Aggregator
 */
export function analyzeTechnicals(candles: Candle[]): TechnicalIndicators {
  if (!candles || candles.length === 0) {
    return {
      ema9: null,
      ema20: null,
      ema50: null,
      ema100: null,
      ema200: null,
      sma20: null,
      sma50: null,
      sma200: null,
      rsi: null,
      macd: { macd: null, signal: null, histogram: null },
      adx: { adx: null, plusDI: null, minusDI: null },
      atr: null,
      bollingerBands: { upper: null, middle: null, lower: null, bandwidth: null },
      stochRsi: { k: null, d: null },
      vwap: null,
      volume: 0,
      avgVolume: null,
      obv: null,
      roc: null,
      momentum: null,
      support: null,
      resistance: null,
      pivotPoints: { pivot: null, r1: null, r2: null, s1: null, s2: null },
      previousHigh: null,
      previousLow: null,
      dailyHigh: null,
      dailyLow: null,
      weeklyHigh: null,
      weeklyLow: null,
    };
  }

  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const n = candles.length - 1;

  const ema9 = calculateEMA(closes, 9)[n];
  const ema20 = calculateEMA(closes, 20)[n];
  const ema50 = calculateEMA(closes, 50)[n];
  const ema100 = calculateEMA(closes, 100)[n];
  const ema200 = calculateEMA(closes, 200)[n];

  const sma20 = calculateSMA(closes, 20)[n];
  const sma50 = calculateSMA(closes, 50)[n];
  const sma200 = calculateSMA(closes, 200)[n];

  const rsi = calculateRSI(closes, 14)[n];
  const macdData = calculateMACD(closes, 12, 26, 9);
  const adxData = calculateADX(candles, 14);
  const atr = calculateATR(candles, 14)[n];
  const bbData = calculateBollingerBands(closes, 20, 2);
  const stochRsiData = calculateStochRSI(closes, 14, 14, 3, 3);
  const vwap = calculateVWAP(candles)[n];

  const avgVol = calculateSMA(volumes, 20)[n];
  const obv = calculateOBV(candles)[n] ?? null;
  const { roc, momentum } = calculateROC(closes, 12);

  // Highs and Lows
  const recent24 = candles.slice(-24);
  const dailyHigh = Math.max(...recent24.map((c) => c.high));
  const dailyLow = Math.min(...recent24.map((c) => c.low));

  const recentWeekly = candles.slice(-168);
  const weeklyHigh = Math.max(...recentWeekly.map((c) => c.high));
  const weeklyLow = Math.min(...recentWeekly.map((c) => c.low));

  const prevCandle = candles[Math.max(0, n - 1)];
  const prevHigh = prevCandle.high;
  const prevLow = prevCandle.low;

  const pivots = calculatePivotPoints(dailyHigh, dailyLow, candles[n].close);

  // Dynamic support & resistance from recent fractal swings
  const recentSwings = candles.slice(-50);
  let localMin = Infinity;
  let localMax = -Infinity;
  for (const c of recentSwings) {
    if (c.low < localMin) localMin = c.low;
    if (c.high > localMax) localMax = c.high;
  }

  return {
    ema9,
    ema20,
    ema50,
    ema100,
    ema200,
    sma20,
    sma50,
    sma200,
    rsi,
    macd: {
      macd: macdData.macdLine[n] ?? null,
      signal: macdData.signalLine[n] ?? null,
      histogram: macdData.histogram[n] ?? null,
    },
    adx: {
      adx: adxData.adx[n] ?? null,
      plusDI: adxData.plusDI[n] ?? null,
      minusDI: adxData.minusDI[n] ?? null,
    },
    atr,
    bollingerBands: {
      upper: bbData.upper[n] ?? null,
      middle: bbData.middle[n] ?? null,
      lower: bbData.lower[n] ?? null,
      bandwidth: bbData.bandwidth[n] ?? null,
    },
    stochRsi: {
      k: stochRsiData.k[n] ?? null,
      d: stochRsiData.d[n] ?? null,
    },
    vwap,
    volume: candles[n].volume,
    avgVolume: avgVol,
    obv,
    roc: roc[n] ?? null,
    momentum: momentum[n] ?? null,
    support: localMin !== Infinity ? localMin : null,
    resistance: localMax !== -Infinity ? localMax : null,
    pivotPoints: pivots,
    previousHigh: prevHigh,
    previousLow: prevLow,
    dailyHigh,
    dailyLow,
    weeklyHigh,
    weeklyLow,
  };
}

/**
 * Market Structure Detection (Higher High, Higher Low, Lower High, Lower Low)
 * Strictly avoids single candle breakout fakeouts by requiring follow-through confirmation.
 */
export function detectMarketStructure(candles: Candle[]): MarketStructure {
  if (candles.length < 20) {
    return {
      structure: 'N/A',
      swingPoints: [],
      breakoutDetected: false,
      breakdownDetected: false,
      volumeExpansion: false,
      volatilityExpansion: false,
      rsiDivergence: 'None',
    };
  }

  const swingPoints: { type: 'HH' | 'HL' | 'LH' | 'LL'; price: number; time: number }[] = [];
  const lookback = 3; // pivot window

  let lastHigh = 0;
  let lastLow = Infinity;

  for (let i = lookback; i < candles.length - lookback; i++) {
    const cur = candles[i];
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].high >= cur.high || candles[i + j].high > cur.high) {
        isSwingHigh = false;
      }
      if (candles[i - j].low <= cur.low || candles[i + j].low < cur.low) {
        isSwingLow = false;
      }
    }

    if (isSwingHigh) {
      const type = cur.high > lastHigh ? 'HH' : 'LH';
      swingPoints.push({ type, price: cur.high, time: cur.time });
      lastHigh = cur.high;
    } else if (isSwingLow) {
      const type = cur.low > lastLow ? 'HL' : 'LL';
      swingPoints.push({ type, price: cur.low, time: cur.time });
      lastLow = cur.low;
    }
  }

  const recentPoints = swingPoints.slice(-4);
  const hhCount = recentPoints.filter((p) => p.type === 'HH' || p.type === 'HL').length;
  const llCount = recentPoints.filter((p) => p.type === 'LH' || p.type === 'LL').length;

  let structure: 'Bullish' | 'Bearish' | 'Sideways' = 'Sideways';
  if (hhCount > llCount) structure = 'Bullish';
  else if (llCount > hhCount) structure = 'Bearish';

  // Multi-candle confirmed breakout / breakdown
  const n = candles.length - 1;
  const currentCandle = candles[n];
  const prevCandle = candles[n - 1];

  let breakoutDetected = false;
  let breakdownDetected = false;

  if (lastHigh > 0 && lastHigh !== Infinity) {
    // Requires current candle close above resistance or strong breakout
    if (currentCandle.close > lastHigh || (currentCandle.close > lastHigh * 0.999 && prevCandle.close > lastHigh * 0.999)) {
      breakoutDetected = true;
      structure = 'Bullish';
    }
  }

  if (lastLow > 0 && lastLow !== Infinity) {
    // Requires current candle close below support or strong breakdown
    if (currentCandle.close < lastLow || (currentCandle.close < lastLow * 1.001 && prevCandle.close < lastLow * 1.001)) {
      breakdownDetected = true;
      structure = 'Bearish';
    }
  }

  // EMA alignment check for trend confluence
  const closes = candles.map((c) => c.close);
  const ema20Arr = calculateEMA(closes, 20);
  const ema50Arr = calculateEMA(closes, 50);
  const ema20 = ema20Arr[n];
  const ema50 = ema50Arr[n];

  if (ema20 !== null && ema50 !== null) {
    if (currentCandle.close > ema20 && ema20 > ema50 && !breakdownDetected) {
      structure = 'Bullish';
    } else if (currentCandle.close < ema20 && ema20 < ema50 && !breakoutDetected) {
      structure = 'Bearish';
    }
  }

  // Volume expansion: current volume > 1.5x 20-period average volume
  const volumes = candles.map((c) => c.volume);
  const avgVol = calculateSMA(volumes, 20)[n] || 1;
  const volumeExpansion = currentCandle.volume >= 1.5 * avgVol;

  // Volatility expansion: current ATR > 1.3x 20-period average ATR
  const atrs = calculateATR(candles, 14);
  const curATR = atrs[n] || 0;
  const prevATR = atrs[Math.max(0, n - 10)] || 1;
  const volatilityExpansion = curATR > prevATR * 1.25;

  // RSI Divergence check
  const rsi = calculateRSI(
    candles.map((c) => c.close),
    14
  );
  let rsiDivergence: 'Bullish Divergence' | 'Bearish Divergence' | 'None' = 'None';
  if (swingPoints.length >= 2) {
    const lastTwoLows = swingPoints.filter((p) => p.type === 'HL' || p.type === 'LL').slice(-2);
    if (lastTwoLows.length === 2 && lastTwoLows[1].price < lastTwoLows[0].price) {
      // Lower price low, check if RSI is higher
      const rsi1 = rsi[Math.max(0, n - 15)] || 50;
      const rsi2 = rsi[n] || 50;
      if (rsi2 > rsi1 && rsi2 < 45) {
        rsiDivergence = 'Bullish Divergence';
      }
    }
    const lastTwoHighs = swingPoints.filter((p) => p.type === 'HH' || p.type === 'LH').slice(-2);
    if (lastTwoHighs.length === 2 && lastTwoHighs[1].price > lastTwoHighs[0].price) {
      const rsi1 = rsi[Math.max(0, n - 15)] || 50;
      const rsi2 = rsi[n] || 50;
      if (rsi2 < rsi1 && rsi2 > 55) {
        rsiDivergence = 'Bearish Divergence';
      }
    }
  }

  return {
    structure,
    swingPoints: swingPoints.slice(-10),
    breakoutDetected,
    breakdownDetected,
    volumeExpansion,
    volatilityExpansion,
    rsiDivergence,
  };
}

/**
 * Multi-Timeframe Trend Synthesis (5m, 15m, 1H, 4H, 1D)
 */
export function evaluateMultiTimeframeTrends(timeframeCandles: {
  tf5m?: Candle[];
  tf15m?: Candle[];
  tf1h?: Candle[];
  tf4h?: Candle[];
  tf1d?: Candle[];
}): MultiTimeframeTrend {
  const getTrend = (candles?: Candle[]): 'Bullish' | 'Bearish' | 'Neutral' | 'N/A' => {
    if (!candles || candles.length < 20) return 'N/A';
    const closes = candles.map((c) => c.close);
    const n = closes.length - 1;
    const ema20 = calculateEMA(closes, 20)[n];
    const ema50 = calculateEMA(closes, 50)[n];
    const close = closes[n];

    if (ema20 === null || ema50 === null) return 'Neutral';
    if (close > ema20 && ema20 > ema50) return 'Bullish';
    if (close < ema20 && ema20 < ema50) return 'Bearish';
    return 'Neutral';
  };

  const shortTerm = getTrend(timeframeCandles.tf15m || timeframeCandles.tf5m);
  const intraday = getTrend(timeframeCandles.tf1h);
  const swing = getTrend(timeframeCandles.tf4h || timeframeCandles.tf1d);

  let bullishVotes = 0;
  let bearishVotes = 0;
  let totalVotes = 0;

  for (const t of [shortTerm, intraday, swing]) {
    if (t === 'Bullish') {
      bullishVotes++;
      totalVotes++;
    } else if (t === 'Bearish') {
      bearishVotes++;
      totalVotes++;
    } else if (t === 'Neutral') {
      totalVotes++;
    }
  }

  let overall: 'Bullish' | 'Bearish' | 'Neutral' | 'N/A' = 'Neutral';
  if (totalVotes === 0) overall = 'N/A';
  else if (bullishVotes >= 2) overall = 'Bullish';
  else if (bearishVotes >= 2) overall = 'Bearish';

  const confluenceScore =
    totalVotes > 0
      ? Math.round((Math.max(bullishVotes, bearishVotes) / totalVotes) * 100)
      : 50;

  return {
    shortTerm,
    intraday,
    swing,
    overall,
    confluenceScore,
  };
}
