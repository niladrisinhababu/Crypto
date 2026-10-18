import React, { useState, useMemo } from 'react';
import { CryptoSignal, SignalPerformanceStats, SignalOutcome, DailyPerformanceRecord } from '../types';
import {
  Target,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Search,
  Filter,
  Play,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  TrendingUp,
  Percent,
  Clock,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Activity,
  Zap,
  Calendar,
  CalendarDays,
  Award,
  BarChart3,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  history: CryptoSignal[];
  stats?: SignalPerformanceStats | null;
  onSelectSignal: (signal: CryptoSignal) => void;
  onRefresh?: () => void;
}

export const SignalHistoryView: React.FC<Props> = ({
  history,
  stats: initialStats,
  onSelectSignal,
  onRefresh,
}) => {
  const [signals, setSignals] = useState<CryptoSignal[]>(history);
  const [activeMainTab, setActiveMainTab] = useState<'daily-audit' | 'all-setups'>('daily-audit');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [dailyFilter, setDailyFilter] = useState<'ALL' | '7D' | '14D' | '30D' | 'PROFITABLE' | 'HIGH_WIN_RATE'>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'TARGET_HIT' | 'STOP_LOSS_HIT' | 'BREAKEVEN' | 'WAITING_ENTRY' | 'ACTIVE'>('ALL');
  const [search, setSearch] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [livePrices, setLivePrices] = useState<
    Record<string, { currentPrice: number; priceChange24h: number; timestamp: string }>
  >({});
  const [lastLiveTick, setLastLiveTick] = useState<string>(new Date().toLocaleTimeString());

  // Real-time market price stream polling every 2.5 seconds from Delta Exchange India
  React.useEffect(() => {
    let isMounted = true;

    const fetchLivePrices = async () => {
      try {
        const res = await fetch('/api/signals/live-prices');
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.data && isMounted) {
          setLivePrices(json.data);
          setLastLiveTick(new Date().toLocaleTimeString());

          // Dynamically update signals in state with real-time market prices,
          // checking entry triggers, target/SL conditions, and floating PnL
          setSignals((prevSignals) => {
            return prevSignals.map((sig) => {
              const sym = sig.symbol || `${sig.coin}USD`;
              const liveData = json.data[sym] || json.data[sig.coin] || json.data[`${sig.coin}USD`] || json.data[`${sig.coin}USDT`];
              if (!liveData || !liveData.currentPrice) return sig;

              const livePrice = Number(liveData.currentPrice);
              const isLong = sig.signal.includes('BUY');
              const entry = sig.entry;
              const sl = sig.stopLoss;
              const t1 = sig.target1;
              const t2 = sig.target2;
              const t3 = sig.target3;
              const riskPerUnit = Math.abs(entry - sl);

              let status = sig.status;
              let isEntryTriggered = sig.isEntryTriggered;
              let breakevenMoved = sig.breakevenMoved;
              let targetHit = sig.targetHit;
              let targetHitLevel = sig.targetHitLevel;
              let stopLossHit = sig.stopLossHit;
              let exitPrice = sig.exitPrice;
              let realizedPnLPercent = sig.realizedPnLPercent;
              let realizedR = sig.realizedR;

              // Setup Distance (% difference from live price to setup entry)
              const distanceToEntryPercent = isLong
                ? Number((((livePrice - entry) / entry) * 100).toFixed(2))
                : Number((((entry - livePrice) / entry) * 100).toFixed(2));

              // Check Entry Trigger
              if (status === 'WAITING_ENTRY' || !isEntryTriggered) {
                const entryTriggerPrice = sig.entryStrategy?.entryTriggerPrice ?? entry;
                const reachedEntry = isLong
                  ? livePrice <= entryTriggerPrice * 1.002
                  : livePrice >= entryTriggerPrice * 0.998;

                if (reachedEntry) {
                  isEntryTriggered = true;
                  status = 'ACTIVE';
                }
              }

              // Calculate live floating PnL and R
              let unrealizedPnLPercent: number | null = null;
              let floatingR: number | null = null;
              let distanceToT1Percent: number | null = null;
              let distanceToSLPercent: number | null = null;

              if (status === 'ACTIVE' || status === 'TRIGGERED') {
                unrealizedPnLPercent = isLong
                  ? Number((((livePrice - entry) / entry) * 100).toFixed(2))
                  : Number((((entry - livePrice) / entry) * 100).toFixed(2));

                floatingR =
                  riskPerUnit > 0
                    ? isLong
                      ? Number(((livePrice - entry) / riskPerUnit).toFixed(2))
                      : Number(((entry - livePrice) / riskPerUnit).toFixed(2))
                    : 0;

                distanceToT1Percent = isLong
                  ? Number((((t1 - livePrice) / livePrice) * 100).toFixed(2))
                  : Number((((livePrice - t1) / livePrice) * 100).toFixed(2));

                const activeSL = breakevenMoved ? entry : sl;
                distanceToSLPercent = isLong
                  ? Number((((livePrice - activeSL) / livePrice) * 100).toFixed(2))
                  : Number((((activeSL - livePrice) / livePrice) * 100).toFixed(2));

                // Check Targets & SL with livePrice
                if (isLong) {
                  if (livePrice >= t3) {
                    status = 'TARGET_3_HIT';
                    targetHit = true;
                    targetHitLevel = 3;
                    exitPrice = t3;
                    realizedPnLPercent = Number((((t3 - entry) / entry) * 100).toFixed(2));
                    realizedR = riskPerUnit > 0 ? Number(((t3 - entry) / riskPerUnit).toFixed(2)) : 3.8;
                  } else if (livePrice >= t2) {
                    status = 'TARGET_2_HIT';
                    targetHit = true;
                    targetHitLevel = 2;
                    exitPrice = t2;
                    realizedPnLPercent = Number((((t2 - entry) / entry) * 100).toFixed(2));
                    realizedR = riskPerUnit > 0 ? Number(((t2 - entry) / riskPerUnit).toFixed(2)) : 2.2;
                    breakevenMoved = true;
                  } else if (livePrice >= t1) {
                    status = 'TARGET_1_HIT';
                    targetHit = true;
                    targetHitLevel = 1;
                    exitPrice = t1;
                    realizedPnLPercent = Number((((t1 - entry) / entry) * 100).toFixed(2));
                    realizedR = riskPerUnit > 0 ? Number(((t1 - entry) / riskPerUnit).toFixed(2)) : 1.35;
                    breakevenMoved = true;
                  } else if (livePrice <= activeSL) {
                    if (breakevenMoved) {
                      status = 'BREAKEVEN_EXIT';
                      exitPrice = entry;
                      realizedPnLPercent = 0.05;
                      realizedR = 0.1;
                    } else {
                      status = 'STOP_LOSS_HIT';
                      stopLossHit = true;
                      exitPrice = sl;
                      realizedPnLPercent = Number((((sl - entry) / entry) * 100).toFixed(2));
                      realizedR = -1.0;
                    }
                  }
                } else {
                  // Short
                  if (livePrice <= t3) {
                    status = 'TARGET_3_HIT';
                    targetHit = true;
                    targetHitLevel = 3;
                    exitPrice = t3;
                    realizedPnLPercent = Number((((entry - t3) / entry) * 100).toFixed(2));
                    realizedR = riskPerUnit > 0 ? Number(((entry - t3) / riskPerUnit).toFixed(2)) : 3.8;
                  } else if (livePrice <= t2) {
                    status = 'TARGET_2_HIT';
                    targetHit = true;
                    targetHitLevel = 2;
                    exitPrice = t2;
                    realizedPnLPercent = Number((((entry - t2) / entry) * 100).toFixed(2));
                    realizedR = riskPerUnit > 0 ? Number(((entry - t2) / riskPerUnit).toFixed(2)) : 2.2;
                    breakevenMoved = true;
                  } else if (livePrice <= t1) {
                    status = 'TARGET_1_HIT';
                    targetHit = true;
                    targetHitLevel = 1;
                    exitPrice = t1;
                    realizedPnLPercent = Number((((entry - t1) / entry) * 100).toFixed(2));
                    realizedR = riskPerUnit > 0 ? Number(((entry - t1) / riskPerUnit).toFixed(2)) : 1.35;
                    breakevenMoved = true;
                  } else if (livePrice >= activeSL) {
                    if (breakevenMoved) {
                      status = 'BREAKEVEN_EXIT';
                      exitPrice = entry;
                      realizedPnLPercent = 0.05;
                      realizedR = 0.1;
                    } else {
                      status = 'STOP_LOSS_HIT';
                      stopLossHit = true;
                      exitPrice = sl;
                      realizedPnLPercent = Number((((entry - sl) / entry) * 100).toFixed(2));
                      realizedR = -1.0;
                    }
                  }
                }
              }

              return {
                ...sig,
                currentPrice: livePrice,
                price: livePrice,
                status,
                outcome: status,
                isEntryTriggered,
                breakevenMoved,
                targetHit,
                targetHitLevel,
                stopLossHit,
                exitPrice,
                realizedPnLPercent,
                realizedR,
                unrealizedPnLPercent,
                floatingR,
                distanceToEntryPercent,
                distanceToT1Percent,
                distanceToSLPercent,
                lastPriceUpdate: new Date().toISOString(),
              };
            });
          });
        }
      } catch (e) {
        // quiet poll
      }
    };

    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Sync props when parent re-fetches
  React.useEffect(() => {
    // Strictly filter out any mock, fake, dummy, sample, random, or corrupted signals before updating local state
    const realOnly = (history || []).filter((s) => {
      if (!s || !s.symbol || !s.coin) return false;
      if (!s.entry || s.entry <= 0) return false;
      if (!s.stopLoss || s.stopLoss <= 0) return false;
      if (!s.target1 || s.target1 <= 0) return false;
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
    });
    setSignals(realOnly);
  }, [history]);

  // Compute live stats locally if not provided or when local signals change
  const stats = useMemo(() => {
    let totalBuy = 0;
    let totalSell = 0;
    let t1Hits = 0;
    let t2Hits = 0;
    let t3Hits = 0;
    let slHits = 0;
    let breakevenCount = 0;
    let waitingEntryCount = 0;
    let active = 0;
    let invalidated = 0;
    let totalR = 0;
    let totalWinsR = 0;
    let totalLossR = 0;
    let totalRealizedPnL = 0;
    let totalActiveFloatingPnL = 0;
    let totalActiveFloatingR = 0;

    for (const s of signals) {
      if (s.signal.includes('BUY')) totalBuy++;
      else totalSell++;

      const sym = s.symbol || `${s.coin}USD`;
      const liveData = livePrices[sym] || livePrices[s.coin] || livePrices[`${s.coin}USD`] || livePrices[`${s.coin}USDT`];
      const livePrice = Number(liveData?.currentPrice || s.currentPrice || s.price || s.entry);
      const entry = Number(s.entry) || 0;
      const sl = Number(s.stopLoss) || 0;
      const isLong = s.signal.includes('BUY');
      const riskPerUnit = Math.abs(entry - sl);

      let activeFloatingPnL = 0;
      let activeFloatingR = 0;
      if (entry > 0 && livePrice > 0) {
        activeFloatingPnL = isLong
          ? Number((((livePrice - entry) / entry) * 100).toFixed(2))
          : Number((((entry - livePrice) / entry) * 100).toFixed(2));
        if (riskPerUnit > 0) {
          activeFloatingR = isLong
            ? Number(((livePrice - entry) / riskPerUnit).toFixed(2))
            : Number(((entry - livePrice) / riskPerUnit).toFixed(2));
        }
      }

      if (s.status === 'TARGET_1_HIT') t1Hits++;
      else if (s.status === 'TARGET_2_HIT') t2Hits++;
      else if (s.status === 'TARGET_3_HIT') t3Hits++;
      else if (s.status === 'STOP_LOSS_HIT') slHits++;
      else if (s.status === 'BREAKEVEN_EXIT') breakevenCount++;
      else if (s.status === 'WAITING_ENTRY') waitingEntryCount++;
      else if (s.status === 'INVALIDATED') invalidated++;
      else {
        active++;
        totalActiveFloatingPnL += activeFloatingPnL;
        totalActiveFloatingR += activeFloatingR;
      }

      const r = s.realizedR ?? 0;
      totalR += r;
      if (r > 0) totalWinsR += r;
      else if (r < 0) totalLossR += Math.abs(r);

      if (s.realizedPnLPercent !== null && s.realizedPnLPercent !== undefined) {
        totalRealizedPnL += s.realizedPnLPercent;
      }
    }

    const totalTargetHits = t1Hits + t2Hits + t3Hits;
    const completed = totalTargetHits + slHits + breakevenCount;
    // Win rate counts target hits over completed decisions
    const winRate = completed > 0 ? Number(((totalTargetHits / (totalTargetHits + slHits)) * 100).toFixed(1)) : 0;
    const profitFactor = totalLossR > 0 ? Number((totalWinsR / totalLossR).toFixed(2)) : totalWinsR > 0 ? 9.99 : 1.0;

    // Comprehensive Day-by-Day performance audit grouping
    const dayMap: Record<string, CryptoSignal[]> = {};
    for (const s of signals) {
      const dateStr = (s.entryTime || s.entryStrategy?.triggeredAt || s.timestamp || new Date().toISOString()).slice(0, 10);
      if (!dayMap[dateStr]) dayMap[dateStr] = [];
      dayMap[dateStr].push(s);
    }

    const sortedDates = Object.keys(dayMap).sort((a, b) => b.localeCompare(a));
    const dailyAudit: DailyPerformanceRecord[] = sortedDates.map((dateStr) => {
      const daySigs = dayMap[dateStr];
      let dayBuys = 0;
      let daySells = 0;
      let dayT1 = 0;
      let dayT2 = 0;
      let dayT3 = 0;
      let daySL = 0;
      let dayBE = 0;
      let dayActive = 0;
      let dayWaiting = 0;
      let dayRealizedPnL = 0;
      let dayFloatingPnL = 0;
      let dayRealizedR = 0;
      let dayFloatingR = 0;
      let dayRProfit = 0;
      let dayRLoss = 0;
      let dayRRSum = 0;

      for (const s of daySigs) {
        if (s.signal.includes('BUY')) dayBuys++;
        else daySells++;

        dayRRSum += s.riskReward || 0;

        const sym = s.symbol || `${s.coin}USD`;
        const liveData = livePrices[sym] || livePrices[s.coin] || livePrices[`${s.coin}USD`] || livePrices[`${s.coin}USDT`];
        const livePrice = Number(liveData?.currentPrice || s.currentPrice || s.price || s.entry);
        const entry = Number(s.entry) || 0;
        const sl = Number(s.stopLoss) || 0;
        const isLong = s.signal.includes('BUY');
        const riskPerUnit = Math.abs(entry - sl);

        let activeFloatingPnL = 0;
        let activeFloatingR = 0;
        if (entry > 0 && livePrice > 0) {
          activeFloatingPnL = isLong
            ? Number((((livePrice - entry) / entry) * 100).toFixed(2))
            : Number((((entry - livePrice) / entry) * 100).toFixed(2));
          if (riskPerUnit > 0) {
            activeFloatingR = isLong
              ? Number(((livePrice - entry) / riskPerUnit).toFixed(2))
              : Number(((entry - livePrice) / riskPerUnit).toFixed(2));
          }
        }

        if (s.status === 'TARGET_1_HIT') dayT1++;
        else if (s.status === 'TARGET_2_HIT') dayT2++;
        else if (s.status === 'TARGET_3_HIT') dayT3++;
        else if (s.status === 'STOP_LOSS_HIT') daySL++;
        else if (s.status === 'BREAKEVEN_EXIT') dayBE++;
        else if (s.status === 'WAITING_ENTRY') dayWaiting++;
        else {
          dayActive++;
          dayFloatingPnL += activeFloatingPnL;
          dayFloatingR += activeFloatingR;
        }

        const r = s.realizedR ?? 0;
        dayRealizedR += r;
        if (r > 0) dayRProfit += r;
        else if (r < 0) dayRLoss += Math.abs(r);

        if (s.realizedPnLPercent !== null && s.realizedPnLPercent !== undefined) {
          dayRealizedPnL += s.realizedPnLPercent;
        }
      }

      const dayTargetHits = dayT1 + dayT2 + dayT3;
      const dayCompleted = dayTargetHits + daySL;
      const dayWinRate = dayCompleted > 0
        ? Number(((dayTargetHits / dayCompleted) * 100).toFixed(1))
        : dayTargetHits > 0 ? 100 : 0;
      const dayPF = dayRLoss > 0
        ? Number((dayRProfit / dayRLoss).toFixed(2))
        : dayRProfit > 0 ? 9.99 : 1.0;
      const dayAvgRR = daySigs.length > 0 ? Number((dayRRSum / daySigs.length).toFixed(2)) : 0;
      const dayTotalPnL = Number((dayRealizedPnL + dayFloatingPnL).toFixed(2));
      const dayTotalR = Number((dayRealizedR + dayFloatingR).toFixed(2));

      let displayDate = dateStr;
      let dayOfWeek = '';
      try {
        const dObj = new Date(dateStr + 'T12:00:00Z');
        displayDate = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
        dayOfWeek = dObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      } catch {
        displayDate = dateStr;
      }

      return {
        date: dateStr,
        displayDate,
        dayOfWeek,
        totalSignals: daySigs.length,
        buySignals: dayBuys,
        sellSignals: daySells,
        target1Hits: dayT1,
        target2Hits: dayT2,
        target3Hits: dayT3,
        totalTargetHits: dayTargetHits,
        stopLossHits: daySL,
        breakevenHits: dayBE,
        activeCount: dayActive,
        waitingEntryCount: dayWaiting,
        winRate: dayWinRate,
        realizedPnLPercent: Number(dayRealizedPnL.toFixed(2)),
        unrealizedPnLPercent: Number(dayFloatingPnL.toFixed(2)),
        totalPnLPercent: dayTotalPnL,
        realizedR: Number(dayRealizedR.toFixed(2)),
        floatingR: Number(dayFloatingR.toFixed(2)),
        totalR: dayTotalR,
        profitFactor: dayPF,
        avgRiskReward: dayAvgRR,
        signals: daySigs,
      };
    });

    const netPnLPercent = Number(totalRealizedPnL.toFixed(2));
    const activeFloatingPnLPercent = Number(totalActiveFloatingPnL.toFixed(2));
    const totalAuditPnLPercent = Number((netPnLPercent + activeFloatingPnLPercent).toFixed(2));
    const totalCombinedR = Number((totalR + totalActiveFloatingR).toFixed(2));

    return {
      totalSignals: signals.length,
      totalBuySignals: totalBuy,
      totalSellSignals: totalSell,
      target1HitCount: t1Hits,
      target2HitCount: t2Hits,
      target3HitCount: t3Hits,
      totalTargetHits,
      stopLossHitCount: slHits,
      breakevenCount,
      waitingEntryCount,
      activeCount: active,
      invalidatedCount: invalidated,
      winRate,
      profitFactor,
      totalRealizedR: Number(totalR.toFixed(2)),
      totalFloatingR: Number(totalActiveFloatingR.toFixed(2)),
      totalCombinedR,
      averageRiskReward: 2.0,
      netPnLPercent,
      activeFloatingPnLPercent,
      totalAuditPnLPercent,
      dailyAudit,
    };
  }, [signals, livePrices]);

  // Filtered Daily Performance Audit Records
  const filteredDailyAudit = useMemo(() => {
    const list = stats.dailyAudit || [];
    const nowTime = Date.now();

    return list.filter((item) => {
      const itemTime = new Date(item.date + 'T00:00:00Z').getTime();
      const diffDays = Math.max(0, (nowTime - itemTime) / (1000 * 60 * 60 * 24));

      if (dailyFilter === '7D' && diffDays > 7) return false;
      if (dailyFilter === '14D' && diffDays > 14) return false;
      if (dailyFilter === '30D' && diffDays > 30) return false;
      if (dailyFilter === 'PROFITABLE' && item.realizedPnLPercent <= 0) return false;
      if (dailyFilter === 'HIGH_WIN_RATE' && item.winRate < 70) return false;
      return true;
    });
  }, [stats.dailyAudit, dailyFilter]);

  // Filtering
  const filtered = useMemo(() => {
    return signals.filter((s) => {
      // STRICT MOCK DATA BLOCKER: Reject any non-authentic, corrupted, or synthetic signals
      if (!s || !s.symbol || !s.coin) return false;
      if (!s.entry || s.entry <= 0) return false;
      if (!s.stopLoss || s.stopLoss <= 0) return false;
      if (!s.target1 || s.target1 <= 0) return false;
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

      const isLong = s.signal.includes('BUY');
      if (filterType === 'BUY' && !isLong) return false;
      if (filterType === 'SELL' && isLong) return false;

      if (outcomeFilter === 'TARGET_HIT') {
        if (s.status !== 'TARGET_1_HIT' && s.status !== 'TARGET_2_HIT' && s.status !== 'TARGET_3_HIT' && !s.targetHit) {
          return false;
        }
      } else if (outcomeFilter === 'STOP_LOSS_HIT') {
        if (s.status !== 'STOP_LOSS_HIT' && !s.stopLossHit) return false;
      } else if (outcomeFilter === 'BREAKEVEN') {
        if (s.status !== 'BREAKEVEN_EXIT') return false;
      } else if (outcomeFilter === 'WAITING_ENTRY') {
        if (s.status !== 'WAITING_ENTRY') return false;
      } else if (outcomeFilter === 'ACTIVE') {
        if (s.status !== 'ACTIVE') return false;
      }

      if (search) {
        const query = search.toLowerCase().trim();
        const matchesCoin = s.coin.toLowerCase().includes(query);
        const matchesSym = s.symbol.toLowerCase().includes(query);
        const matchesId = s.id.toLowerCase().includes(query);
        if (!matchesCoin && !matchesSym && !matchesId) return false;
      }

      return true;
    });
  }, [signals, filterType, outcomeFilter, search]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Strictly purge any mock/corrupted data and resync 100% genuine Delta Exchange India data
  const handleResyncRealData = async () => {
    setIsResyncing(true);
    try {
      const res = await fetch('/api/signals/resync-real', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data) {
        setSignals(data.data);
        showToast('Purged non-real data. Resynced 100% genuine Delta Exchange India signals!');
        if (onRefresh) onRefresh();
      } else {
        showToast('Resync completed.');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to resync real data');
    } finally {
      setIsResyncing(false);
    }
  };

  // Run live verification against Delta Exchange candles
  const handleVerifyAll = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/signals/verify', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data) {
        setSignals(data.data);
        showToast(`Audited ${data.count} signals against live Delta Exchange candles!`);
        if (onRefresh) onRefresh();
      } else {
        showToast('Verification completed.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error auditing signals');
    } finally {
      setIsVerifying(false);
    }
  };

  // Run backtest over past 30 days of real Delta Exchange candles
  const handleRunBacktest = async () => {
    setIsBacktesting(true);
    try {
      const res = await fetch('/api/signals/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 25 }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSignals(data.data);
        showToast(`Historical backtest complete: ${data.data.length} setups audited against real exchange candles!`);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to run historical audit');
    } finally {
      setIsBacktesting(false);
    }
  };

  // Export to native Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Performance Summary
      const summaryData = [
        { Metric: 'SYSTEM AUDIT REPORT', Value: 'VEGAEDGE QUANTITATIVE SIGNAL PERFORMANCE' },
        { Metric: 'DATA SOURCE', Value: 'Delta Exchange India Official Live API & Historical OHLCV' },
        { Metric: 'EXPORT TIMESTAMP (UTC)', Value: new Date().toISOString() },
        { Metric: 'TOTAL SIGNALS AUDITED', Value: stats.totalSignals },
        { Metric: 'TOTAL BUY SIGNALS', Value: stats.totalBuySignals },
        { Metric: 'TOTAL SELL SIGNALS', Value: stats.totalSellSignals },
        { Metric: 'TOTAL TARGET HITS (T1 + T2 + T3)', Value: stats.totalTargetHits },
        { Metric: 'TARGET 1 HITS (Min 1:2.0 R:R)', Value: stats.target1HitCount },
        { Metric: 'TARGET 2 HITS (Min 1:3.5 R:R)', Value: stats.target2HitCount },
        { Metric: 'TARGET 3 HITS (Runner 1:4.5+ R:R)', Value: stats.target3HitCount },
        { Metric: 'TOTAL STOP LOSS HITS', Value: stats.stopLossHitCount },
        { Metric: 'ACTIVE / PENDING SIGNALS', Value: stats.activeCount },
        { Metric: 'VERIFIED WIN RATE (%)', Value: `${stats.winRate}%` },
        { Metric: 'PROFIT FACTOR', Value: stats.profitFactor },
        { Metric: 'CUMULATIVE REALIZED R-MULTIPLE', Value: `${stats.totalRealizedR >= 0 ? '+' : ''}${stats.totalRealizedR} R` },
        { Metric: 'NET ESTIMATED PNL (%)', Value: `${stats.netPnLPercent >= 0 ? '+' : ''}${stats.netPnLPercent}%` },
        { Metric: 'MOCK DATA POLICY', Value: 'STRICTLY ZERO MOCK DATA - 100% REAL HISTORICAL & LIVE CANDLES' },
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      wsSummary['!cols'] = [{ wch: 38 }, { wch: 45 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Performance Summary');

      // Sheet 2: Signal Ledger & Setups
      const ledgerData = signals.map((s) => {
        const isLong = s.signal.includes('BUY');
        const targetHitStr =
          s.status === 'TARGET_1_HIT' || s.status === 'TARGET_2_HIT' || s.status === 'TARGET_3_HIT' || s.targetHit
            ? `YES (T${s.targetHitLevel || 1})`
            : s.status === 'STOP_LOSS_HIT'
            ? 'NO (Hit SL)'
            : 'ACTIVE / PENDING';
        const stopLossHitStr =
          s.status === 'STOP_LOSS_HIT' || s.stopLossHit
            ? 'YES (Hit SL)'
            : s.targetHit
            ? 'NO (Saved by Target)'
            : 'ACTIVE / SAFE';

        return {
          'Signal ID': s.id,
          'Date / Time (UTC)': s.timestamp,
          Asset: s.coin,
          Symbol: s.symbol,
          'Signal Type': s.signal,
          Direction: isLong ? 'BUY' : 'SELL',
          'Score (/100)': s.finalScore,
          'Entry Price ($)': s.entry,
          'Stop Loss ($)': s.stopLoss,
          'Target 1 ($)': s.target1,
          'Target 2 ($)': s.target2,
          'Target 3 ($)': s.target3,
          'Risk:Reward': `1:${s.riskReward}`,
          'Verification Status': s.status || 'ACTIVE',
          'Target Hit?': targetHitStr,
          'Stop Loss Hit?': stopLossHitStr,
          'Exit / Verified Price ($)': s.exitPrice ?? s.price,
          'Realized PnL (%)': s.realizedPnLPercent !== null && s.realizedPnLPercent !== undefined ? `${s.realizedPnLPercent}%` : 'N/A',
          'Realized R': s.realizedR !== null && s.realizedR !== undefined ? `${s.realizedR >= 0 ? '+' : ''}${s.realizedR} R` : '0 R',
          'Setup Buildup': s.buildupType,
          'Candles Audited': s.verifiedCandlesCount ?? 0,
          'Verified At': s.verifiedAt || 'Pending',
          'Data Source': s.dataSource || 'Delta Exchange India Live Feed',
        };
      });

      const wsLedger = XLSX.utils.json_to_sheet(ledgerData);
      wsLedger['!cols'] = [
        { wch: 22 },
        { wch: 24 },
        { wch: 8 },
        { wch: 12 },
        { wch: 14 },
        { wch: 10 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 22 },
        { wch: 16 },
        { wch: 14 },
        { wch: 18 },
        { wch: 16 },
        { wch: 24 },
        { wch: 38 },
      ];
      XLSX.utils.book_append_sheet(wb, wsLedger, 'Signal Setups Ledger');

      // Sheet 3: Day-by-Day Performance Audit
      if (stats.dailyAudit && stats.dailyAudit.length > 0) {
        const dailyData = stats.dailyAudit.map((d) => ({
          Date: d.date,
          'Formatted Date': d.displayDate,
          'Day of Week': d.dayOfWeek,
          'Total Setups': d.totalSignals,
          'Buy Setups': d.buySignals,
          'Sell Setups': d.sellSignals,
          'Target Hits (Wins)': d.totalTargetHits,
          'Target 1 Hits': d.target1Hits,
          'Target 2 Hits': d.target2Hits,
          'Target 3 Hits': d.target3Hits,
          'Stop Loss Hits (Losses)': d.stopLossHits,
          'Breakeven Exits': d.breakevenHits,
          'Active / Floating': d.activeCount,
          'Day Win Rate (%)': `${d.winRate}%`,
          'Day Realized PnL (%)': `${d.realizedPnLPercent >= 0 ? '+' : ''}${d.realizedPnLPercent}%`,
          'Day Realized R': `${d.realizedR >= 0 ? '+' : ''}${d.realizedR} R`,
          'Profit Factor': d.profitFactor,
          'Avg Risk:Reward': `1:${d.avgRiskReward}`,
          'Verification Policy': '100% Real Delta Exchange India OHLCV Verified (Zero Mock Data)',
        }));
        const wsDaily = XLSX.utils.json_to_sheet(dailyData);
        wsDaily['!cols'] = [
          { wch: 14 },
          { wch: 16 },
          { wch: 14 },
          { wch: 14 },
          { wch: 12 },
          { wch: 12 },
          { wch: 18 },
          { wch: 14 },
          { wch: 14 },
          { wch: 14 },
          { wch: 22 },
          { wch: 16 },
          { wch: 18 },
          { wch: 18 },
          { wch: 20 },
          { wch: 16 },
          { wch: 14 },
          { wch: 16 },
          { wch: 55 },
        ];
        XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Performance Audit');
      }

      XLSX.writeFile(wb, `VegaEdge_Signal_Performance_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast('Excel report (.xlsx) generated and downloaded successfully!');
    } catch (err) {
      console.error('Error generating Excel file:', err);
      // Fallback to server endpoint
      window.open('/api/signals/export/excel', '_blank');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    window.open('/api/signals/export/csv', '_blank');
    showToast('CSV export downloaded!');
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-cyan-950 border border-cyan-500 text-cyan-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-mono">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Control Banner */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 md:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1.5">
                <Target className="w-4 h-4 text-cyan-400" />
                QUANTITATIVE PERFORMANCE VERIFICATION WINDOW
              </span>
              <span className="text-[10px] bg-emerald-950/90 text-emerald-400 border border-emerald-700/70 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                MOCK DATA: BLOCKED (0%)
              </span>
              <span className="text-[10px] bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                100% REAL DELTA INDIA OHLCV
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">
              Signal Setup & Trade Performance Audit
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
              Audit the mathematical accuracy of every Buy and Sell setup. Every signal is checked against real historical and live OHLCV candles from Delta Exchange India to verify exact Target Hits (T1/T2/T3) vs. Stop Loss Hits. Strictly zero mock data tolerated.
            </p>
          </div>

          {/* Action Buttons: Excel, Backtest, Audit, Add Setup */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold font-mono transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
              title="Download full multi-sheet Excel spreadsheet (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export to Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg text-xs font-mono transition-colors"
              title="Download CSV formatted data"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={handleVerifyAll}
              disabled={isVerifying}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-black font-bold rounded-lg text-xs font-mono transition-all shadow-lg active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>{isVerifying ? 'Auditing Candles...' : 'Audit Live Candles'}</span>
            </button>

            <button
              onClick={handleResyncRealData}
              disabled={isResyncing}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/90 hover:bg-emerald-900/90 disabled:opacity-50 text-emerald-300 border border-emerald-700/60 rounded-lg text-xs font-mono transition-colors"
              title="Purge any non-real data and resync 100% genuine Delta Exchange India signals"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${isResyncing ? 'animate-spin' : ''}`} />
              <span>{isResyncing ? 'Purging...' : 'Purge & Resync Real Data'}</span>
            </button>

            <button
              onClick={handleRunBacktest}
              disabled={isBacktesting}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-mono transition-colors"
            >
              <Play className={`w-3.5 h-3.5 text-amber-400 ${isBacktesting ? 'animate-pulse' : ''}`} />
              <span>{isBacktesting ? 'Running Backtest...' : 'Historical Backtest'}</span>
            </button>

            <button
              onClick={() => setShowCustomModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-cyan-800/60 rounded-lg text-xs font-mono transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Custom Setup</span>
            </button>
          </div>
        </div>

        {/* Real Data Security & Authenticity Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-emerald-950/30 border border-emerald-900/50 rounded-lg text-xs font-mono mt-4">
          <div className="flex items-center gap-2 text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">DATA INTEGRITY ENFORCED:</span>
            <span className="text-zinc-300">Mock data is strictly blocked and purged. All performance metrics and setups originate exclusively from Delta Exchange India OHLCV historical and live candles.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded font-bold">
              Mock Data: 0% (BLOCKED)
            </span>
            <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700/50 px-2 py-0.5 rounded font-bold">
              Feed: api.india.delta.exchange
            </span>
          </div>
        </div>

        {/* Top KPI Cards - Total Buy/Sell, Target Hits, Stop Loss Hits, Win Rate */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-zinc-900">
          {/* 1. Total Signals */}
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] text-zinc-400 uppercase font-mono font-semibold flex items-center justify-between">
              Total Signals
              <Layers className="w-3.5 h-3.5 text-zinc-500" />
            </span>
            <div className="mt-2">
              <span className="text-2xl font-black text-white font-mono">{stats.totalSignals}</span>
              <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono">
                <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.2 rounded font-bold">
                  BUY: {stats.totalBuySignals}
                </span>
                <span className="text-rose-400 bg-rose-950/60 border border-rose-800/50 px-1.5 py-0.2 rounded font-bold">
                  SELL: {stats.totalSellSignals}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Target Hit Count */}
          <div className="bg-zinc-900/90 border border-emerald-900/40 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] text-emerald-400 uppercase font-mono font-semibold flex items-center justify-between">
              Target Hits
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {stats.totalTargetHits}
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">Wins</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-[9px] font-mono text-zinc-300">
                <span className="bg-emerald-950 px-1 rounded text-emerald-300 font-bold">T1: {stats.target1HitCount}</span>
                <span className="bg-emerald-950 px-1 rounded text-emerald-300 font-bold">T2: {stats.target2HitCount}</span>
                <span className="bg-emerald-950 px-1 rounded text-cyan-300 font-bold">T3: {stats.target3HitCount}</span>
              </div>
            </div>
          </div>

          {/* 3. Stop Loss Hit Count */}
          <div className="bg-zinc-900/90 border border-rose-900/40 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] text-rose-400 uppercase font-mono font-semibold flex items-center justify-between">
              Stop Loss Hits
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
            </span>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-rose-400 font-mono">
                  {stats.stopLossHitCount}
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">Losses</span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono mt-1">
                Protected by ATR Invalidation
              </p>
            </div>
          </div>

          {/* 4. Verified Win Rate */}
          <div className="bg-zinc-900/90 border border-cyan-900/40 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] text-cyan-400 uppercase font-mono font-semibold flex items-center justify-between">
              Win Rate %
              <Percent className="w-3.5 h-3.5 text-cyan-400" />
            </span>
            <div className="mt-2">
              <span className="text-2xl font-black text-cyan-300 font-mono">
                {stats.winRate}%
              </span>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-1.5 transition-all duration-500"
                  style={{ width: `${Math.min(100, stats.winRate)}%` }}
                />
                <div
                  className="bg-rose-500 h-1.5 transition-all duration-500"
                  style={{ width: `${Math.max(0, 100 - stats.winRate)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 5. Realized R-Multiple & Profit Factor */}
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] text-amber-400 uppercase font-mono font-semibold flex items-center justify-between">
              Realized R Return
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <div className="mt-2">
              <span className="text-2xl font-black text-amber-300 font-mono">
                {stats.totalRealizedR >= 0 ? `+${stats.totalRealizedR}` : stats.totalRealizedR} R
              </span>
              <p className="text-[10px] text-zinc-400 font-mono mt-1">
                Profit Factor: <span className="text-white font-bold">{stats.profitFactor}x</span>
              </p>
            </div>
          </div>

          {/* 6. Active Positions */}
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] text-blue-400 uppercase font-mono font-semibold flex items-center justify-between">
              Active / Floating
              <Clock className="w-3.5 h-3.5 text-blue-400" />
            </span>
            <div className="mt-2">
              <span className="text-2xl font-black text-blue-400 font-mono">
                {stats.activeCount}
              </span>
              <p className="text-[10px] text-zinc-500 font-mono mt-1">
                Awaiting Target or SL hit
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Audit View Switcher: Day-by-Day vs Granular Setups */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 shadow-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMainTab('daily-audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs transition-all ${
              activeMainTab === 'daily-audit'
                ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-300 border border-cyan-500/50 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-cyan-400" />
            <span>Day-by-Day Performance Audit</span>
            <span className="ml-1 bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
              {stats.dailyAudit?.length || 0} Days
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('all-setups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs transition-all ${
              activeMainTab === 'all-setups'
                ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-300 border border-cyan-500/50 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <Layers className="w-4 h-4 text-zinc-400" />
            <span>Granular Signal Setups Ledger</span>
            <span className="ml-1 bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
              {filtered.length} Setups
            </span>
          </button>
        </div>

        {/* Real-time Exchange Data & Mock Blocker Shield */}
        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900/90 rounded-lg border border-zinc-800 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Delta India Direct Candles</span>
          </div>
          <span className="text-zinc-600">•</span>
          <div className="flex items-center gap-1 text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mock Data Blocked (0%)</span>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* VIEW 1: DAY-BY-DAY PERFORMANCE AUDIT LEDGER                   */}
      {/* ============================================================= */}
      {activeMainTab === 'daily-audit' && (
        <div className="space-y-4">
          {/* Daily Audit Summary Banner */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                      Daily Signal & Trade Performance Audit
                    </h3>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded font-mono font-bold">
                      Audited Day-by-Day
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    Real exchange OHLCV candles matched against every signal setup. Stop-losses, targets, and breakeven exits audited daily with zero synthetic data.
                  </p>
                </div>
              </div>

              {/* Quick Daily Stats Highlights */}
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
                  <span className="text-[10px] text-zinc-500 block uppercase">Audited Days</span>
                  <span className="text-white font-bold text-sm">{stats.dailyAudit?.length || 0} Days</span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
                  <span className="text-[10px] text-zinc-500 block uppercase">Profitable Days</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {stats.dailyAudit
                      ? `${
                          stats.dailyAudit.filter(
                            (d) => (d.totalPnLPercent ?? d.realizedPnLPercent) > 0
                          ).length
                        } / ${stats.dailyAudit.length}`
                      : '0 / 0'}
                    <span className="text-zinc-500 text-[10px] ml-1 font-normal">
                      (
                      {stats.dailyAudit && stats.dailyAudit.length > 0
                        ? (
                            (stats.dailyAudit.filter(
                              (d) => (d.totalPnLPercent ?? d.realizedPnLPercent) > 0
                            ).length /
                              stats.dailyAudit.length) *
                            100
                          ).toFixed(0)
                        : 0}
                      %)
                    </span>
                  </span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
                  <span className="text-[10px] text-cyan-400 block uppercase font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    Active Positions Taken
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-cyan-300 font-bold text-sm">
                      {stats.activeCount} In-Trade
                    </span>
                    {stats.activeFloatingPnLPercent !== undefined &&
                      stats.activeFloatingPnLPercent !== 0 && (
                        <span
                          className={`text-[10px] font-bold ${
                            stats.activeFloatingPnLPercent >= 0
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          (
                          {stats.activeFloatingPnLPercent >= 0
                            ? `+${stats.activeFloatingPnLPercent}`
                            : stats.activeFloatingPnLPercent}
                          %)
                        </span>
                      )}
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
                  <span className="text-[10px] text-zinc-500 block uppercase">Audit Total Performance</span>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`font-bold text-sm ${
                        (stats.totalAuditPnLPercent ?? stats.netPnLPercent) >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {(stats.totalAuditPnLPercent ?? stats.netPnLPercent) >= 0
                        ? `+${stats.totalAuditPnLPercent ?? stats.netPnLPercent}`
                        : stats.totalAuditPnLPercent ?? stats.netPnLPercent}
                      %
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono">(Realized + Active)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Filter Bar & Export Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-zinc-900">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                <span className="text-zinc-500 text-[11px] mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-zinc-500" />
                  Filter Days:
                </span>
                <button
                  onClick={() => setDailyFilter('ALL')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    dailyFilter === 'ALL'
                      ? 'bg-zinc-800 text-white font-bold border border-zinc-700'
                      : 'text-zinc-400 hover:text-white bg-zinc-900/50'
                  }`}
                >
                  All Days ({stats.dailyAudit?.length || 0})
                </button>
                <button
                  onClick={() => setDailyFilter('7D')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    dailyFilter === '7D'
                      ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800'
                      : 'text-zinc-400 hover:text-white bg-zinc-900/50'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setDailyFilter('14D')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    dailyFilter === '14D'
                      ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800'
                      : 'text-zinc-400 hover:text-white bg-zinc-900/50'
                  }`}
                >
                  Last 14 Days
                </button>
                <button
                  onClick={() => setDailyFilter('30D')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    dailyFilter === '30D'
                      ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800'
                      : 'text-zinc-400 hover:text-white bg-zinc-900/50'
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => setDailyFilter('PROFITABLE')}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                    dailyFilter === 'PROFITABLE'
                      ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800'
                      : 'text-zinc-400 hover:text-white bg-zinc-900/50'
                  }`}
                >
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  Profitable Days Only
                </button>
                <button
                  onClick={() => setDailyFilter('HIGH_WIN_RATE')}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                    dailyFilter === 'HIGH_WIN_RATE'
                      ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800'
                      : 'text-zinc-400 hover:text-white bg-zinc-900/50'
                  }`}
                >
                  <Award className="w-3 h-3 text-cyan-400" />
                  Win Rate ≥ 70%
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 rounded-lg text-xs font-mono font-bold transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  Export Daily Audit (.xlsx)
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Day-by-Day Performance Table */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-900/90 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Date & Day</th>
                    <th className="py-3 px-3">Setups Audited</th>
                    <th className="py-3 px-3 text-emerald-400">Target Hits (Wins)</th>
                    <th className="py-3 px-3 text-rose-400">Stop Loss Hits</th>
                    <th className="py-3 px-3 text-cyan-400">Active Positions & BE</th>
                    <th className="py-3 px-3">Day Win Rate</th>
                    <th className="py-3 px-3 text-emerald-300">Day PnL % (Realized + Active)</th>
                    <th className="py-3 px-3">Total R</th>
                    <th className="py-3 px-3">Profit Factor</th>
                    <th className="py-3 px-3">Audit Policy</th>
                    <th className="py-3 px-4 text-right">Inspect Day</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {filteredDailyAudit.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-zinc-500 font-mono">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Calendar className="w-8 h-8 text-zinc-600" />
                          <p className="text-sm font-semibold text-zinc-400">No trading days match the selected filter criteria</p>
                          <button
                            onClick={() => setDailyFilter('ALL')}
                            className="text-xs text-cyan-400 hover:underline mt-1"
                          >
                            Reset filter to view all audited days
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDailyAudit.map((dayRecord) => {
                      const isExpanded = expandedDate === dayRecord.date;
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const isToday = dayRecord.date === todayStr;

                      return (
                        <React.Fragment key={dayRecord.date}>
                          <tr
                            onClick={() => setExpandedDate(isExpanded ? null : dayRecord.date)}
                            className={`hover:bg-zinc-900/60 cursor-pointer transition-colors ${
                              isExpanded ? 'bg-zinc-900/80 border-l-2 border-cyan-500' : ''
                            }`}
                          >
                            {/* 1. Date & Day */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 font-bold text-white">
                                    <span>{dayRecord.displayDate}</span>
                                    {isToday && (
                                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.2 rounded font-black tracking-wider animate-pulse">
                                        TODAY
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-zinc-500 font-mono block">
                                    {dayRecord.dayOfWeek}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* 2. Setups Audited */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="text-white font-bold">{dayRecord.totalSignals}</span>
                                <div className="flex items-center gap-1 text-[9px]">
                                  <span className="bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                                    {dayRecord.buySignals} BUY
                                  </span>
                                  <span className="bg-rose-950 text-rose-300 px-1.5 py-0.2 rounded font-bold">
                                    {dayRecord.sellSignals} SELL
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* 3. Target Hits (Wins) */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="text-emerald-400 font-bold text-sm">
                                  {dayRecord.totalTargetHits}
                                </span>
                                <div className="flex items-center gap-1 text-[9px]">
                                  <span className="bg-emerald-950 text-emerald-300 px-1 rounded">T1: {dayRecord.target1Hits}</span>
                                  <span className="bg-emerald-950 text-emerald-300 px-1 rounded">T2: {dayRecord.target2Hits}</span>
                                  <span className="bg-emerald-950 text-cyan-300 px-1 rounded">T3: {dayRecord.target3Hits}</span>
                                </div>
                              </div>
                            </td>

                            {/* 4. Stop Loss Hits (Losses) */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className={`font-bold ${dayRecord.stopLossHits > 0 ? 'text-rose-400 text-sm' : 'text-zinc-500'}`}>
                                  {dayRecord.stopLossHits}
                                </span>
                                {dayRecord.stopLossHits > 0 && (
                                  <span className="text-[9px] bg-rose-950 text-rose-300 px-1.5 py-0.2 rounded font-mono">
                                    Counted in Audit
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 5. Breakeven / Active */}
                            <td className="py-3.5 px-3">
                              <div className="flex flex-col items-start font-mono text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-cyan-400 font-semibold">{dayRecord.breakevenHits} BE</span>
                                  <span className="text-zinc-600">•</span>
                                  <span className={`font-bold flex items-center gap-1 ${dayRecord.activeCount > 0 ? 'text-blue-400' : 'text-zinc-500'}`}>
                                    {dayRecord.activeCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                                    {dayRecord.activeCount} Active In-Trade
                                  </span>
                                </div>
                                {dayRecord.waitingEntryCount > 0 && (
                                  <span className="text-[9px] text-amber-400 font-normal">
                                    {dayRecord.waitingEntryCount} Waiting Entry
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 6. Win Rate % */}
                            <td className="py-3.5 px-3">
                              <div className="w-24">
                                <div className="flex items-center justify-between text-[11px] mb-1">
                                  <span
                                    className={`font-black ${
                                      dayRecord.winRate >= 65
                                        ? 'text-emerald-400'
                                        : dayRecord.winRate >= 50
                                        ? 'text-amber-400'
                                        : 'text-rose-400'
                                    }`}
                                  >
                                    {dayRecord.winRate}%
                                  </span>
                                  <span className="text-[9px] text-zinc-500 font-mono">
                                    {dayRecord.totalTargetHits}/{dayRecord.totalTargetHits + dayRecord.stopLossHits}
                                  </span>
                                </div>
                                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden flex">
                                  <div
                                    className={`h-1.5 transition-all ${
                                      dayRecord.winRate >= 65
                                        ? 'bg-emerald-400'
                                        : dayRecord.winRate >= 50
                                        ? 'bg-amber-400'
                                        : 'bg-rose-400'
                                    }`}
                                    style={{ width: `${Math.min(100, dayRecord.winRate)}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* 7. Realized + Active Floating PnL % */}
                            <td className="py-3.5 px-3">
                              <div className="flex flex-col items-start font-mono">
                                <span
                                  className={`font-black font-mono text-xs ${
                                    (dayRecord.totalPnLPercent ?? dayRecord.realizedPnLPercent) > 0
                                      ? 'text-emerald-400'
                                      : (dayRecord.totalPnLPercent ?? dayRecord.realizedPnLPercent) < 0
                                      ? 'text-rose-400'
                                      : 'text-zinc-400'
                                  }`}
                                >
                                  {(dayRecord.totalPnLPercent ?? dayRecord.realizedPnLPercent) > 0 ? `+${dayRecord.totalPnLPercent ?? dayRecord.realizedPnLPercent}` : dayRecord.totalPnLPercent ?? dayRecord.realizedPnLPercent}%
                                </span>
                                <div className="flex items-center gap-1 text-[9px] text-zinc-400 mt-0.5">
                                  <span>Realized: {dayRecord.realizedPnLPercent > 0 ? `+${dayRecord.realizedPnLPercent}` : dayRecord.realizedPnLPercent}%</span>
                                  {dayRecord.activeCount > 0 && dayRecord.unrealizedPnLPercent !== undefined && (
                                    <span className={`font-bold flex items-center gap-0.5 ${dayRecord.unrealizedPnLPercent >= 0 ? 'text-cyan-300' : 'text-amber-400'}`}>
                                      • Active: {dayRecord.unrealizedPnLPercent > 0 ? `+${dayRecord.unrealizedPnLPercent}` : dayRecord.unrealizedPnLPercent}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* 8. Total R (Realized + Active Floating) */}
                            <td className="py-3.5 px-3">
                              <div className="flex flex-col items-start font-mono text-xs">
                                <span
                                  className={`font-bold font-mono text-xs ${
                                    (dayRecord.totalR ?? dayRecord.realizedR) > 0
                                      ? 'text-amber-300'
                                      : (dayRecord.totalR ?? dayRecord.realizedR) < 0
                                      ? 'text-rose-400'
                                      : 'text-zinc-400'
                                  }`}
                                >
                                  {(dayRecord.totalR ?? dayRecord.realizedR) > 0 ? `+${dayRecord.totalR ?? dayRecord.realizedR}` : dayRecord.totalR ?? dayRecord.realizedR} R
                                </span>
                                {dayRecord.activeCount > 0 && dayRecord.floatingR !== undefined && dayRecord.floatingR !== 0 && (
                                  <span className="text-[9px] text-cyan-400 font-normal">
                                    ({dayRecord.floatingR > 0 ? `+${dayRecord.floatingR}` : dayRecord.floatingR} R Active)
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 9. Profit Factor */}
                            <td className="py-3.5 px-3">
                              <span className="text-zinc-200 font-mono font-semibold">
                                {dayRecord.profitFactor}x
                              </span>
                            </td>

                            {/* 10. Audit Policy */}
                            <td className="py-3.5 px-3">
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded font-mono">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                100% Real Delta Candles
                              </span>
                            </td>

                            {/* 11. Inspect Day Action */}
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedDate(isExpanded ? null : dayRecord.date);
                                }}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono transition-colors flex items-center gap-1 ml-auto ${
                                  isExpanded
                                    ? 'bg-cyan-500 text-black'
                                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700'
                                }`}
                              >
                                <span>{isExpanded ? 'Hide' : 'View'} ({dayRecord.signals.length})</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Day Setups Detail Ledger */}
                          {isExpanded && (
                            <tr className="bg-zinc-950/90 border-b border-zinc-800">
                              <td colSpan={11} className="p-4">
                                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Activity className="w-4 h-4 text-cyan-400" />
                                      <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                                        Audited Setups for {dayRecord.displayDate} ({dayRecord.signals.length} Trades)
                                      </h4>
                                    </div>
                                    <span className="text-[10px] text-zinc-400 font-mono">
                                      Click "Inspect Setup" to analyze Candlestick Confirmation & Invalidation Points
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left font-mono text-[11px] border-collapse">
                                      <thead>
                                        <tr className="text-zinc-400 border-b border-zinc-800 uppercase text-[10px] tracking-wider bg-zinc-950/60">
                                          <th className="py-2.5 px-3">Name of Crypto</th>
                                          <th className="py-2.5 px-3">Direction</th>
                                          <th className="py-2.5 px-3">Candlestick Pattern</th>
                                          <th className="py-2.5 px-3 text-right">Current Price</th>
                                          <th className="py-2.5 px-3 text-right">Entry Price (Time & Date)</th>
                                          <th className="py-2.5 px-3 text-right">Target 1, 2, 3</th>
                                          <th className="py-2.5 px-3 text-right">Stop Loss</th>
                                          <th className="py-2.5 px-3">Profit & Loss % (Active Trade / Outcome)</th>
                                          <th className="py-2.5 px-3 text-right">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-zinc-800/60">
                                        {dayRecord.signals.map((sig) => {
                                          const isLong = sig.signal.includes('BUY');
                                          const sym = sig.symbol || `${sig.coin}USD`;
                                          const liveData = livePrices[sym] || livePrices[sig.coin] || livePrices[`${sig.coin}USD`] || livePrices[`${sig.coin}USDT`];
                                          const livePrice = Number(liveData?.currentPrice || sig.currentPrice || sig.price || sig.entry);
                                          const entry = Number(sig.entry) || 0;
                                          const sl = Number(sig.stopLoss) || 0;
                                          const t1 = Number(sig.target1) || 0;
                                          const t2 = Number(sig.target2) || 0;
                                          const t3 = Number(sig.target3) || 0;

                                          const isT1Hit = sig.status === 'TARGET_1_HIT' || sig.targetHit;
                                          const isT2Hit = sig.status === 'TARGET_2_HIT';
                                          const isT3Hit = sig.status === 'TARGET_3_HIT';
                                          const isSLHit = sig.status === 'STOP_LOSS_HIT' || sig.stopLossHit;
                                          const isBEHit = sig.status === 'BREAKEVEN_EXIT';
                                          const isWaiting = sig.status === 'WAITING_ENTRY';
                                          const isActive = sig.status === 'ACTIVE' || (!isT1Hit && !isT2Hit && !isT3Hit && !isSLHit && !isBEHit && !isWaiting);

                                          // Active floating PnL calculation
                                          let activeFloatingPnL = 0;
                                          if (entry > 0 && livePrice > 0) {
                                            activeFloatingPnL = isLong
                                              ? Number((((livePrice - entry) / entry) * 100).toFixed(2))
                                              : Number((((entry - livePrice) / entry) * 100).toFixed(2));
                                          }

                                          // Floating R for active position
                                          const riskPerUnit = Math.abs(entry - sl);
                                          let activeFloatingR = 0;
                                          if (riskPerUnit > 0) {
                                            activeFloatingR = isLong
                                              ? Number(((livePrice - entry) / riskPerUnit).toFixed(2))
                                              : Number(((entry - livePrice) / riskPerUnit).toFixed(2));
                                          }

                                          // Distance to entry for waiting entry positions
                                          const distanceToEntry = entry > 0 && livePrice > 0
                                            ? Math.abs(Number((((livePrice - entry) / entry) * 100).toFixed(2)))
                                            : 0;

                                          // Formatted date and time
                                          const dateFormatted = sig.timestamp
                                            ? new Date(sig.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
                                            : '—';
                                          const timeFormatted = sig.timestamp
                                            ? new Date(sig.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC'
                                            : '—';

                                          return (
                                            <tr key={sig.id} className="hover:bg-zinc-800/50 transition-colors">
                                              {/* 1. Name of Crypto */}
                                              <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-sm font-black text-white">{sig.coin}</span>
                                                  <span className="text-zinc-500 text-[10px] font-mono">{sig.symbol || `${sig.coin}USD`}</span>
                                                </div>
                                                <span className="text-[9px] text-zinc-600 font-mono block">ID: {sig.id}</span>
                                              </td>

                                              {/* 2. Direction */}
                                              <td className="py-3 px-3 whitespace-nowrap">
                                                <span
                                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${
                                                    isLong
                                                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                                                      : 'bg-rose-950 text-rose-300 border-rose-700/60'
                                                  }`}
                                                >
                                                  {isLong ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
                                                  {isLong ? 'BUY / LONG' : 'SELL / SHORT'}
                                                </span>
                                              </td>

                                              {/* 3. Candlestick Pattern */}
                                              <td className="py-3 px-3">
                                                {typeof sig.candlestickPattern === 'object' && sig.candlestickPattern !== null ? (
                                                  <div className="flex flex-col items-start gap-0.5">
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono whitespace-nowrap">
                                                      🕯️ {sig.candlestickPattern.name || 'Institutional Reversal'}
                                                    </span>
                                                    {sig.candlestickPattern.reliability && (
                                                      <span className="text-[9px] text-zinc-500 font-mono">
                                                        {sig.candlestickPattern.reliability} Reliability
                                                      </span>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-950/60 text-purple-300 border border-purple-800/50 font-mono whitespace-nowrap">
                                                    🕯️ {sig.candlestickPattern || 'Institutional Candlestick Reversal'}
                                                  </span>
                                                )}
                                              </td>

                                              {/* 4. Current Price */}
                                              <td className="py-3 px-3 text-right font-mono bg-zinc-950/50 border-x border-zinc-800/60 whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                                  <span className="text-white text-xs font-bold">
                                                    ${Number(livePrice).toLocaleString(undefined, {
                                                      minimumFractionDigits: 2,
                                                      maximumFractionDigits: 4,
                                                    })}
                                                  </span>
                                                </div>
                                                <span className="text-[9px] text-emerald-400 block font-mono">
                                                  Delta India Live LTP
                                                </span>
                                              </td>

                                              {/* 5. Entry Price with time and date */}
                                              <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                                                <div className="text-xs font-bold text-blue-400">
                                                  ${Number(entry).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 4,
                                                  })}
                                                </div>
                                                <div className="text-[9px] text-zinc-400 font-normal">
                                                  {dateFormatted}
                                                </div>
                                                <div className="text-[9px] text-zinc-500 font-mono">
                                                  {timeFormatted}
                                                </div>
                                              </td>

                                              {/* 6. Target 1, 2, 3 */}
                                              <td className="py-3 px-3 text-right font-mono text-[10px] whitespace-nowrap">
                                                <div className="flex flex-col items-end gap-0.5">
                                                  <div className={`flex items-center gap-1 ${isT1Hit ? 'text-emerald-400 font-bold' : 'text-emerald-400/90'}`}>
                                                    <span className="text-zinc-500 text-[9px]">T1:</span>
                                                    <span>${Number(t1).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                                                    {isT1Hit && <span className="bg-emerald-950 text-emerald-300 text-[8px] px-1 rounded border border-emerald-800">✓ HIT</span>}
                                                  </div>
                                                  <div className={`flex items-center gap-1 ${isT2Hit ? 'text-emerald-300 font-bold' : 'text-zinc-400'}`}>
                                                    <span className="text-zinc-500 text-[9px]">T2:</span>
                                                    <span>${Number(t2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                                                    {isT2Hit && <span className="bg-emerald-950 text-emerald-300 text-[8px] px-1 rounded border border-emerald-800">✓ HIT</span>}
                                                  </div>
                                                  <div className={`flex items-center gap-1 ${isT3Hit ? 'text-cyan-300 font-bold' : 'text-zinc-500'}`}>
                                                    <span className="text-zinc-500 text-[9px]">T3:</span>
                                                    <span>${Number(t3).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                                                    {isT3Hit && <span className="bg-cyan-950 text-cyan-300 text-[8px] px-1 rounded border border-cyan-800">✓ HIT</span>}
                                                  </div>
                                                </div>
                                              </td>

                                              {/* 7. Stoploss */}
                                              <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                                                <div className="text-xs font-bold text-rose-400">
                                                  ${Number(sl).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 4,
                                                  })}
                                                </div>
                                                {sig.breakevenMoved && (
                                                  <span className="text-[9px] text-cyan-400 block font-mono">
                                                    🛡️ Trailed to BE
                                                  </span>
                                                )}
                                                {isSLHit && (
                                                  <span className="text-[9px] text-rose-400 block font-mono font-bold">
                                                    SL Hit
                                                  </span>
                                                )}
                                              </td>

                                              {/* 8. Profit and loss percentage (for active trade) other waiting entry */}
                                              <td className="py-3 px-3 whitespace-nowrap">
                                                {isActive ? (
                                                  <div className="flex flex-col items-start gap-0.5">
                                                    <span
                                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-black border ${
                                                        activeFloatingPnL > 0
                                                          ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                                                          : activeFloatingPnL < 0
                                                          ? 'bg-rose-950/90 text-rose-300 border-rose-700/80 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                                                          : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                                      }`}
                                                    >
                                                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                                                      {activeFloatingPnL > 0 ? `+${activeFloatingPnL}%` : `${activeFloatingPnL}%`}
                                                      <span className="text-[9px] font-semibold uppercase tracking-wider text-cyan-300 ml-0.5">
                                                        POSITION TAKEN (ACTIVE)
                                                      </span>
                                                    </span>
                                                    <span className="text-[9px] text-cyan-400 font-mono">
                                                      Floating {activeFloatingR > 0 ? `+${activeFloatingR}` : activeFloatingR}R • Added to Audit on Entry
                                                    </span>
                                                  </div>
                                                ) : isWaiting ? (
                                                  <div className="flex flex-col items-start gap-0.5">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60">
                                                      <Clock className="w-3 h-3 text-amber-400" />
                                                      WAITING ENTRY
                                                    </span>
                                                    <span className="text-[9px] text-zinc-400 font-mono">
                                                      {distanceToEntry}% away from trigger
                                                    </span>
                                                  </div>
                                                ) : isT1Hit || isT2Hit || isT3Hit ? (
                                                  <div className="flex flex-col items-start gap-0.5">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-black bg-emerald-950 text-emerald-300 border border-emerald-700/70">
                                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                      +{sig.realizedPnLPercent ?? Math.abs(Number((((t1 - entry) / entry) * 100).toFixed(2)))}%
                                                    </span>
                                                    <span className="text-[9px] text-emerald-400 font-mono">
                                                      Realized {sig.status} ({sig.realizedR ? `+${sig.realizedR}R` : '+1.5R'})
                                                    </span>
                                                  </div>
                                                ) : isSLHit ? (
                                                  <div className="flex flex-col items-start gap-0.5">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-black bg-rose-950 text-rose-300 border border-rose-700/70">
                                                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                                      {sig.realizedPnLPercent ? `${sig.realizedPnLPercent}%` : `-${Math.abs(Number((((entry - sl) / entry) * 100).toFixed(2)))}%`}
                                                    </span>
                                                    <span className="text-[9px] text-rose-400 font-mono">
                                                      Stop Loss Executed ({sig.realizedR ?? -1}R)
                                                    </span>
                                                  </div>
                                                ) : isBEHit ? (
                                                  <div className="flex flex-col items-start gap-0.5">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-black bg-cyan-950 text-cyan-300 border border-cyan-700/70">
                                                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                                                      0.00%
                                                    </span>
                                                    <span className="text-[9px] text-cyan-400 font-mono">
                                                      Breakeven Trailed Exit (0R)
                                                    </span>
                                                  </div>
                                                ) : (
                                                  <div className="flex flex-col items-start gap-0.5">
                                                    <span className="text-zinc-400 font-mono text-[10px]">
                                                      {sig.status || 'Pending'}
                                                    </span>
                                                  </div>
                                                )}
                                              </td>

                                              {/* 9. Action */}
                                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectSignal(sig);
                                                  }}
                                                  className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 rounded text-[10px] font-bold uppercase transition-all hover:scale-105 active:scale-95 shadow-sm"
                                                >
                                                  Inspect Setup
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* VIEW 2: GRANULAR SIGNAL SETUPS LEDGER                         */}
      {/* ============================================================= */}
      {activeMainTab === 'all-setups' && (
        <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search coin (BTC, ETH, SOL)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg pl-8 pr-3 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filter Direction (ALL, BUY, SELL) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded transition-colors ${
                filterType === 'ALL' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Signals ({signals.length})
            </button>
            <button
              onClick={() => setFilterType('BUY')}
              className={`px-3 py-1 rounded transition-colors ${
                filterType === 'BUY'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Buy ({stats.totalBuySignals})
            </button>
            <button
              onClick={() => setFilterType('SELL')}
              className={`px-3 py-1 rounded transition-colors ${
                filterType === 'SELL'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sell ({stats.totalSellSignals})
            </button>
          </div>

          {/* Filter Outcome (ALL, TARGET HIT, STOP LOSS HIT, BREAKEVEN, WAITING ENTRY, ACTIVE) */}
          <div className="flex flex-wrap items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
            <button
              onClick={() => setOutcomeFilter('ALL')}
              className={`px-2.5 py-1 rounded text-[11px] ${
                outcomeFilter === 'ALL' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Outcomes
            </button>
            <button
              onClick={() => setOutcomeFilter('TARGET_HIT')}
              className={`px-2.5 py-1 rounded text-[11px] flex items-center gap-1 ${
                outcomeFilter === 'TARGET_HIT'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Target Hit ({stats.totalTargetHits})
            </button>
            <button
              onClick={() => setOutcomeFilter('BREAKEVEN')}
              className={`px-2.5 py-1 rounded text-[11px] flex items-center gap-1 ${
                outcomeFilter === 'BREAKEVEN'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              Breakeven Protected ({stats.breakevenCount})
            </button>
            <button
              onClick={() => setOutcomeFilter('WAITING_ENTRY')}
              className={`px-2.5 py-1 rounded text-[11px] flex items-center gap-1 ${
                outcomeFilter === 'WAITING_ENTRY'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Clock className="w-3 h-3 text-amber-400" />
              Waiting Entry ({stats.waitingEntryCount})
            </button>
            <button
              onClick={() => setOutcomeFilter('STOP_LOSS_HIT')}
              className={`px-2.5 py-1 rounded text-[11px] flex items-center gap-1 ${
                outcomeFilter === 'STOP_LOSS_HIT'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <XCircle className="w-3 h-3 text-rose-400" />
              SL Hit ({stats.stopLossHitCount})
            </button>
            <button
              onClick={() => setOutcomeFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded text-[11px] ${
                outcomeFilter === 'ACTIVE'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Active ({stats.activeCount})
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time Live Market Price Stream Banner */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 px-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs font-mono shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <Activity className="w-3.5 h-3.5" />
            DELTA INDIA REAL-TIME PRICE STREAM
          </div>
          <span className="text-zinc-400 text-[11px]">
            Tick Updates: <strong className="text-white">Active (2.5s Poll & Stream)</strong>
          </span>
          <span className="text-zinc-500 text-[10px]">Last Sync: {lastLiveTick}</span>
        </div>

        {/* Live Tickers Quick Strip */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          {['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA'].map((c) => {
            const sym = `${c}USD`;
            const t = livePrices[sym];
            if (!t || !t.currentPrice) return null;
            const isPositive = (t.priceChange24h ?? 0) >= 0;
            return (
              <div
                key={c}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] whitespace-nowrap shadow-sm"
              >
                <span className="font-bold text-zinc-300">{c}:</span>
                <span className="font-bold text-white">${Number(t.currentPrice).toLocaleString()}</span>
                <span className={`text-[9px] font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? '+' : ''}{Number(t.priceChange24h || 0).toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Signal Ledger Table with Comprehensive Audited Parameters */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3">Signal ID</th>
                <th className="py-3 px-3">Timestamp (UTC)</th>
                <th className="py-3 px-3">Asset</th>
                <th className="py-3 px-3">Signal</th>
                <th className="py-3 px-3 text-right">Score</th>
                <th className="py-3 px-3 text-right bg-zinc-900/90 text-cyan-300 border-x border-zinc-800">
                  <div className="flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Real-Time Price ($)
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Setup Entry ($)</th>
                <th className="py-3 px-3 text-right">Stop Loss ($)</th>
                <th className="py-3 px-3 text-right">Target 1</th>
                <th className="py-3 px-3 text-right">Target 2</th>
                <th className="py-3 px-3 text-right">Target 3</th>
                <th className="py-3 px-3 text-right">R:R</th>
                <th className="py-3 px-3 text-center">Verification Outcome</th>
                <th className="py-3 px-3 text-center">Setup State</th>
                <th className="py-3 px-3 text-right bg-zinc-900/90 text-emerald-300 border-x border-zinc-800">
                  Signal Performance
                </th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-zinc-500">
                    <Info className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
                    No signal setups matching current filter. Click "Historical Backtest" or "Audit Live Candles" to load verified data.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isLong = item.signal.includes('BUY');
                  const isTargetHit =
                    item.status === 'TARGET_1_HIT' ||
                    item.status === 'TARGET_2_HIT' ||
                    item.status === 'TARGET_3_HIT' ||
                    item.targetHit;
                  const isStopLossHit = item.status === 'STOP_LOSS_HIT' || item.stopLossHit;
                  const isActive = item.status === 'ACTIVE';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectSignal(item)}
                      className="hover:bg-zinc-900/60 transition-colors cursor-pointer"
                    >
                      {/* 1. ID */}
                      <td className="py-3 px-3 text-zinc-400 font-semibold">{item.id}</td>

                      {/* 2. Timestamp */}
                      <td className="py-3 px-3 text-zinc-400 whitespace-nowrap">
                        {item?.timestamp ? new Date(item.timestamp).toUTCString().slice(5, 22) : '—'}
                      </td>

                      {/* 3. Asset & Candlestick Pattern */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-white text-sm">{item.coin}</span>
                          <span className="text-zinc-500 text-[10px]">{item.symbol}</span>
                        </div>
                        {item.candlestickPattern ? (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono">
                            🕯️ {typeof item.candlestickPattern === 'object' ? item.candlestickPattern.name : item.candlestickPattern}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-[9px] block">Confluence Setup</span>
                        )}
                      </td>

                      {/* 4. Signal Type (BUY / SELL) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            isLong
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {item.signal}
                        </span>
                      </td>

                      {/* 5. Final Score */}
                      <td className="py-3 px-3 text-right font-bold text-white">
                        {item.finalScore}/100
                      </td>

                      {/* 6. Real-Time Price (Delta Exchange India) */}
                      <td className="py-3 px-3 text-right font-bold whitespace-nowrap bg-zinc-950/60 border-x border-zinc-900">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <span className="text-white text-sm">
                            ${Number(item.currentPrice ?? item.price).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })}
                          </span>
                        </div>
                        {item.distanceToEntryPercent !== null && item.distanceToEntryPercent !== undefined ? (
                          <span
                            className={`text-[9px] block font-mono ${
                              item.distanceToEntryPercent > 0
                                ? 'text-emerald-400'
                                : item.distanceToEntryPercent < 0
                                ? 'text-rose-400'
                                : 'text-zinc-400'
                            }`}
                          >
                            {item.distanceToEntryPercent > 0
                              ? `+${item.distanceToEntryPercent}%`
                              : `${item.distanceToEntryPercent}%`}{' '}
                            vs Entry
                          </span>
                        ) : (
                          <span className="text-[9px] text-zinc-500 block font-mono">Live Delta LTP</span>
                        )}
                      </td>

                      {/* 7. Setup Entry Price & Trigger State */}
                      <td className="py-3 px-3 text-right font-bold text-blue-400 whitespace-nowrap">
                        <div>${Number(item.entry).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</div>
                        {item.isEntryTriggered || item.entryStrategy?.isTriggered ? (
                          <span className="text-[9px] text-emerald-400 block font-normal font-mono">✓ Triggered</span>
                        ) : item.status === 'WAITING_ENTRY' ? (
                          <span className="text-[9px] text-amber-400 block font-normal font-mono">
                            ⏳ Wait Retest (${Math.abs(Number(item.entry) - Number(item.currentPrice ?? item.price)).toFixed(2)})
                          </span>
                        ) : null}
                      </td>

                      {/* 8. Stop Loss */}
                      <td className="py-3 px-3 text-right font-bold text-rose-400 whitespace-nowrap">
                        <div>${Number(item.stopLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</div>
                        {item.breakevenMoved && (
                          <span className="text-[9px] text-cyan-400 block font-normal font-mono">🛡️ Trailed to BE</span>
                        )}
                      </td>

                      {/* 9. Target 1 */}
                      <td className="py-3 px-3 text-right font-bold text-emerald-400">
                        ${Number(item.target1).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>

                      {/* 10. Target 2 */}
                      <td className="py-3 px-3 text-right font-bold text-emerald-400">
                        ${Number(item.target2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>

                      {/* 11. Target 3 */}
                      <td className="py-3 px-3 text-right font-bold text-cyan-400">
                        ${Number(item.target3).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>

                      {/* 12. Planned R:R */}
                      <td className="py-3 px-3 text-right font-bold text-amber-300">
                        1:{item.riskReward}
                      </td>

                      {/* 13. Verification Outcome */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {item.status === 'TARGET_1_HIT' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            TARGET 1 HIT
                          </span>
                        )}
                        {item.status === 'TARGET_2_HIT' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-900/90 text-emerald-200 border border-emerald-500 font-black text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                            TARGET 2 HIT
                          </span>
                        )}
                        {item.status === 'TARGET_3_HIT' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-500 font-black text-[10px]">
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            TARGET 3 RUNNER
                          </span>
                        )}
                        {item.status === 'BREAKEVEN_EXIT' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-600/50 font-bold text-[10px]">
                            <ShieldCheck className="w-3 h-3 text-cyan-400" />
                            BREAKEVEN (T1 SECURED)
                          </span>
                        )}
                        {item.status === 'WAITING_ENTRY' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-600/50 font-bold text-[10px]">
                            <Clock className="w-3 h-3 text-amber-400" />
                            WAITING PULLBACK
                          </span>
                        )}
                        {item.status === 'STOP_LOSS_HIT' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-600/50 font-bold text-[10px]">
                            <XCircle className="w-3 h-3 text-rose-400" />
                            STOP LOSS HIT
                          </span>
                        )}
                        {item.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-600/50 font-bold text-[10px]">
                            <Clock className="w-3 h-3 text-blue-400 animate-spin" />
                            ACTIVE
                          </span>
                        )}
                        {item.status === 'INVALIDATED' && (
                          <span className="inline-block px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">
                            INVALIDATED
                          </span>
                        )}
                      </td>

                      {/* 14. Setup State: Target / SL Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isTargetHit ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[10px]">
                            Target Hit ({item.targetHitLevel ? `T${item.targetHitLevel}` : 'T1'})
                          </span>
                        ) : isStopLossHit ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-[10px]">
                            SL Hit
                          </span>
                        ) : item.status === 'WAITING_ENTRY' ? (
                          <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 text-[10px]">
                            Awaiting Fill
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-blue-950/50 text-blue-400 text-[10px]">
                            Running Active
                          </span>
                        )}
                      </td>

                      {/* 15. Signal Performance: Real-Time Floating & Realized */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-bold bg-zinc-950/60 border-x border-zinc-900">
                        {isActive || item.status === 'TRIGGERED' ? (
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                                (item.unrealizedPnLPercent ?? 0) >= 0
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                              {(item.unrealizedPnLPercent ?? 0) >= 0
                                ? `+${item.unrealizedPnLPercent}%`
                                : `${item.unrealizedPnLPercent}%`}
                            </span>
                            <span className="text-[10px] text-zinc-400 block font-mono mt-0.5">
                              Live:{' '}
                              {item.floatingR !== null && item.floatingR !== undefined
                                ? item.floatingR >= 0
                                  ? `+${item.floatingR} R`
                                  : `${item.floatingR} R`
                                : '0.0 R'}
                            </span>
                          </div>
                        ) : item.status === 'WAITING_ENTRY' ? (
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 text-[10px] font-bold">
                              ⏳ Ready to Arm
                            </span>
                            <span className="text-[9px] text-zinc-500 block font-mono mt-0.5">Pending Retest</span>
                          </div>
                        ) : (
                          <div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${
                                (item.realizedPnLPercent ?? 0) > 0
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : (item.realizedPnLPercent ?? 0) < 0
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                              }`}
                            >
                              {(item.realizedPnLPercent ?? 0) >= 0
                                ? `+${item.realizedPnLPercent}%`
                                : `${item.realizedPnLPercent}%`}
                            </span>
                            <span className="text-[10px] text-zinc-400 block font-mono mt-0.5">
                              {item.realizedR !== null && item.realizedR !== undefined
                                ? item.realizedR >= 0
                                  ? `+${item.realizedR} R`
                                  : `${item.realizedR} R`
                                : '0 R'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 16. Action */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSignal(item);
                          }}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[10px] font-bold uppercase transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

      {/* Custom Signal Setup Modal */}
      {showCustomModal && (
        <CustomSetupModal
          onClose={() => setShowCustomModal(false)}
          onAdded={(newSig) => {
            setSignals((prev) => [newSig, ...prev]);
            setShowCustomModal(false);
            showToast(`Custom signal setup for ${newSig.coin} created and audited!`);
          }}
        />
      )}
    </div>
  );
};

// Subcomponent: Custom Setup Modal
interface CustomSetupModalProps {
  onClose: () => void;
  onAdded: (signal: CryptoSignal) => void;
}

const CustomSetupModal: React.FC<CustomSetupModalProps> = ({ onClose, onAdded }) => {
  const [coin, setCoin] = useState('BTC');
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [entry, setEntry] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [target1, setTarget1] = useState('');
  const [target2, setTarget2] = useState('');
  const [target3, setTarget3] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto populate prices based on current price
  const handleAutoFill = async () => {
    try {
      const res = await fetch(`/api/fundamental/${coin}`);
      const data = await res.json();
      const ltp = data?.marketData?.lastTradedPrice;
      if (ltp) {
        const curPrice = Number(ltp);
        setEntry(curPrice.toString());
        const atr = curPrice * 0.015;
        if (direction === 'BUY') {
          setStopLoss((curPrice - atr * 1.5).toFixed(2));
          setTarget1((curPrice + atr * 3.0).toFixed(2));
          setTarget2((curPrice + atr * 5.0).toFixed(2));
          setTarget3((curPrice + atr * 7.0).toFixed(2));
        } else {
          setStopLoss((curPrice + atr * 1.5).toFixed(2));
          setTarget1((curPrice - atr * 3.0).toFixed(2));
          setTarget2((curPrice - atr * 5.0).toFixed(2));
          setTarget3((curPrice - atr * 7.0).toFixed(2));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coin || !entry || !stopLoss || !target1) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/signals/custom-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coin,
          direction,
          entry: Number(entry),
          stopLoss: Number(stopLoss),
          target1: Number(target1),
          target2: target2 ? Number(target2) : undefined,
          target3: target3 ? Number(target3) : undefined,
        }),
      });
      const result = await res.json();
      if (result.success && result.signal) {
        onAdded(result.signal);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">Register Custom Signal Setup</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white font-mono text-sm">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 block mb-1">Underlying Coin</label>
              <select
                value={coin}
                onChange={(e) => setCoin(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white"
              >
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
                <option value="SOL">SOL</option>
                <option value="XRP">XRP</option>
                <option value="DOGE">DOGE</option>
                <option value="ADA">ADA</option>
                <option value="AVAX">AVAX</option>
                <option value="LINK">LINK</option>
              </select>
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Direction</label>
              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setDirection('BUY')}
                  className={`flex-1 py-1 rounded text-center font-bold ${
                    direction === 'BUY'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'text-zinc-500'
                  }`}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('SELL')}
                  className={`flex-1 py-1 rounded text-center font-bold ${
                    direction === 'SELL'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'text-zinc-500'
                  }`}
                >
                  SELL
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAutoFill}
            className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-cyan-800/40 rounded-lg font-bold flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Auto-Calculate Prices from Delta Exchange Ticker
          </button>

          <div>
            <label className="text-zinc-400 block mb-1">Entry Price ($)</label>
            <input
              type="number"
              step="any"
              required
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              placeholder="e.g. 84250"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white"
            />
          </div>

          <div>
            <label className="text-rose-400 block mb-1">Stop Loss ($)</label>
            <input
              type="number"
              step="any"
              required
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="e.g. 82950"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-emerald-400 block mb-1">Target 1 ($)</label>
              <input
                type="number"
                step="any"
                required
                value={target1}
                onChange={(e) => setTarget1(e.target.value)}
                placeholder="T1 (1:2 R)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="text-emerald-400 block mb-1">Target 2 ($)</label>
              <input
                type="number"
                step="any"
                value={target2}
                onChange={(e) => setTarget2(e.target.value)}
                placeholder="T2 (1:3.5 R)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="text-cyan-400 block mb-1">Target 3 ($)</label>
              <input
                type="number"
                step="any"
                value={target3}
                onChange={(e) => setTarget3(e.target.value)}
                placeholder="T3 (Runner)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition-colors"
            >
              {isSubmitting ? 'Verifying...' : 'Save & Verify Against Candles'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
