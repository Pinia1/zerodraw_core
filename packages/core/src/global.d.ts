interface BaseArgsType {
  image?: string[];
  prompt?: string;
  [key: string]: any;
}

type LibOutput = {
  id: string;
  action: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  s3Key: string;
  args: BaseArgsType | null;
  createdAt: number;
};

type RunningItem = {
  id: string;
  action: string;
  status: 'pending' | 'processing';
  args: BaseArgsType | null;
  createdAt: number;
};
