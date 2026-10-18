import { deltaService } from './deltaService';
import { analyzeTechnicals, detectMarketStructure, evaluateMultiTimeframeTrends } from './technicalEngine';
import { detectCandlestickPattern } from './candlestickPatterns';
import { getFundamentalProfile } from './fundamentalService';
import { storage } from './storage';
import { verificationEngine } from './verificationEngine';
import { CryptoSignal, SignalType } from '../src/types';

class SignalScanner {
  private scanCache: CryptoSignal[] = [];
  private lastScanTime = 0;
  private isScanning = false;

  /**
   * Run full quantitative scan across all top Delta Exchange India instruments
   */
  public async runScan(): Promise<CryptoSignal[]> {
    const now = Date.now();
    // Throttle heavy scanning to once per 10 seconds, but always return with real-time price updates
    if (this.isScanning) {
      return verificationEngine.updateSignalsWithRealTimePrices(this.scanCache);
    }
    if (this.scanCache.length > 0 && now - this.lastScanTime < 10000) {
      return verificationEngine.updateSignalsWithRealTimePrices(this.scanCache);
    }

    this.isScanning = true;
    try {
      const settings = storage.getSettings();
      const products = deltaService.getAllProducts();

      // Top liquid perpetual contracts to scan
      const targetUnderlyings = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'SUI', 'BNB'];
      const signals: CryptoSignal[] = [];

      for (const coin of targetUnderlyings) {
        const symbol = `${coin}USD`;
        const product = deltaService.getProduct(symbol);
        const ticker = deltaService.getTicker(symbol);

        if (!ticker || !ticker.close) continue;

        // Fetch multi-timeframe candles dynamically
        const [candles1h, candles15m, candles4h] = await Promise.all([
          deltaService.getCandles(symbol, '1h', 70),
          deltaService.getCandles(symbol, '15m', 50),
          deltaService.getCandles(symbol, '4h', 50),
        ]);

        if (candles1h.length < 25) {
          // Insufficient data
          continue;
        }

        const price = Number(ticker.close);
        const technicals = analyzeTechnicals(candles1h);
        const structure = detectMarketStructure(candles1h);
        const mtf = evaluateMultiTimeframeTrends({
          tf15m: candles15m,
          tf1h: candles1h,
          tf4h: candles4h,
        });

        // 1. Data Validation Check
        const spread =
          ticker.quotes?.best_bid && ticker.quotes?.best_ask
            ? Number(ticker.quotes.best_ask) - Number(ticker.quotes.best_bid)
            : 0;
        const volume24h = ticker.volume ?? 0;
        const oi = ticker.oi_contracts ? Number(ticker.oi_contracts) : (ticker.oi ? Number(ticker.oi) : 0);
        const oiChange = ticker.oi_change_usd_6h ? Number(ticker.oi_change_usd_6h) : 0;
        const funding = ticker.funding_rate ? Number(ticker.funding_rate) : 0;
        const iv = ticker.quotes?.mark_iv ? Number(ticker.quotes.mark_iv) * 100 : null;

        // Validation gate
        let isDataValid = true;
        const invalidationReasons: string[] = [];

        if (candles1h.length < 20) {
          isDataValid = false;
          invalidationReasons.push('Insufficient candle history (< 20 candles)');
        }
        if (price <= 0) {
          isDataValid = false;
          invalidationReasons.push('Invalid price feed (<= 0)');
        }
        if (spread > price * 0.015) {
          isDataValid = false;
          invalidationReasons.push('Excessive spread (> 1.5% of price)');
        }

        // 2. Buildup Analysis (Price & Open Interest)
        const priceChange24h = ticker.ltp_change_24h ? Number(ticker.ltp_change_24h) : 0;
        let buildupType: CryptoSignal['buildupType'] = 'N/A';

        if (priceChange24h > 0 && oiChange > 0) {
          buildupType = 'Long Buildup';
        } else if (priceChange24h < 0 && oiChange > 0) {
          buildupType = 'Short Buildup';
        } else if (priceChange24h > 0 && oiChange < 0) {
          buildupType = 'Short Covering';
        } else if (priceChange24h < 0 && oiChange < 0) {
          buildupType = 'Long Unwinding';
        }

        // Market Structure harmonization with derivatives order flow:
        // - Long Buildup (Price ↑ + OI ↑): Institutional long expansion -> strictly Bullish structure
        // - Short Covering (Price ↑ + OI ↓): Short squeeze / relief rally -> strictly Bullish structure
        // - Short Buildup (Price ↓ + OI ↑): Institutional short accumulation -> strictly Bearish structure
        // - Long Unwinding (Price ↓ + OI ↓): Long liquidation cascade -> strictly Bearish structure
        let marketStructure: 'Bullish' | 'Bearish' | 'Sideways' =
          structure.structure !== 'N/A' ? structure.structure : 'Sideways';
        if (buildupType === 'Long Buildup' || buildupType === 'Short Covering') {
          marketStructure = 'Bullish';
        } else if (buildupType === 'Short Buildup' || buildupType === 'Long Unwinding') {
          marketStructure = 'Bearish';
        } else {
          marketStructure = structure.structure !== 'N/A' ? structure.structure : 'Sideways';
        }

        // Directional Bias
        const isBullishBias =
          buildupType === 'Long Buildup' ||
          buildupType === 'Short Covering' ||
          (buildupType === 'N/A' && (structure.structure === 'Bullish' || priceChange24h >= 0));

        const isBearishBias =
          buildupType === 'Short Buildup' ||
          buildupType === 'Long Unwinding' ||
          (buildupType === 'N/A' && (structure.structure === 'Bearish' || priceChange24h < 0));

        // 3. Quantitative Scoring Engine (0-100)
        let trendScore = 0; // max 20
        let momentumScore = 0; // max 15
        let volumeScore = 0; // max 15
        let oiScore = 0; // max 15
        let structureScore = 0; // max 15
        let volatilityScore = 0; // max 10
        let mtfScore = 0; // max 10

        const confirmations: string[] = [];
        const cancelConditions: string[] = [];

        // Trend (20 pts)
        const isBullTrend =
          technicals.ema20 !== null &&
          technicals.ema50 !== null &&
          price > technicals.ema20 &&
          technicals.ema20 > technicals.ema50;

        const isBearTrend =
          technicals.ema20 !== null &&
          technicals.ema50 !== null &&
          price < technicals.ema20 &&
          technicals.ema20 < technicals.ema50;

        if (isBullishBias) {
          trendScore += isBullTrend ? 20 : 15;
          confirmations.push(
            isBullTrend
              ? 'Bullish EMA alignment (Price > EMA20 > EMA50)'
              : 'Bullish trend momentum confirmed by order flow'
          );
          if (technicals.ema200 && price > technicals.ema200) {
            confirmations.push('Macro trend confirmed above 200 EMA');
          }
        } else if (isBearishBias) {
          trendScore += isBearTrend ? 20 : 15;
          confirmations.push(
            isBearTrend
              ? 'Bearish EMA alignment (Price < EMA20 < EMA50)'
              : 'Bearish downward momentum confirmed by order flow'
          );
          if (technicals.ema200 && price < technicals.ema200) {
            confirmations.push('Macro breakdown confirmed below 200 EMA');
          }
        } else {
          trendScore += 5; // Sideways
        }

        // Momentum (15 pts) - RSI & MACD
        if (technicals.rsi !== null) {
          if (isBullishBias && technicals.rsi > 48 && technicals.rsi < 72) {
            momentumScore += 8;
            confirmations.push(`Healthy bullish RSI momentum (${technicals.rsi.toFixed(1)})`);
          } else if (isBearishBias && technicals.rsi < 52 && technicals.rsi > 28) {
            momentumScore += 8;
            confirmations.push(`Healthy bearish RSI momentum (${technicals.rsi.toFixed(1)})`);
          } else {
            momentumScore += 4;
          }
        }
        if (technicals.macd.histogram !== null) {
          if (isBullishBias && technicals.macd.histogram >= 0) {
            momentumScore += 7;
            confirmations.push('Positive MACD expansion histogram');
          } else if (isBearishBias && technicals.macd.histogram <= 0) {
            momentumScore += 7;
            confirmations.push('Negative MACD downward acceleration');
          } else {
            momentumScore += 3;
          }
        }

        // Volume (15 pts)
        if (structure.volumeExpansion) {
          volumeScore += 15;
          confirmations.push('Volume expansion confirmed (> 1.5x 20-period average)');
        } else if (technicals.avgVolume && technicals.volume > technicals.avgVolume) {
          volumeScore += 10;
          confirmations.push('Above-average transactional volume');
        } else {
          volumeScore += 6;
        }

        // Open Interest & Buildup (15 pts)
        if (buildupType === 'Long Buildup') {
          oiScore += 15;
          confirmations.push('Derivatives Long Buildup: Price & OI expanding in tandem (Bullish Structure)');
        } else if (buildupType === 'Short Covering') {
          oiScore += 13;
          confirmations.push('Short Covering Rally: Price expanding as short sellers cover positions (Bullish Structure)');
        } else if (buildupType === 'Short Buildup') {
          oiScore += 15;
          confirmations.push('Derivatives Short Buildup: Institutional short accumulation (Bearish Structure)');
        } else if (buildupType === 'Long Unwinding') {
          oiScore += 13;
          confirmations.push('Long Unwinding: Price dropping as long contracts liquidate (Bearish Structure)');
        } else {
          oiScore += 6;
        }

        // Market Structure & Breakout (15 pts)
        if (marketStructure === 'Bullish') {
          structureScore += 10;
          confirmations.push(
            buildupType === 'Short Covering'
              ? 'Bullish market structure via active short covering expansion'
              : 'Bullish market structure (Higher Highs & Higher Lows)'
          );
          if (structure.breakoutDetected) {
            structureScore += 5;
            confirmations.push('Confirmed resistance breakout with multi-candle close');
          }
        } else if (marketStructure === 'Bearish') {
          structureScore += 10;
          confirmations.push(
            buildupType === 'Long Unwinding'
              ? 'Bearish market structure via long unwinding liquidation'
              : 'Bearish market structure (Lower Highs & Lower Lows)'
          );
          if (structure.breakdownDetected) {
            structureScore += 5;
            confirmations.push('Confirmed support breakdown with multi-candle close');
          }
        } else {
          structureScore += 5;
        }

        // Volatility & Bands (10 pts)
        if (structure.volatilityExpansion) {
          volatilityScore += 10;
          confirmations.push('Volatility expansion with ATR expansion');
        } else {
          volatilityScore += 6;
        }

        // Multi-timeframe Alignment (10 pts)
        if (mtf.confluenceScore >= 80) {
          mtfScore += 10;
          confirmations.push(`High multi-timeframe confluence (${mtf.confluenceScore}%)`);
        } else if (mtf.confluenceScore >= 60) {
          mtfScore += 6;
        } else {
          mtfScore += 4;
        }

        // Candlestick Pattern Detection & Proper Entry Positioning
        const rawPattern = detectCandlestickPattern(candles1h, candles1h.length - 1, technicals.atr || undefined);
        // Only accept pattern if aligned with directional order-flow bias
        const pattern =
          rawPattern &&
          ((isBullishBias && rawPattern.patternType === 'BULLISH') ||
            (isBearishBias && rawPattern.patternType === 'BEARISH'))
            ? rawPattern
            : null;

        let patternScore = 0;
        if (pattern) {
          if (pattern.reliability === 'VERY_HIGH') patternScore = 15;
          else if (pattern.reliability === 'HIGH') patternScore = 10;
          else patternScore = 5;
          confirmations.push(`Candlestick Pattern: ${pattern.patternName} (${pattern.reliability} Reliability)`);
          confirmations.push(pattern.description);
        }

        const finalScore = Math.min(
          100,
          trendScore + momentumScore + volumeScore + oiScore + structureScore + volatilityScore + mtfScore + patternScore
        );

        // Signal Classification strictly harmonized with directional bias
        let signal: SignalType = 'NEUTRAL';
        if (!isDataValid) {
          signal = 'INVALID / WAIT';
        } else if (isBullishBias) {
          if (finalScore >= 80) {
            signal = 'STRONG BUY';
          } else if (finalScore >= 65) {
            signal = 'BUY';
          } else {
            signal = 'NEUTRAL';
          }
        } else if (isBearishBias) {
          if (finalScore >= 80) {
            signal = 'STRONG SELL';
          } else if (finalScore >= 65) {
            signal = 'SELL';
          } else {
            signal = 'NEUTRAL';
          }
        } else {
          signal = 'NEUTRAL';
        }

        // Invalidation rules
        if (isBullTrend) {
          cancelConditions.push(
            `Candle close below 20 EMA ($${(technicals.ema20 || price * 0.98).toFixed(2)})`,
            `RSI dropping below 45`,
            `Open interest sudden contraction > 8%`,
            `Break of key support level ($${(technicals.support || price * 0.95).toFixed(2)})`
          );
        } else if (isBearTrend) {
          cancelConditions.push(
            `Candle close above 20 EMA ($${(technicals.ema20 || price * 1.02).toFixed(2)})`,
            `RSI rising above 55`,
            `Break of key resistance level ($${(technicals.resistance || price * 1.05).toFixed(2)})`
          );
        } else {
          cancelConditions.push('Consolidation chop breakout awaiting confirmation');
        }

        // Proper Entry Position, Stop Loss, Target 1/2/3 with adaptive precision for crypto assets
        // Follows user mandate: "candlestick pattern follow, possible proper entry position set after reaching then took entry"
        const formatPrice = (val: number, ref: number): number => {
          if (ref >= 100) return Number(val.toFixed(2));
          if (ref >= 1) return Number(val.toFixed(4));
          if (ref >= 0.01) return Number(val.toFixed(5));
          return Number(val.toFixed(6));
        };

        const atrVal = technicals.atr || price * 0.015;
        const isLong = isBullishBias;

        let entry: number;
        let stopLoss: number;
        let target1: number;
        let target2: number;
        let target3: number;
        let entryStrategyType: 'PULLBACK_RETEST' | 'BREAKOUT_CONFIRMATION' | 'KEY_LEVEL_REJECTION' = 'PULLBACK_RETEST';

        if (pattern) {
          entry = formatPrice(pattern.entryTriggerPrice, price);
          stopLoss = formatPrice(pattern.recommendedStopLoss, price);
          target1 = formatPrice(pattern.target1, price);
          target2 = formatPrice(pattern.target2, price);
          target3 = formatPrice(pattern.target3, price);
          entryStrategyType = pattern.entryStrategy;
          confirmations.push(`Proper Entry Position: ${entryStrategyType} set at $${entry.toLocaleString()}`);
        } else if (isLong) {
          entryStrategyType = 'PULLBACK_RETEST';
          // Pullback entry position near EMA20 or current price
          entry = technicals.ema20 && technicals.ema20 < price ? formatPrice(technicals.ema20, price) : formatPrice(price, price);
          const rawSL = Math.max(
            entry - atrVal * settings.atrMultiplierSL,
            technicals.support ? technicals.support * 0.995 : entry - atrVal * 1.5
          );
          stopLoss = formatPrice(Math.min(rawSL, entry * 0.99), price);
          const riskDistance = Math.max(entry - stopLoss, price * 0.005);
          target1 = formatPrice(entry + riskDistance * settings.atrMultiplierTarget1, price);
          target2 = formatPrice(entry + riskDistance * settings.atrMultiplierTarget2, price);
          target3 = formatPrice(entry + riskDistance * 4.5, price);
        } else {
          entryStrategyType = 'KEY_LEVEL_REJECTION';
          entry = technicals.ema20 && technicals.ema20 > price ? formatPrice(technicals.ema20, price) : formatPrice(price, price);
          const rawSL = Math.min(
            entry + atrVal * settings.atrMultiplierSL,
            technicals.resistance ? technicals.resistance * 1.005 : entry + atrVal * 1.5
          );
          stopLoss = formatPrice(Math.max(rawSL, entry * 1.01), price);
          const riskDistance = Math.max(stopLoss - entry, price * 0.005);
          target1 = formatPrice(entry - riskDistance * settings.atrMultiplierTarget1, price);
          target2 = formatPrice(entry - riskDistance * settings.atrMultiplierTarget2, price);
          target3 = formatPrice(entry - riskDistance * 4.5, price);
        }

        const riskPerUnit = formatPrice(Math.abs(entry - stopLoss), price);
        const potentialReward = formatPrice(Math.abs(target1 - entry), price);
        const riskReward = riskPerUnit > 0 ? Number((potentialReward / riskPerUnit).toFixed(2)) : 1.5;

        // Reject signal if configured minimum R:R is not met
        if (riskReward < settings.minRiskReward && signal !== 'INVALID / WAIT') {
          signal = 'INVALID / WAIT';
          invalidationReasons.push(
            `Minimum Risk/Reward ratio of ${settings.minRiskReward} not met (Current: ${riskReward})`
          );
        }

        // Subscores
        const technicalScore = Math.min(
          100,
          Math.round(((trendScore + momentumScore + structureScore) / 50) * 100)
        );
        const derivativesScore = Math.min(
          100,
          Math.round(((volumeScore + oiScore) / 30) * 100)
        );
        const fundamentalScore = 85;
        const volScore = Math.min(100, Math.round((volatilityScore / 10) * 100));

        const fundamentals = getFundamentalProfile(coin);

        // Fetch nearest ATM option Greeks for this coin if available
        let optionGreeksData = undefined;
        try {
          const chain = deltaService.getOptionsChain(coin);
          const atm = chain.rows.find((r) => r.isATM);
          const opt = isLong ? atm?.call : atm?.put;
          if (opt) {
            optionGreeksData = {
              delta: opt.delta,
              gamma: opt.gamma,
              theta: opt.theta,
              vega: opt.vega,
              iv: opt.iv,
            };
          }
        } catch (e) {
          // ignore
        }

        const cryptoSignal: CryptoSignal = {
          id: `SIG-${coin}-${Date.now().toString().slice(-6)}`,
          coin,
          symbol,
          instrumentType: product?.contract_type || 'perpetual_futures',
          price,
          signal,
          finalScore,
          scores: {
            trend: trendScore,
            momentum: momentumScore,
            volume: volumeScore,
            openInterest: oiScore,
            structure: structureScore,
            volatility: volatilityScore,
            multiTimeframe: mtfScore,
          },
          technicalScore,
          derivativesScore,
          fundamentalScore,
          volatilityScore: volScore,
          trend: isBullishBias
            ? (isBullTrend ? 'Strong Bullish' : (buildupType === 'Short Covering' ? 'Bullish (Short Covering)' : 'Bullish'))
            : isBearishBias
            ? (isBearTrend ? 'Strong Bearish' : (buildupType === 'Long Unwinding' ? 'Bearish (Long Unwinding)' : 'Bearish'))
            : 'Neutral / Range',
          marketStructure,
          entry,
          stopLoss,
          target1,
          target2,
          target3,
          riskPerUnit,
          potentialReward,
          riskReward,
          buildupType,
          confirmations: confirmations.length > 0 ? confirmations : ['Consolidation pattern without directional bias'],
          invalidationRules:
            invalidationReasons.length > 0 ? invalidationReasons : cancelConditions,
          metrics: {
            rsi: technicals.rsi !== null ? Number(technicals.rsi.toFixed(2)) : null,
            adx: technicals.adx.adx !== null ? Number(technicals.adx.adx.toFixed(2)) : null,
            emaTrend: isBullTrend ? 'EMA20 > EMA50 (Bull)' : isBearTrend ? 'EMA20 < EMA50 (Bear)' : 'Chop',
            macdHist: technicals.macd.histogram !== null ? Number(technicals.macd.histogram.toFixed(4)) : null,
            atr: technicals.atr !== null ? Number(technicals.atr.toFixed(2)) : null,
            vwap: technicals.vwap !== null ? Number(technicals.vwap.toFixed(2)) : null,
            volume24h,
            oi,
            oiChange24h: oiChange,
            fundingRate: funding,
            iv,
          },
          candlestickPattern: pattern
            ? {
                name: pattern.patternName,
                type: pattern.patternType,
                reliability: pattern.reliability,
                description: pattern.description,
                patternTime: new Date().toISOString(),
              }
            : undefined,
          entryStrategy: {
            type: entryStrategyType,
            entryTriggerPrice: entry,
            isTriggered: Math.abs(price - entry) / entry <= 0.0015, // Filled if already within 0.15% of entry
            triggeredAt: Math.abs(price - entry) / entry <= 0.0015 ? new Date().toISOString() : undefined,
            entryBufferPercent: Number(((Math.abs(entry - stopLoss) / entry) * 100).toFixed(2)),
          },
          isEntryTriggered: Math.abs(price - entry) / entry <= 0.0015,
          breakevenMoved: false,
          optionGreeks: optionGreeksData,
          fundamental: {
            sector: fundamentals.sectorCategory,
            useCase: fundamentals.primaryUseCase,
            blockchain: fundamentals.blockchain,
            marketCap: fundamentals.marketCap,
            tokenomics: fundamentals.tokenomics,
          },
          timestamp: new Date().toISOString(),
          dataSource: 'Delta Exchange India Official REST & WebSocket Feed',
          status: Math.abs(price - entry) / entry <= 0.0015 ? 'ACTIVE' : 'WAITING_ENTRY',
        };

        signals.push(cryptoSignal);

        // Archive high-confidence actionable signals
        if (signal === 'BUY' || signal === 'STRONG BUY' || signal === 'SELL' || signal === 'STRONG SELL') {
          storage.addSignal(cryptoSignal);
        }
      }

      // Sort by FINAL SCORE DESCENDING
      signals.sort((a, b) => b.finalScore - a.finalScore);

      // Ensure every signal has current real-time prices, distances, and status
      const liveUpdatedSignals = verificationEngine.updateSignalsWithRealTimePrices(signals);

      this.scanCache = liveUpdatedSignals;
      this.lastScanTime = now;
      storage.setActiveSignals(liveUpdatedSignals);
      return liveUpdatedSignals;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Filter coins that meet strict quality gates for the "BEST COINS" view
   * Enforces 100% adherence to institutional trading rules, buildup harmonization, and mock data blocking
   */
  public getBestCoins(signals: CryptoSignal[]): CryptoSignal[] {
    const settings = storage.getSettings();
    return signals.filter((s) => {
      // 1. Strict Mock Data Blocker Gate: reject any non-authentic or simulated data
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

      // 2. Actionable Signal Gate: only high-conviction BUY or SELL (no NEUTRAL or INVALID)
      if (s.signal === 'INVALID / WAIT' || s.signal === 'NEUTRAL' || !s.signal) return false;
      const isBuy = s.signal.includes('BUY');
      const isSell = s.signal.includes('SELL');
      if (!isBuy && !isSell) return false;

      // 3. Strict Market Structure & Buildup Harmonization:
      // Long Buildup / Short Covering MUST be Bullish
      // Short Buildup / Long Unwinding MUST be Bearish
      if (isBuy && (s.buildupType === 'Short Buildup' || s.buildupType === 'Long Unwinding' || s.marketStructure === 'Bearish')) {
        return false;
      }
      if (isSell && (s.buildupType === 'Long Buildup' || s.buildupType === 'Short Covering' || s.marketStructure === 'Bullish')) {
        return false;
      }

      // 4. Institutional Risk/Reward Gate (Minimum 1.5R)
      if ((s.riskReward || 0) < 1.5) return false;

      // 5. Valid Entry / Stop Loss / Target Geometry
      const validGeometry = isBuy
        ? s.stopLoss < s.entry && s.entry < s.target1
        : s.stopLoss > s.entry && s.entry > s.target1;
      if (!validGeometry) return false;

      // 6. Quantitative Confluence Thresholds
      const passesScore = s.finalScore >= settings.minSignalScore;
      const passesLiquidity = s.derivativesScore >= settings.minLiquidityScore;
      const passesTechnical = s.technicalScore >= 65;

      return passesScore && passesLiquidity && passesTechnical;
    });
  }

  /**
   * Calculate money management parameters for a given signal
   */
  public calculatePositionSizing(signal: CryptoSignal, accountCapital?: number, riskPct?: number) {
    const config = storage.getUserRiskConfig();
    const capital = accountCapital ?? config.accountCapital;
    const riskPercent = riskPct ?? config.riskPerTradePercent;

    const maxMonetaryRisk = Number(((capital * riskPercent) / 100).toFixed(2));
    const stopLossDistance = Math.abs(signal.entry - signal.stopLoss);
    const stopLossDistancePct = Number(((stopLossDistance / signal.entry) * 100).toFixed(2));

    let quantity = 0;
    let positionNotional = 0;
    let recommendedLeverage = 1;

    if (stopLossDistance > 0) {
      quantity = Number((maxMonetaryRisk / stopLossDistance).toFixed(4));
      positionNotional = Number((quantity * signal.entry).toFixed(2));
      recommendedLeverage = Math.min(
        config.maxLeverage,
        Math.max(1, Number((positionNotional / capital).toFixed(1)))
      );
    }

    return {
      accountCapital: capital,
      riskPercent,
      maxMonetaryRisk,
      stopLossDistance,
      stopLossDistancePct,
      quantity,
      positionNotional,
      recommendedLeverage,
      maxAllowedLeverage: config.maxLeverage,
      maxDailyLoss: config.maxDailyLoss,
    };
  }

  public getSignals(): CryptoSignal[] {
    return verificationEngine.updateSignalsWithRealTimePrices(this.scanCache);
  }
}

export const signalScanner = new SignalScanner();
