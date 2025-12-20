import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 渐变填充的数据结构（从 FillConf 内部迁移到 store）
 *
 * 约定：
 * - angle: 0..360，0°=→，90°=↓（屏幕坐标系）
 * - stops: 0..1 的色标位置，至少 2 个；使用前应按 offset 排序
 * - color: 不包含透明度（透明度你说单独配置）
 */
export type GradientStop = {
  id: string;
  offset: number; // 0..1
  color: string; // '#RRGGBB' 或其它 CSS color（不含 alpha）
};

export type LinearGradientConfig = {
  type: 'linear';
  angle: number; // deg
  stops: GradientStop[];
};

export type FillConfig = LinearGradientConfig;

export type FillState = {
  gradient: FillConfig;
  selectedStopId: string;

  setGradient: (next: FillConfig | ((prev: FillConfig) => FillConfig)) => void;
  setAngle: (angle: number) => void;
  setSelectedStopId: (id: string) => void;

  addStop: (stop?: Partial<Pick<GradientStop, 'offset' | 'color'>>) => void;
  removeStop: (id: string) => void;
  setStopOffset: (id: string, offset: number) => void;
  setStopColor: (id: string, color: string) => void;

  reset: () => void;
};

const normalizeAngle = (a: number) => {
  const v = a % 360;
  return v < 0 ? v + 360 : v;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const sortStops = (stops: GradientStop[]) =>
  [...stops].sort((a, b) => clamp01(a.offset) - clamp01(b.offset));

const genId = () => `s_${Math.random().toString(16).slice(2, 8)}`;

const defaultGradient: FillConfig = {
  type: 'linear',
  angle: 35,
  stops: [
    { id: 's1', offset: 0, color: '#ff6a00' },
    { id: 's2', offset: 0.5, color: '#6a5cff' },
    { id: 's3', offset: 1, color: '#00d4ff' },
  ],
};

const defaultSelectedStopId = 's2';

export const useFillStore = create<FillState>()(
  persist(
    (set, get) => ({
      gradient: defaultGradient,
      selectedStopId: defaultSelectedStopId,

      setGradient: (next) =>
        set((state) => {
          const prev = state.gradient;
          const g = typeof next === 'function' ? next(prev) : next;
          const normalized: FillConfig = {
            ...g,
            angle: normalizeAngle(g.angle),
            stops: sortStops(g.stops).map((s) => ({ ...s, offset: clamp01(s.offset) })),
          };

          return { gradient: normalized };
        }),

      setAngle: (angle) =>
        set((state) => ({
          gradient: { ...state.gradient, angle: normalizeAngle(angle) },
        })),

      setSelectedStopId: (id) => set({ selectedStopId: id }),

      addStop: (stop) => {
        if (get().gradient.stops.length >= 4) return;
        const id = genId();
        const { gradient } = get();
        const baseColor =
          stop?.color ??
          gradient.stops.find((s) => s.id === get().selectedStopId)?.color ??
          gradient.stops[0]?.color ??
          '#ffffff';
        const baseOffset =
          stop?.offset ?? gradient.stops.find((s) => s.id === get().selectedStopId)?.offset ?? 0.5;
        const nextStop: GradientStop = {
          id,
          offset: clamp01(baseOffset + 0.08),
          color: baseColor,
        };
        set((state) => ({
          gradient: { ...state.gradient, stops: sortStops([...state.gradient.stops, nextStop]) },
          selectedStopId: id,
        }));
        return id;
      },

      removeStop: (id) =>
        set((state) => {
          const nextStops = state.gradient.stops.filter((s) => s.id !== id);
          const nextSelected =
            state.selectedStopId === id ? nextStops[nextStops.length - 1].id : state.selectedStopId;
          return {
            gradient: { ...state.gradient, stops: sortStops(nextStops) },
            selectedStopId: nextSelected,
          };
        }),

      setStopOffset: (id, offset) =>
        set((state) => ({
          gradient: {
            ...state.gradient,
            stops: sortStops(
              state.gradient.stops.map((s) => (s.id === id ? { ...s, offset: clamp01(offset) } : s))
            ),
          },
        })),

      setStopColor: (id, color) =>
        set((state) => ({
          gradient: {
            ...state.gradient,
            stops: state.gradient.stops.map((s) => (s.id === id ? { ...s, color } : s)),
          },
        })),

      reset: () => set({ gradient: defaultGradient, selectedStopId: defaultSelectedStopId }),
    }),
    {
      name: 'fill-color-storage',
      partialize: (state) => ({
        gradient: state.gradient,
        selectedStopId: state.selectedStopId,
      }),
    }
  )
);
