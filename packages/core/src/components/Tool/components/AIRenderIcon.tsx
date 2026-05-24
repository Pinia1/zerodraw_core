import { ThunderboltOutlined } from '@ant-design/icons';

const AIRenderIcon = ({ active }: { active?: boolean }) => (
  <ThunderboltOutlined style={{ fontSize: 16, color: active ? '#faad14' : undefined }} />
);

export default AIRenderIcon;
