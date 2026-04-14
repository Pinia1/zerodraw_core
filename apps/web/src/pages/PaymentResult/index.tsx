import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useRequest } from '@zeroDraw/common';
import { Button, Skeleton } from 'antd';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { httpGetOrderStatus } from '../../services/payment';

const statusConfig = {
  paid: { icon: <CheckCircleOutlined />, color: '#52c41a', title: '支付成功', desc: '感谢你的支持，功能已开通。' },
  pending: { icon: <ClockCircleOutlined />, color: '#faad14', title: '等待支付', desc: '如果你已完成支付，请稍等片刻。' },
  closed: { icon: <CloseCircleOutlined />, color: '#ff4d4f', title: '交易关闭', desc: '这笔订单已关闭。' },
} as const;

const PaymentResult: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const outTradeNo = searchParams.get('outTradeNo') || '';

  const { data: order, loading } = useRequest(
    () => httpGetOrderStatus(outTradeNo),
    { refreshDeps: [outTradeNo], ready: !!outTradeNo }
  );

  const status = (order?.status as keyof typeof statusConfig) || 'pending';
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Wrapper>
      <Card>
        {loading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : (
          <>
            <IconWrap $color={config.color}>{config.icon}</IconWrap>
            <Title>{config.title}</Title>
            <Desc>{config.desc}</Desc>
            {order && (
              <OrderInfo>
                <span>订单号: {order.outTradeNo}</span>
                <span>金额: ¥{order.amount}</span>
              </OrderInfo>
            )}
            <Actions>
              <Button type="primary" onClick={() => navigate('/list')} style={{ borderRadius: 8 }}>
                返回首页
              </Button>
              <Button onClick={() => navigate('/plan')} style={{ borderRadius: 8 }}>
                查看方案
              </Button>
            </Actions>
          </>
        )}
      </Card>
    </Wrapper>
  );
};

export default PaymentResult;

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 40px 24px;
  background: #111;
`;

const Card = styled.div`
  background: #1c1c1c;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 48px 40px;
  max-width: 420px;
  width: 100%;
  text-align: center;
`;

const IconWrap = styled.div<{ $color: string }>`
  font-size: 48px;
  color: ${({ $color }) => $color};
  margin-bottom: 16px;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #e8e8e8;
  margin: 0 0 8px;
`;

const Desc = styled.p`
  font-size: 13px;
  color: #666;
  margin: 0 0 24px;
`;

const OrderInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #555;
  margin-bottom: 24px;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;
