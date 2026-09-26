import React, { useState, useEffect, useMemo } from 'react';
import { WorkOrder, ProductionStage } from '../types';
import {
  Printer,
  ShoppingBag,
  Cpu,
  Truck,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';

interface ProductionStatusSliderProps {
  workOrder: WorkOrder;
  onStageChange: (newStage: ProductionStage) => Promise<void>;
  isUpdating: boolean;
  disabled?: boolean;
}

interface StageStep {
  id: ProductionStage;
  label: string;
  shortLabel: string;
  orderNum: number;
  icon: React.ElementType;
  activeColor: string;
  trackColor: string;
  badgeBg: string;
  ringColor: string;
  desc: string;
}

const STAGES: StageStep[] = [
  {
    id: 'Printing',
    label: 'Printing',
    shortLabel: 'Print',
    orderNum: 1,
    icon: Printer,
    activeColor: 'text-amber-700 bg-amber-500',
    trackColor: 'bg-amber-500',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    ringColor: 'ring-amber-400',
    desc: 'Cetak Sablon / DTF',
  },
  {
    id: 'Logistik',
    label: 'Logistik',
    shortLabel: 'Logistik',
    orderNum: 2,
    icon: ShoppingBag,
    activeColor: 'text-blue-700 bg-blue-500',
    trackColor: 'bg-blue-500',
    badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
    ringColor: 'ring-blue-400',
    desc: 'Bahan Baku & Blank Apparel',
  },
  {
    id: 'Produksi',
    label: 'Produksi',
    shortLabel: 'Produksi',
    orderNum: 3,
    icon: Cpu,
    activeColor: 'text-emerald-700 bg-emerald-500',
    trackColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    ringColor: 'ring-emerald-400',
    desc: 'Jahit, Press, QC & Packing',
  },
  {
    id: 'Pengantaran',
    label: 'Pengantaran',
    shortLabel: 'Antar',
    orderNum: 4,
    icon: Truck,
    activeColor: 'text-purple-700 bg-purple-500',
    trackColor: 'bg-purple-500',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    ringColor: 'ring-purple-400',
    desc: 'Pengiriman & Pickup Klien',
  },
];

// Helper to resolve stage index cleanly (mapping legacy 'Belanja' to 'Logistik' index 1)
function getStageIndex(stage: ProductionStage | string): number {
  if (stage === 'Belanja' || stage === 'Logistik') return 1;
  if (stage === 'Produksi') return 2;
  if (stage === 'Pengantaran') return 3;
  return 0; // Printing
}

function normalizeStageName(stage: string): ProductionStage {
  if (stage === 'Belanja' || stage === 'Logistik') return 'Logistik';
  if (stage === 'Produksi') return 'Produksi';
  if (stage === 'Pengantaran') return 'Pengantaran';
  return 'Printing';
}

function formatShortTime(isoStr?: string): string | null {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return timeStr;
    const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric' });
    return `${dateStr} ${timeStr}`;
  } catch (e) {
    return null;
  }
}

function formatDateTimeDetailed(isoStr?: string): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return '-';
  }
}

export const ProductionStatusSlider: React.FC<ProductionStatusSliderProps> = ({
  workOrder,
  onStageChange,
  isUpdating,
  disabled = false,
}) => {
  const currentIdx = getStageIndex(workOrder.tahap_sekarang);
  const [sliderVal, setSliderVal] = useState<number>(currentIdx);
  const isCompleted = !!workOrder.completed_at;

  useEffect(() => {
    setSliderVal(getStageIndex(workOrder.tahap_sekarang));
  }, [workOrder.tahap_sekarang]);

  // Extract latest timestamp for each stage from riwayat_tahap
  const stageTimeMap = useMemo(() => {
    const map: Partial<Record<ProductionStage, string>> = {};
    if (workOrder.riwayat_tahap && Array.isArray(workOrder.riwayat_tahap)) {
      for (const log of workOrder.riwayat_tahap) {
        const norm = normalizeStageName(log.tahap);
        map[norm] = log.waktu;
      }
    }
    // Also if stage is active now, ensure it has at least updated_at
    const currentNorm = normalizeStageName(workOrder.tahap_sekarang);
    if (!map[currentNorm] && workOrder.updated_at) {
      map[currentNorm] = workOrder.updated_at;
    }
    return map;
  }, [workOrder.riwayat_tahap, workOrder.tahap_sekarang, workOrder.updated_at]);

  const activeStage = STAGES[sliderVal] || STAGES[0];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSliderVal(val);
  };

  const handleSliderCommit = async () => {
    if (disabled || isUpdating) return;
    const targetStage = STAGES[sliderVal].id;
    if (targetStage !== workOrder.tahap_sekarang) {
      await onStageChange(targetStage);
    }
  };

  const handleSelectNode = async (idx: number) => {
    if (disabled || isUpdating) return;
    setSliderVal(idx);
    const targetStage = STAGES[idx].id;
    if (targetStage !== workOrder.tahap_sekarang) {
      await onStageChange(targetStage);
    }
  };

  // Progress percentage for track fill (0%, 33.3%, 66.6%, 100%)
  const fillPercent = (sliderVal / (STAGES.length - 1)) * 100;

  return (
    <div className="w-full bg-[#F8F5F2] sm:bg-slate-50/80 p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 space-y-2.5">
      {/* Top Header inside the slider column */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">
            Status Orderan:
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-black border flex items-center gap-1 transition-all ${
              isCompleted
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : activeStage.badgeBg
            }`}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Selesai & Terkirim</span>
              </>
            ) : (
              <>
                <span>
                  {activeStage.orderNum}. {activeStage.label}
                </span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
          {isUpdating ? (
            <span className="text-amber-600 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Menyimpan...</span>
            </span>
          ) : (
            <span className="hidden sm:inline text-slate-400">
              Geser untuk ubah status ➔
            </span>
          )}
        </div>
      </div>

      {/* Slidable Track & Checkpoint Nodes Container */}
      <div className="relative pt-1 pb-1">
        {/* Background Grey Track */}
        <div className="absolute top-[18px] left-[16px] right-[16px] h-2 bg-slate-200 rounded-full z-0 overflow-hidden">
          {/* Active Fill Gradient */}
          <div
            className={`h-full transition-all duration-300 ease-out ${
              sliderVal === 0
                ? 'bg-amber-400'
                : sliderVal === 1
                ? 'bg-blue-500'
                : sliderVal === 2
                ? 'bg-emerald-500'
                : 'bg-purple-600'
            }`}
            style={{ width: `${fillPercent}%` }}
          />
        </div>

        {/* 4 Checkpoint Nodes along the track */}
        <div className="relative z-10 flex items-center justify-between">
          {STAGES.map((st, idx) => {
            const isPassed = idx <= sliderVal;
            const isCurrent = idx === sliderVal;
            const Icon = st.icon;
            const recordedTime = stageTimeMap[st.id];
            const shortFormatted = formatShortTime(recordedTime);

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => handleSelectNode(idx)}
                disabled={disabled || isUpdating}
                className="flex flex-col items-center group cursor-pointer focus:outline-none min-w-[58px]"
                title={`Pindahkan ke tahap ${st.label}: ${st.desc} ${recordedTime ? `(${formatDateTimeDetailed(recordedTime)})` : ''}`}
              >
                {/* Node Circle */}
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-xs ${
                    isCurrent
                      ? `${st.trackColor} text-white scale-110 ring-4 ${st.ringColor}/30 shadow-md`
                      : isPassed
                      ? 'bg-slate-800 text-white hover:scale-105'
                      : 'bg-white text-slate-400 border-2 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {isUpdating && isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                {/* Node Label Below */}
                <span
                  className={`mt-1.5 text-[10px] font-black transition-colors ${
                    isCurrent
                      ? 'text-slate-900 font-extrabold'
                      : isPassed
                      ? 'text-slate-700'
                      : 'text-slate-400'
                  }`}
                >
                  {st.label}
                </span>

                {/* Recorded Time Stamp Tag */}
                {shortFormatted ? (
                  <span
                    className={`mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-md border flex items-center gap-0.5 shadow-3xs ${
                      isCurrent
                        ? 'bg-red-50 text-[#E63946] border-red-200'
                        : isPassed
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : 'bg-slate-50 text-slate-400 border-slate-100'
                    }`}
                  >
                    <Clock className="w-2.5 h-2.5 shrink-0 opacity-70" />
                    <span>{shortFormatted}</span>
                  </span>
                ) : (
                  <span className="mt-0.5 text-[9px] text-slate-300 font-semibold">—</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Transparent Interactive Native Range Input overlay for smooth touch/drag */}
        <input
          type="range"
          min="0"
          max="3"
          step="1"
          value={sliderVal}
          disabled={disabled || isUpdating}
          onChange={handleSliderChange}
          onMouseUp={handleSliderCommit}
          onTouchEnd={handleSliderCommit}
          className="absolute inset-x-0 top-1 h-9 opacity-0 cursor-grab active:cursor-grabbing z-20 w-full"
          aria-label="Geser status alur produksi"
        />
      </div>

      {/* Stage Description Helper & Exact Timestamp Log */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] pt-1.5 text-slate-500 border-t border-slate-200/60">
        <span className="truncate text-slate-600 font-medium">
          {activeStage.desc}
        </span>

        {/* Catatan Waktu Terakhir */}
        <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 shrink-0">
          <Clock className="w-3 h-3 text-[#E63946] shrink-0" />
          <span>
            {isCompleted ? 'Selesai: ' : 'Catatan Waktu: '}
            <strong className="text-slate-800">
              {formatDateTimeDetailed(workOrder.completed_at || workOrder.updated_at)}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
