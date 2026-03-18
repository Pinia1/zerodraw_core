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
  const sizeStr = data.args?.size as string | undefined;
  const [w, h] = sizeStr?.split('x').map(Number) ?? [];

  const { cancel } = useRequest(() => Fetch.httpGetTask(data.id), {
    pollingInterval: 1200,
    pollingWhenHidden: false,
    onSuccess: (res) => {
      if (['completed', 'failed'].includes(res.status)) {
        cancel();
      }
      if (res.status === 'completed') {
        onCompleted?.(res);
      } else if (res.status === 'failed') {
        onFailed?.(res.id);
      }
    },
    onError: () => {
      cancel();
      onFailed?.(data.id);
    },
  });

  return (
    <ImageCard>
      <Spin spinning={true}>
        <div
          style={{
            width: '100%',
            aspectRatio: 1,
            background: 'rgba(255,255,255,0.04)',
            minHeight: 80,
          }}
        />
      </Spin>
    </ImageCard>
  );
};

export default RunningRender;
