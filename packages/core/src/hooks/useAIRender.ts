import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AIRenderClient,
  type AIRenderConnectionStatus,
} from '../services/aiRenderClient';
import useAIRenderStore from '../store/useAIRenderStore';

export type AIRenderStatus = AIRenderConnectionStatus;

type SnapshotHandler = (dataUrl: string) => void;

let snapshotHandler: SnapshotHandler | null = null;

/** 由 useWheelLayerCache 在绘制完成后调用 */
export function submitAIRenderSnapshot(dataUrl: string) {
  snapshotHandler?.(dataUrl);
}

/**
 * React 层封装：连接生命周期 + 渲染参数来自 store。
 * 截图时机：复用 useWheelLayerCache 的 exportStageWithBlendModes，不在此轮询 Stage。
 */
export function useAIRender() {
  const { visible, prompt, strength, steps } = useAIRenderStore();

  const [status, setStatus] = useState<AIRenderStatus>('disconnected');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<AIRenderClient | null>(null);
  const paramsRef = useRef({ visible, prompt, strength, steps });
  paramsRef.current = { visible, prompt, strength, steps };

  if (!clientRef.current) {
    clientRef.current = new AIRenderClient({
      onStatusChange: setStatus,
      onResult: (msg) => {
        setResultImage(msg.image);
        setElapsedMs(msg.elapsed_ms);
        setError(null);
      },
      onError: (msg) => {
        setError(msg.message);
      },
    });
  }

  useEffect(() => {
    const client = clientRef.current!;
    if (visible) {
      client.connect();
    } else {
      client.disconnect();
      setResultImage(null);
      setElapsedMs(0);
      setError(null);
    }
    return () => {
      client.disconnect();
    };
  }, [visible]);

  useEffect(() => {
    snapshotHandler = (dataUrl) => {
      const { visible: v, prompt: p, strength: s, steps: st } = paramsRef.current;
      if (!v) return;
      clientRef.current?.sendFrame({ image: dataUrl, prompt: p, strength: s, steps: st });
    };
    return () => {
      snapshotHandler = null;
    };
  }, []);

  const ping = useCallback(() => {
    clientRef.current?.ping();
  }, []);

  return { status, resultImage, elapsedMs, error, ping };
}
