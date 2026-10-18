import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Database,
  Layers,
  TrendingUp,
  Activity,
  Coins,
  Shield,
  Zap,
  Info,
  Calendar,
} from 'lucide-react';

interface Props {
  selectedCommodity: string;
  onSelectCommodity: (commodity: string) => void;
}

const COMMODITIES = [
  { id: 'GOLD', label: 'Gold (XAU)', category: 'Precious Metals' },
  { id: 'SILVER', label: 'Silver (XAG)', category: 'Precious Metals' },
  { id: 'CRUDEOIL', label: 'Crude Oil (WTI)', category: 'Energy' },
  { id: 'ZINC', label: 'Zinc (LME/MCX)', category: 'Base Metals' },
  { id: 'COPPER', label: 'Copper (HG)', category: 'Base Metals' },
  { id: 'NATGAS', label: 'Natural Gas (NG)', category: 'Energy' },
  { id: 'ALUMINIUM', label: 'Aluminium', category: 'Base Metals' },
  { id: 'PLATINUM', label: 'Platinum', category: 'Precious Metals' },
];

export const CommodityFundamentalsView: React.FC<Props> = ({ selectedCommodity, onSelectCommodity }) => {
  const [activeComm, setActiveComm] = useState<string>(selectedCommodity || 'GOLD');
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedCommodity && selectedCommodity !== activeComm) {
      setActiveComm(selectedCommodity);
    }
  }, [selectedCommodity]);

  const fetchFundamentals = async (comm: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/commodities/fundamentals?commodity=${comm}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch commodity fundamentals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFundamentals(activeComm);
  }, [activeComm]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 border border-amber-800/40 p-5 rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded font-mono">
                MACRO & PHYSICAL SUPPLY/DEMAND INTELLIGENCE
              </span>
              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded font-mono font-bold">
                COMEX · NYMEX · MCX · LME
              </span>
            </div>
            <h1 className="text-xl font-black text-white mt-1.5 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              Commodity Fundamental Reserves & Macro Balance Sheets
            </h1>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Deep institutional insights: Central Bank purchases, OPEC+ quota compliance, LME warehouse stocks, smelter treatment charges, and commercial COT positioning.
            </p>
          </div>
        </div>

        {/* Commodity Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 no-scrollbar">
          {COMMODITIES.map((c) => {
            const isSelected = activeComm === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setActiveComm(c.id);
                  onSelectCommodity(c.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md shadow-amber-500/25'
                    : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500 font-mono text-xs">
          Loading Commodity Macro & Reserve Intelligence...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Executive Summary */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm font-mono uppercase">{data.title}</h3>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">Benchmark: {activeComm}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="bg-zinc-900/60 p-3.5 rounded-lg border border-zinc-800/80">
                <span className="text-zinc-500 block text-[10px] uppercase">Primary Macro Driver</span>
                <span className="text-amber-300 font-bold text-sm block mt-1">{data.driver}</span>
              </div>
              <div className="bg-zinc-900/60 p-3.5 rounded-lg border border-zinc-800/80">
                <span className="text-zinc-500 block text-[10px] uppercase">Physical Supply/Demand Balance</span>
                <span className="text-emerald-400 font-bold text-sm block mt-1">{data.supplyDemandBalance}</span>
              </div>
              <div className="bg-zinc-900/60 p-3.5 rounded-lg border border-zinc-800/80">
                <span className="text-zinc-500 block text-[10px] uppercase">COT Institutional Positioning</span>
                <span className="text-cyan-300 font-semibold text-xs block mt-1">{data.cotPositioning}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Specific Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-3 shadow-lg">
              <h4 className="font-bold text-white text-xs uppercase flex items-center gap-2 border-b border-zinc-900 pb-2">
                <Database className="w-4 h-4 text-cyan-400" />
                Physical Inventory & Warehouse Stocks
              </h4>
              <div className="space-y-2 text-zinc-300 text-xs">
                {data.centralBankReserves && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-400">Central Bank Bullion:</span>
                    <span className="font-bold text-white">{data.centralBankReserves}</span>
                  </div>
                )}
                {data.comexWarehouseStocks && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-400">Comex Warehouse Stocks:</span>
                    <span className="font-bold text-white">{data.comexWarehouseStocks}</span>
                  </div>
                )}
                {data.lmeWarehouseStocks && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-400">LME Warehouse Stocks:</span>
                    <span className="font-bold text-white">{data.lmeWarehouseStocks}</span>
                  </div>
                )}
                {data.eiaCommercialStocks && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-400">EIA Commercial Crude:</span>
                    <span className="font-bold text-white">{data.eiaCommercialStocks}</span>
                  </div>
                )}
                {data.sprReserves && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-400">Strategic Reserve (SPR):</span>
                    <span className="font-bold text-white">{data.sprReserves}</span>
                  </div>
                )}
                {data.workingStorage && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-400">Working Underground Storage:</span>
                    <span className="font-bold text-white">{data.workingStorage}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-3 shadow-lg">
              <h4 className="font-bold text-white text-xs uppercase flex items-center gap-2 border-b border-zinc-900 pb-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Structural Consumption & Industrial Intensity
              </h4>
              <div className="space-y-2 text-zinc-300 text-xs">
                {data.industrialDemandPct && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-400">Industrial Demand %:</span>
                    <span className="font-bold text-cyan-300">{data.industrialDemandPct}</span>
                  </div>
                )}
                {data.solarPVConsumption && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-400">Solar PV Consumption:</span>
                    <span className="font-bold text-white">{data.solarPVConsumption}</span>
                  </div>
                )}
                {data.galvanizingDemandPct && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-400">Steel Galvanizing Share:</span>
                    <span className="font-bold text-cyan-300">{data.galvanizingDemandPct}</span>
                  </div>
                )}
                {data.smelterTCRCs && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-400">Smelter Treatment Charges:</span>
                    <span className="font-bold text-amber-300">{data.smelterTCRCs}</span>
                  </div>
                )}
                {data.opecQuotaCompliance && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-400">OPEC+ Quota Compliance:</span>
                    <span className="font-bold text-emerald-400">{data.opecQuotaCompliance}</span>
                  </div>
                )}
                {data.refineryCrackSpreads && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-400">3-2-1 Crack Spread:</span>
                    <span className="font-bold text-white">{data.refineryCrackSpreads}</span>
                  </div>
                )}
                {data.dxyCorrelation && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-400">US Dollar (DXY) Correlation:</span>
                    <span className="font-bold text-rose-300">{data.dxyCorrelation}</span>
                  </div>
                )}
                {data.goldSilverRatio && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-400">Gold/Silver Ratio:</span>
                    <span className="font-bold text-amber-400">{data.goldSilverRatio}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Key Catalysts */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3 font-mono">
            <h4 className="font-bold text-white text-xs uppercase flex items-center gap-2 border-b border-zinc-900 pb-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Institutional Catalysts & Market Outlook
            </h4>
            <div className="space-y-2">
              {(data.keyCatalysts || []).map((cat: string, i: number) => (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-zinc-200">{cat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
