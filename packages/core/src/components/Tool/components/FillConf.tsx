import { useThrottleFn } from '@zeroDraw/common';
import { useMemo, useRef } from 'react';
import styled from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import { useFillStore } from '../../../store/useFill';
import { isMobile } from '../../../utils/platform';

const Wrapper = styled.div`
  width: 100%;
  padding: 10px 12px 12px;
  color: var(--container-color);
  user-select: none;
`;

const Subtle = styled.div`
  font-size: 12px;
  opacity: 0.7;
`;

const Panel = styled.div`
  display: grid;
  gap: 10px;
`;

const Card = styled.div`
  border: 1px solid var(--container-border-color);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.02);
  padding: 10px;
`;

const CardTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
`;

const CardTitle = styled.div`
  font-size: 12px;
  font-weight: 650;
  opacity: 0.9;
`;

const TinyButton = styled.button`
  appearance: none;
  border: 1px solid var(--container-border-color);
  background: rgba(255, 255, 255, 0.55);
  color: inherit;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 10px;
  cursor: pointer;
  line-height: 1;
  white-space: nowrap;
  transition:
    transform 120ms ease,
    background 120ms ease,
    border-color 120ms ease;

  &:hover {
    border-color: var(--color-primary-active);
    background: rgba(255, 255, 255, 0.75);
  }
  &:active {
    transform: translateY(1px);
  }
`;

const Preview = styled.div`
  width: 100%;
  height: 42px;
  border-radius: 12px;
  border: 1px solid var(--container-border-color);
  overflow: hidden;
  background:
    linear-gradient(45deg, rgba(0, 0, 0, 0.06) 25%, transparent 25%) 0 0 / 12px 12px,
    linear-gradient(-45deg, rgba(0, 0, 0, 0.06) 25%, transparent 25%) 0 0 / 12px 12px,
    linear-gradient(45deg, transparent 75%, rgba(0, 0, 0, 0.06) 75%) 0 0 / 12px 12px,
    linear-gradient(-45deg, transparent 75%, rgba(0, 0, 0, 0.06) 75%) 0 0 / 12px 12px;
  background-color: rgba(255, 255, 255, 0.5);
`;

const PreviewFill = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #ff6a00 0%, #6a5cff 50%, #00d4ff 100%);
`;

const TwoCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const AngleDial = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 999px;
  border: 1px solid var(--container-border-color);
  background: rgba(255, 255, 255, 0.55);
  overflow: hidden;
  margin: 0 auto;
`;

const DialGrid = styled.div`
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at center, rgba(0, 0, 0, 0.14) 0 1px, transparent 1px),
    radial-gradient(circle at center, rgba(0, 0, 0, 0.06) 0 55%, transparent 56%),
    linear-gradient(to right, transparent 49.5%, rgba(0, 0, 0, 0.08) 50%, transparent 50.5%),
    linear-gradient(to bottom, transparent 49.5%, rgba(0, 0, 0, 0.08) 50%, transparent 50.5%);
  opacity: 0.75;
`;

const DialNeedle = styled.div<{ $deg: number }>`
  position: absolute;
  inset: 0;
  transform: rotate(${({ $deg }) => $deg}deg);
`;

const NeedleLine = styled.div`
  position: absolute;
  left: 50%;
  top: 12%;
  bottom: 50%;
  width: 2px;
  transform: translateX(-50%);
  background: var(--color-primary-active);
  opacity: 0.55;
  border-radius: 999px;
`;

const NeedleDot = styled.div`
  position: absolute;
  left: 50%;
  top: 12%;
  width: 10px;
  height: 10px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: var(--color-primary-active);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
`;

const DialCenter = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  width: 10px;
  height: 10px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.18);
`;

const AngleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const AngleChip = styled.div`
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 10px;
  border: 1px solid var(--container-border-color);
  background: rgba(255, 255, 255, 0.65);
`;

const Stops = styled.div`
  border: 1px solid var(--container-border-color);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.55);
  padding: 10px;
`;

const StopsBar = styled.div`
  position: relative;
  height: 28px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  background:
    linear-gradient(45deg, rgba(0, 0, 0, 0.06) 25%, transparent 25%) 0 0 / 10px 10px,
    linear-gradient(-45deg, rgba(0, 0, 0, 0.06) 25%, transparent 25%) 0 0 / 10px 10px,
    linear-gradient(45deg, transparent 75%, rgba(0, 0, 0, 0.06) 75%) 0 0 / 10px 10px,
    linear-gradient(-45deg, transparent 75%, rgba(0, 0, 0, 0.06) 75%) 0 0 / 10px 10px;
  background-color: rgba(255, 255, 255, 0.55);
`;

const StopsBarHit = styled.div`
  position: relative;
  height: 28px;
`;

const StopsFill = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #ff6a00 0%, #6a5cff 50%, #00d4ff 100%);
`;

const StopHandle = styled.div<{ $left: number; $color: string; $selected?: boolean }>`
  position: absolute;
  top: 50%;
  left: ${({ $left }) => `${$left}%`};
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.95);
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.18),
    0 0 0 1px rgba(0, 0, 0, 0.12);
  background: ${({ $color }) => $color};
  outline: ${({ $selected }) => ($selected ? '2px solid var(--color-primary-active)' : 'none')};
  outline-offset: 2px;
  cursor: pointer;
`;

const StopsMeta = styled.div`
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const Pills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Pill = styled.div`
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 999px;
  border: 1px solid var(--container-border-color);
  background: rgba(255, 255, 255, 0.65);
  line-height: 1;
  opacity: 0.9;
`;

const ColorInput = styled.input`
  width: 88px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--container-border-color);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.65);
  overflow: hidden;
  cursor: pointer;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const FillConf = () => {
  const normalizeAngle = (a: number) => {
    const v = a % 360;
    return v < 0 ? v + 360 : v;
  };

  // 内部角度约定：0°=→，90°=↓（屏幕坐标系）
  // CSS linear-gradient 角度约定：0deg=↑，90deg=→，所以需要 +90 映射
  const toCssAngle = (internalDeg: number) => normalizeAngle(internalDeg + 90);

  const {
    gradient,
    selectedStopId,
    setAngle,
    setSelectedStopId,
    addStop,
    removeStop,
    setStopOffset,
    setStopColor,
  } = useFillStore(
    useShallow((state) => ({
      gradient: state.gradient,
      selectedStopId: state.selectedStopId,
      setAngle: state.setAngle,
      setSelectedStopId: state.setSelectedStopId,
      addStop: state.addStop,
      removeStop: state.removeStop,
      setStopOffset: state.setStopOffset,
      setStopColor: state.setStopColor,
    }))
  );

  const angleDeg = useMemo(() => normalizeAngle(gradient.angle), [gradient.angle]);
  const cssAngleDeg = useMemo(() => toCssAngle(angleDeg), [angleDeg]);

  const stopsSorted = useMemo(() => {
    return gradient.stops
      .map((s) => ({ ...s, offset: Math.min(1, Math.max(0, s.offset)) }))
      .sort((a, b) => a.offset - b.offset);
  }, [gradient.stops]);

  const previewCss = useMemo(() => {
    const parts = stopsSorted.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`);
    return `linear-gradient(${cssAngleDeg}deg, ${parts.join(', ')})`;
  }, [cssAngleDeg, stopsSorted]);

  const dialRef = useRef<HTMLDivElement | null>(null);
  const dialDraggingRef = useRef(false);

  const stopsBarRef = useRef<HTMLDivElement | null>(null);
  const draggingStopIdRef = useRef<string | null>(null);

  const calcAngleFromPointer = (clientX: number, clientY: number) => {
    const el = dialRef.current;
    if (!el) return angleDeg;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // atan2(dy,dx): 0 在 →，90 在 ↓
    const rad = Math.atan2(dy, dx);
    return normalizeAngle((rad * 180) / Math.PI);
  };

  const calcOffsetFromPointer = (clientX: number) => {
    const el = stopsBarRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const t = (clientX - rect.left) / Math.max(1, rect.width);
    return Math.min(1, Math.max(0, t));
  };

  const selectedStop = useMemo(() => {
    return stopsSorted.find((s) => s.id === selectedStopId) ?? stopsSorted[0];
  }, [selectedStopId, stopsSorted]);

  const { run: handleColorChange } = useThrottleFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      const id = selectedStop?.id;
      if (!id) return;
      setStopColor(id, v);
    },
    { wait: 16 }
  );

  return (
    <Wrapper>
      <Panel>
        <Card>
          <CardTitleRow>
            <CardTitle>Preview</CardTitle>
          </CardTitleRow>
          <Preview>
            <PreviewFill style={{ background: previewCss }} />
          </Preview>
        </Card>

        <TwoCol>
          <Card>
            <CardTitleRow>
              <CardTitle>Direction</CardTitle>
            </CardTitleRow>
            <div>
              <AngleDial
                style={{
                  width: isMobile ? '60%' : '100%',
                }}
              >
                <DialGrid />
                <DialNeedle $deg={cssAngleDeg}>
                  <NeedleLine />
                  <NeedleDot />
                </DialNeedle>
                <DialCenter />
                <div
                  ref={dialRef}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    cursor: 'grab',
                    touchAction: 'none',
                  }}
                  onPointerDown={(e) => {
                    dialDraggingRef.current = true;
                    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                    const next = calcAngleFromPointer(e.clientX, e.clientY);
                    setAngle(next);
                  }}
                  onPointerMove={(e) => {
                    if (!dialDraggingRef.current) return;
                    const next = calcAngleFromPointer(e.clientX, e.clientY);
                    setAngle(next);
                  }}
                  onPointerUp={() => {
                    dialDraggingRef.current = false;
                  }}
                  onPointerCancel={() => {
                    dialDraggingRef.current = false;
                  }}
                />
              </AngleDial>
              <AngleRow>
                <Subtle>θ</Subtle>
                <AngleChip>{Math.round(angleDeg)}°</AngleChip>
              </AngleRow>
            </div>
          </Card>

          <Card>
            <CardTitleRow>
              <CardTitle>Color</CardTitle>
              <TinyButton
                type="button"
                style={{
                  display: gradient.stops.length >= 4 ? 'none' : 'block',
                }}
                onClick={() => {
                  const base = selectedStop ?? { offset: 0.5, color: '#ffffff' };
                  addStop({ offset: base.offset, color: base.color });
                }}
              >
                + Tag
              </TinyButton>
            </CardTitleRow>
            <Stops>
              <StopsBarHit ref={stopsBarRef}>
                <StopsBar>
                  <StopsFill style={{ background: previewCss }} />
                  {stopsSorted.map((s) => (
                    <StopHandle
                      key={s.id}
                      $left={s.offset * 100}
                      $color={s.color}
                      $selected={s.id === selectedStopId}
                      onPointerDown={(e) => {
                        draggingStopIdRef.current = s.id;
                        setSelectedStopId(s.id);
                        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        if (draggingStopIdRef.current !== s.id) return;
                        const nextOffset = calcOffsetFromPointer(e.clientX);
                        setStopOffset(s.id, nextOffset);
                      }}
                      onPointerUp={() => {
                        draggingStopIdRef.current = null;
                      }}
                      onPointerCancel={() => {
                        draggingStopIdRef.current = null;
                      }}
                    />
                  ))}
                </StopsBar>
              </StopsBarHit>

              <StopsMeta>
                <Pills>
                  {stopsSorted.map((s, idx) => (
                    <Pill
                      key={s.id}
                      style={{
                        borderColor:
                          s.id === selectedStopId
                            ? 'var(--color-primary-active)'
                            : 'var(--container-border-color)',
                      }}
                      onClick={() => setSelectedStopId(s.id)}
                    >
                      {idx + 1} · {Math.round(s.offset * 100)}%
                    </Pill>
                  ))}
                </Pills>
                <TinyButton
                  type="button"
                  onClick={() => {
                    if (!selectedStop) return;
                    removeStop(selectedStop.id);
                  }}
                >
                  remove
                </TinyButton>
              </StopsMeta>

              <Row style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ColorInput
                    type="color"
                    value={selectedStop?.color ?? '#ffffff'}
                    onChange={handleColorChange}
                  />
                </div>
              </Row>
            </Stops>
          </Card>
        </TwoCol>
      </Panel>
    </Wrapper>
  );
};

export default FillConf;
