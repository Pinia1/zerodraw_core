import { useRequest } from '@zeroDraw/common';
import { Spin } from 'antd';
import { ImageCard } from '.';
import Fetch from '../../../fetch';

type TaskResult = Awaited<ReturnType<typeof Fetch.httpGetTask>>;

interface RunningRenderProps {
  data: RunningItem;
  onCompleted?: (task: TaskResult) => void;
  onFailed?: (taskId: string) => void;
}

const RunningRender: React.FC<RunningRenderProps> = ({ data, onCompleted, onFailed }) => {
  const { cancel, data: result } = useRequest(() => Fetch.httpGetTask(data.id), {
    pollingInterval: 1200,
    pollingWhenHidden: false,
    onSuccess: (res) => {
      if (['completed', 'failed'].includes(res.status)) {
        cancel();
      }
      if (res.status === 'completed') {
        onCompleted?.(res);
      }
    },
    onError: () => {
      cancel();
      onFailed?.(data.id);
    },
  });

  if (result?.status === 'failed') {
    return (
      <ImageCard style={{ color: 'black', padding: 10, overflow: 'auto' }}>
        {result.error}
      </ImageCard>
    );
  }

  return (
    <ImageCard>
      <Spin spinning={true}>
        <div
          style={{
            aspectRatio: 1,
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            minHeight: 80,
          }}
        />
      </Spin>
    </ImageCard>
  );
};

export default RunningRender;
