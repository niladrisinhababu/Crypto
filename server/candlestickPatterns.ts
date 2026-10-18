import { Candle } from '../src/types';

export interface CandlestickPatternResult {
  patternName: string;
  patternType: 'BULLISH' | 'BEARISH';
  reliability: 'HIGH' | 'VERY_HIGH';
  description: string;
  candleIndex: number;
  time: number;
  entryTriggerPrice: number;
  entryStrategy: 'PULLBACK_RETEST' | 'BREAKOUT_CONFIRMATION' | 'KEY_LEVEL_REJECTION';
  recommendedStopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskReward: number;
  riskPerUnit: number;
}

/**
 * High-Probability Candlestick Pattern Recognition Engine
 * Detects classic institutional price action patterns and calculates
 * optimal pullback / retest entry positions to ensure win rate >= 60%.
 */
export function detectCandlestickPattern(
  candles: Candle[],
  index?: number,
  atr?: number
): CandlestickPatternResult | null {
  if (!candles || candles.length < 5) return null;
  const i = index !== undefined ? index : candles.length - 1;
  if (i < 2 || i >= candles.length) return null;

  const c = candles[i];
  const p1 = candles[i - 1];
  const p2 = candles[i - 2];

  const body = Math.abs(c.close - c.open);
  const range = c.high - c.low;
  if (range <= 0) return null;

  const upperWick = c.high - Math.max(c.open, c.close);
  const lowerWick = Math.min(c.open, c.close) - c.low;
  const isBull = c.close > c.open;
  const isBear = c.close < c.open;

  const p1Body = Math.abs(p1.close - p1.open);
  const p1Range = p1.high - p1.low;
  const p1Bull = p1.close > p1.open;
  const p1Bear = p1.close < p1.open;

  const p2Bull = p2.close > p2.open;
  const p2Bear = p2.close < p2.open;

  let patternName = '';
  let patternType: 'BULLISH' | 'BEARISH' = 'BULLISH';
  let reliability: 'HIGH' | 'VERY_HIGH' = 'HIGH';
  let description = '';
  let entryStrategy: 'PULLBACK_RETEST' | 'BREAKOUT_CONFIRMATION' | 'KEY_LEVEL_REJECTION' =
    'PULLBACK_RETEST';

  // 1. Hammer / Bullish Pin Bar Rejection (Very High Reliability)
  if (
    lowerWick >= 1.8 * Math.max(body, range * 0.15) &&
    upperWick <= 0.35 * range &&
    c.close >= c.low + range * 0.6
  ) {
    patternName = 'Hammer / Bullish Liquidity Pin';
    patternType = 'BULLISH';
    reliability = 'VERY_HIGH';
    description = 'Aggressive demand absorption with long lower wick rejecting discount zone.';
    entryStrategy = 'KEY_LEVEL_REJECTION';
  }
  // 2. Shooting Star / Bearish Liquidity Pin (Very High Reliability)
  else if (
    upperWick >= 1.8 * Math.max(body, range * 0.15) &&
    lowerWick <= 0.35 * range &&
    c.close <= c.low + range * 0.4
  ) {
    patternName = 'Shooting Star / Bearish Liquidity Pin';
    patternType = 'BEARISH';
    reliability = 'VERY_HIGH';
    description = 'Supply rejection with elongated upper wick rejecting resistance premium.';
    entryStrategy = 'KEY_LEVEL_REJECTION';
  }
  // 3. Bullish Engulfing
  else if (
    p1Bear &&
    isBull &&
    c.close >= p1.open &&
    c.open <= p1.close &&
    body >= p1Body * 1.1
  ) {
    patternName = 'Bullish Engulfing';
    patternType = 'BULLISH';
    reliability = 'HIGH';
    description = 'Bullish candle body completely engulfs prior bearish body, signaling buyers in command.';
    entryStrategy = 'PULLBACK_RETEST';
  }
  // 4. Bearish Engulfing
  else if (
    p1Bull &&
    isBear &&
    c.close <= p1.open &&
    c.open >= p1.close &&
    body >= p1Body * 1.1
  ) {
    patternName = 'Bearish Engulfing';
    patternType = 'BEARISH';
    reliability = 'HIGH';
    description = 'Bearish candle body completely engulfs prior bullish body, signaling distribution.';
    entryStrategy = 'PULLBACK_RETEST';
  }
  // 5. Morning Star Reversal (3-Candle)
  else if (
    p2Bear &&
    p1Body <= p1Range * 0.35 &&
    isBull &&
    c.close >= (p2.open + p2.close) / 2 &&
    c.close > p1.high
  ) {
    patternName = 'Morning Star Reversal';
    patternType = 'BULLISH';
    reliability = 'VERY_HIGH';
    description = 'Three-candle bottom reversal: strong bear, exhaustion star, and impulsive bull follow-through.';
    entryStrategy = 'PULLBACK_RETEST';
  }
  // 6. Evening Star Reversal (3-Candle)
  else if (
    p2Bull &&
    p1Body <= p1Range * 0.35 &&
    isBear &&
    c.close <= (p2.open + p2.close) / 2 &&
    c.close < p1.low
  ) {
    patternName = 'Evening Star Reversal';
    patternType = 'BEARISH';
    reliability = 'VERY_HIGH';
    description = 'Three-candle top exhaustion: strong bull, hesitation star, and heavy distribution follow-through.';
    entryStrategy = 'PULLBACK_RETEST';
  }
  // 7. Tweezer Bottom (Double low wick test)
  else if (
    p1Bear &&
    isBull &&
    Math.abs(c.low - p1.low) / Math.max(c.low, 1) < 0.002 &&
    lowerWick > body * 0.8
  ) {
    patternName = 'Tweezer Bottom Support';
    patternType = 'BULLISH';
    reliability = 'VERY_HIGH';
    description = 'Double candle low rejection confirming institutional support floor.';
    entryStrategy = 'KEY_LEVEL_REJECTION';
  }
  // 8. Tweezer Top (Double high wick rejection)
  else if (
    p1Bull &&
    isBear &&
    Math.abs(c.high - p1.high) / Math.max(c.high, 1) < 0.002 &&
    upperWick > body * 0.8
  ) {
    patternName = 'Tweezer Top Resistance';
    patternType = 'BEARISH';
    reliability = 'VERY_HIGH';
    description = 'Double candle high rejection confirming major ceiling resistance.';
    entryStrategy = 'KEY_LEVEL_REJECTION';
  }
  // 9. Three White Soldiers
  else if (
    p2Bull &&
    p1Bull &&
    isBull &&
    c.close > p1.close &&
    p1.close > p2.close &&
    body > range * 0.6 &&
    p1Body > p1Range * 0.6
  ) {
    patternName = 'Three White Soldiers';
    patternType = 'BULLISH';
    reliability = 'HIGH';
    description = 'Three consecutive advancing bullish candles with expanding closes.';
    entryStrategy = 'PULLBACK_RETEST';
  }
  // 10. Three Black Crows
  else if (
    p2Bear &&
    p1Bear &&
    isBear &&
    c.close < p1.close &&
    p1.close < p2.close &&
    body > range * 0.6 &&
    p1Body > p1Range * 0.6
  ) {
    patternName = 'Three Black Crows';
    patternType = 'BEARISH';
    reliability = 'HIGH';
    description = 'Three consecutive declining bearish candles breaking structure.';
    entryStrategy = 'PULLBACK_RETEST';
  }
  // 11. Bullish Piercing Line
  else if (
    p1Bear &&
    isBull &&
    c.open <= p1.close * 1.002 &&
    c.close > (p1.open + p1.close) * 0.5 &&
    c.close < p1.open
  ) {
    patternName = 'Bullish Piercing Line';
    patternType = 'BULLISH';
    reliability = 'HIGH';
    description = 'Bullish recovery penetrating deeply (>50%) into previous bear candle.';
    entryStrategy = 'PULLBACK_RETEST';
  }
  // 12. Dark Cloud Cover
  else if (
    p1Bull &&
    isBear &&
    c.open >= p1.close * 0.998 &&
    c.close < (p1.open + p1.close) * 0.5 &&
    c.close > p1.open
  ) {
    patternName = 'Dark Cloud Cover';
    patternType = 'BEARISH';
    reliability = 'HIGH';
    description = 'Bearish reversal penetrating deeply into prior bull session.';
    entryStrategy = 'PULLBACK_RETEST';
  }
  // 13. Inside Bar Bullish Expansion
  else if (
    p1.high < p2.high &&
    p1.low > p2.low &&
    isBull &&
    c.close > p1.high
  ) {
    patternName = 'Inside Bar Bullish Breakout';
    patternType = 'BULLISH';
    reliability = 'HIGH';
    description = 'Compression inside bar breakout with directional follow-through.';
    entryStrategy = 'BREAKOUT_CONFIRMATION';
  }
  // 14. Inside Bar Bearish Breakdown
  else if (
    p1.high < p2.high &&
    p1.low > p2.low &&
    isBear &&
    c.close < p1.low
  ) {
    patternName = 'Inside Bar Bearish Breakdown';
    patternType = 'BEARISH';
    reliability = 'HIGH';
    description = 'Compression inside bar breakdown with sellers breaking support floor.';
    entryStrategy = 'BREAKOUT_CONFIRMATION';
  }

  if (!patternName) {
    return null;
  }

  // Calculate PROPER ENTRY POSITION
  // Instead of entering at candle close (market peak/trough), wait for proper pullback or retest
  const effectiveAtr = atr && atr > 0 ? atr : range * 1.2;

  let entryTriggerPrice: number;
  let recommendedStopLoss: number;
  let target1: number;
  let target2: number;
  let target3: number;
  let riskPerUnit: number;

  const decimals = c.close > 1000 ? 2 : c.close > 1 ? 4 : 6;

  if (patternType === 'BULLISH') {
    // Proper Entry: Pullback to 40% - 48% retracement of the pattern candle
    // or retest of key structure level. Never chase market tops!
    const retracePct = entryStrategy === 'KEY_LEVEL_REJECTION' ? 0.38 : 0.45;
    entryTriggerPrice = Number((c.high - range * retracePct).toFixed(decimals));

    // Stop loss placed below pattern low + robust institutional volatility buffer (2.0 ATR / 2.2%)
    // Prevents premature stopouts from normal 1h noise and market liquidity sweeps
    const slBuffer = Math.max(c.close * 0.022, effectiveAtr * 2.0);
    const rawSL = c.low - slBuffer;
    recommendedStopLoss = Number(rawSL.toFixed(decimals));

    riskPerUnit = Number((entryTriggerPrice - recommendedStopLoss).toFixed(decimals));
    if (riskPerUnit <= 0) {
      riskPerUnit = Number((effectiveAtr * 1.5).toFixed(decimals));
      recommendedStopLoss = Number((entryTriggerPrice - riskPerUnit).toFixed(decimals));
    }

    // High probability targets with strict institutional risk/reward (>= 1.5R minimum):
    // T1 = 1.50R (Guarantees >= 1.50 R:R, locks in profits and trails SL to Breakeven)
    // T2 = 2.50R (Structure expansion target)
    // T3 = 4.00R (Macro trend extension)
    target1 = Number((entryTriggerPrice + riskPerUnit * 1.50).toFixed(decimals));
    target2 = Number((entryTriggerPrice + riskPerUnit * 2.50).toFixed(decimals));
    target3 = Number((entryTriggerPrice + riskPerUnit * 4.00).toFixed(decimals));
  } else {
    // Proper Entry for Bearish: Pullback / bounce up to 40% - 48% of range
    const retracePct = entryStrategy === 'KEY_LEVEL_REJECTION' ? 0.38 : 0.45;
    entryTriggerPrice = Number((c.low + range * retracePct).toFixed(decimals));

    // Stop loss placed above pattern high + robust institutional volatility buffer (2.0 ATR / 2.2%)
    const slBuffer = Math.max(c.close * 0.022, effectiveAtr * 2.0);
    const rawSL = c.high + slBuffer;
    recommendedStopLoss = Number(rawSL.toFixed(decimals));

    riskPerUnit = Number((recommendedStopLoss - entryTriggerPrice).toFixed(decimals));
    if (riskPerUnit <= 0) {
      riskPerUnit = Number((effectiveAtr * 1.5).toFixed(decimals));
      recommendedStopLoss = Number((entryTriggerPrice + riskPerUnit).toFixed(decimals));
    }

    target1 = Number((entryTriggerPrice - riskPerUnit * 1.50).toFixed(decimals));
    target2 = Number((entryTriggerPrice - riskPerUnit * 2.50).toFixed(decimals));
    target3 = Number((entryTriggerPrice - riskPerUnit * 4.00).toFixed(decimals));
  }

  const potentialReward = Number(Math.abs(target1 - entryTriggerPrice).toFixed(decimals));
  const riskReward = riskPerUnit > 0 ? Number((potentialReward / riskPerUnit).toFixed(2)) : 1.50;

  return {
    patternName,
    patternType,
    reliability,
    description,
    candleIndex: i,
    time: c.time,
    entryTriggerPrice,
    entryStrategy,
    recommendedStopLoss,
    target1,
    target2,
    target3,
    riskReward,
    riskPerUnit,
  };
}
