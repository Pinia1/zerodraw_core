import { CheckOutlined } from '@ant-design/icons';
import type { PlanKey } from '@zeroDraw/api-contract';
import { Button, message } from 'antd';
import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { httpCreateOrder } from '../../services/payment';
import { MainHeader, PageTitle, ScrollArea } from '../Project/components';

interface PlanOption {
  key: string;
  name: string;
  emoji: string;
  price: string;
  unit: string;
  slogans: string[];
  accent: string;
  features: string[];
  buttonText: string;
  rotation: number;
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const planDefs: PlanOption[] = [
  {
    key: 'free',
    name: 'Free',
    emoji: '🪑',
    price: '¥0',
    unit: '永久',
    slogans: [
      '我相信每个人都值得拥有一把椅子',
      '免费的东西最贵，但这个真的免费',
      '不要钱，也不要你的数据，我要了也没地方放',
      '零元购，合法版',
      '限时免费。开玩笑的，一直免费',
      '这个方案的利润率是 0%，已经是我能给的最低价了',
      '不花钱就能用，但花了钱能获得一种优越感',
      '如果世界上所有东西都这个价就好了',
    ],
    accent: '#666',
    features: ['3 个项目', '基础画笔工具', '数据存在你自己电脑上', '720p 导出'],
    buttonText: '已经是了',
    rotation: -16,
  },
  {
    key: 'monthly',
    name: 'Monthly',
    emoji: '📎',
    price: '¥29',
    unit: '/月',
    slogans: [
      '一杯咖啡的价格，如果你喝很贵的咖啡',
      '比你的视频会员便宜，而且更有用',
      '随时取消，我不会发消息问你为什么',
      '按月付，承诺恐惧症友好',
      '月付用户是这个软件的临时工',
      '你可以先试一个月，然后假装忘记取消',
      '每月自动扣款，就像你的其他订阅一样',
      '这是试探性消费的最佳选择',
    ],
    accent: '#6254e8',
    features: ['无限项目', '全部画笔和滤镜', '云端同步', 'AI 生成 100 次/月'],
    buttonText: '好的',
    rotation: -8,
  },
  {
    key: 'quarterly',
    name: 'Quarterly',
    emoji: '🧾',
    price: '¥69',
    unit: '/季',
    slogans: [
      '省下来的钱刚好够打一次车',
      '季度付说明你是一个做事有计划的人',
      '三个月，刚好是一段新习惯养成的时间',
      '比月付便宜，比年付灵活，精准卡在中间',
      '选这个的人通常性格温和，做事稳当',
      '不长不短，像一段刚好的关系',
      '你大概率会在第二个月忘记自己买了这个',
      '给自己三个月的时间，不够的话再续三个月',
    ],
    accent: '#52c41a',
    features: ['月度版所有功能', '算下来便宜 20%', '4K 导出', 'AI 生成 300 次/季'],
    buttonText: '合理',
    rotation: 0,
  },
  {
    key: 'yearly',
    name: 'Yearly',
    emoji: '🗿',
    price: '¥199',
    unit: '/年',
    slogans: [
      '这个价格说明你对未来有规划',
      '一年后你会感谢现在的自己，也可能忘了',
      '年付用户在我心里有一个单独的文件夹',
      '如果我跑路了，这是亏得最多的一档',
      '年付用户是我精神上的股东',
      '买了之后你会有一种投资了的错觉',
      '你的信任让我压力很大，但我会努力的',
      '一年，说长不长，说短也不短，就像这句话',
    ],
    accent: '#faad14',
    features: ['以上所有功能', 'AI 生成不限次', '优先客服', '一个你可能永远不会用的专属铭牌'],
    buttonText: '就这样',
    rotation: 8,
  },
  {
    key: 'banana',
    name: '来两斤香蕉',
    emoji: '🍌',
    price: '¥60',
    unit: '/斤',
    slogans: [
      '深圳发货，作者亲自送，货到付款',
      '买不了吃亏买不了上当，但能买到香蕉',
      '这是整个页面里唯一能吃的东西',
      '技术支持不会变快，但作者会开心一点',
      '不是比喻，真的是香蕉',
      '你买的是水果，不是软件，请注意区分',
      '配送范围仅限深圳，外地用户请自行想象',
    ],
    accent: '#ffe24d',
    features: ['一斤香蕉', '作者本人配送', '可能会顺便聊两句', '不影响你使用免费版'],
    buttonText: '下单',
    rotation: 16,
  },
];

const buildPlans = () => planDefs.map((p) => ({ ...p, slogan: pick(p.slogans) }));

const normalLines = [
  '所有方案都包含画画功能，因为这是一个画画软件。',
  '选便宜的也行，我不会judge你。',
  '你现在看到的价格明天可能还是一样的。',
  '我花了很长时间定这个价格，然后随便写了个数。',
  '如果你正在对比竞品，希望你比完还是选我。',
  '以下价格不含运费，因为这是软件。',
  '你已经花了几秒钟看这句话了，不如继续往下看。',
  '不买也没关系，你来看看就是对我最大的支持。',
  '价格含税。其实我也不确定，但听起来更正规。',
  '我试过定更高的价，但我自己都不好意思。',
  '如果你觉得贵，那是因为你还没用过。用过之后你可能还是觉得贵。',
  '每一分钱都会被用来买咖啡和服务器，比例大概三七开。',
  '这是一个人的产品，所以bug修得慢，但修得真诚。',
  '你看到了吗，不可惜',
];

const careLines = [
  '别感冒。',
  '多喝水。',
  '今天早点睡。',
  '坐久了起来走走。',
  '别忘了吃饭。',
  '深呼吸。',
  '出门记得带伞。',
  '今天也辛苦了。',
  '头发还在吗？',
  '别熬夜。',
  '吃点水果。',
  '揉揉眼睛。',
  '伸个懒腰。',
  '窗户开了吗？通通风。',
  '泡杯茶吧。',
  '肩膀放松一下。',
];

const footerLines = [
  '如果以上方案都不适合你，你也可以关掉这个页面，什么都不会发生。',
  '你已经看到底了，说明你是一个有耐心的人。',
  '以上就是全部了，没有隐藏关卡。',
  '感谢阅读到这里，虽然这不是一篇文章。',
  '如果你截图发朋友圈，我会知道的。不会，但我希望你发。',
  '这行字存在的意义是让页面看起来有个结尾。',
  '如果你刷新页面，上面的文案会变，这行也会。',
  '没有了，真的没有了。',
  '页面到底了，就像人生一样，总要有个尽头。',
  '你是那种会把网页拉到最底下的人。我也是。',
  '下面没有彩蛋。你现在知道了。',
  '恭喜你发现了这个页面的地基。',
  '这里本来想放一个优惠券，但我没有。',
  '如果你什么都不选，我们依然是朋友。',
  '不管你选哪个，我都会认真写代码的。大概。',
  '写到这里我也没什么好说的了，就这样吧。',
  '往上翻翻，也许你会改变主意。也许不会。',
  '感谢你花时间看完一个定价页面，这不常见。',
];

const pickLine = () =>
  Math.random() < 0.15
    ? careLines[Math.floor(Math.random() * careLines.length)]
    : normalLines[Math.floor(Math.random() * normalLines.length)];

const Plan: React.FC = () => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [subtitle] = useState(pickLine);
  const [footer] = useState(() => pick(footerLines));
  const [plans] = useState(buildPlans);
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planKey: string) => {
    if (planKey === 'free') return;
    setLoading(planKey);
    try {
      const { payUrl } = await httpCreateOrder({ planKey: planKey as PlanKey });
      window.location.href = payUrl;
    } catch {
      message.error('创建订单失败，请稍后重试');
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <MainHeader>
        <PageTitle>Plan</PageTitle>
      </MainHeader>
      <ScrollArea>
        <ContentWrapper>
          <Header>
            <Title>Pricing</Title>
            <Desc>{subtitle}</Desc>
          </Header>
          <FanStage>
            <FanContainer>
              {plans.map((plan) => {
                const isHovered = hovered === plan.key;
                return (
                  <FanCard
                    key={plan.key}
                    $rotation={plan.rotation}
                    $accent={plan.accent}
                    $hovered={isHovered}
                    onMouseEnter={() => setHovered(plan.key)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <Emoji>{plan.emoji}</Emoji>
                    <PlanName>{plan.name}</PlanName>
                    <Slogan>{plan.slogan}</Slogan>
                    <PriceRow>
                      <Price $accent={plan.accent}>{plan.price}</Price>
                      <Unit>{plan.unit}</Unit>
                    </PriceRow>
                    <FeatureList>
                      {plan.features.map((f) => (
                        <Feature key={f}>
                          <CheckOutlined
                            style={{ color: plan.accent, fontSize: 10, flexShrink: 0 }}
                          />
                          <span>{f}</span>
                        </Feature>
                      ))}
                    </FeatureList>
                    <ActionBtn
                      $accent={plan.accent}
                      disabled={plan.key === 'free'}
                      loading={loading === plan.key}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubscribe(plan.key);
                      }}
                    >
                      {plan.buttonText}
                    </ActionBtn>
                  </FanCard>
                );
              })}
            </FanContainer>
          </FanStage>
          <Footer>{footer}</Footer>
        </ContentWrapper>
      </ScrollArea>
    </>
  );
};

export default Plan;

// ─── Styled ──────────────────────────────────────────────────────────────────

const BREAKPOINT = '900px';

const ContentWrapper = styled.div`
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
`;

const Header = styled.div`
  text-align: center;
  padding: 20px 24px 8px;
`;

const Title = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: #e8e8e8;
  margin: 0 0 6px;
`;

const Desc = styled.p`
  font-size: 13px;
  color: #666;
  margin: 0;
`;

const FanStage = styled.div`
  display: flex;
  justify-content: center;
  padding: 60px 24px 40px;
  perspective: 1200px;

  @media (max-width: ${BREAKPOINT}) {
    padding: 24px 16px 32px;
    perspective: none;
  }
`;

const FanContainer = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0;
  position: relative;

  @media (max-width: ${BREAKPOINT}) {
    flex-direction: column;
    align-items: center;
    gap: 16px;
    width: 100%;
    max-width: 360px;
  }
`;

const FanCard = styled.div<{ $rotation: number; $accent: string; $hovered: boolean }>`
  width: clamp(160px, 18vw, 200px);
  min-height: 340px;
  background: #1c1c1c;
  border: 1.5px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 24px 18px 18px;
  display: flex;
  flex-direction: column;
  transform-origin: bottom center;
  transform: rotate(${({ $rotation }) => $rotation}deg);
  transition:
    transform 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease,
    z-index 0s;
  cursor: pointer;
  margin: 0 -8px;
  position: relative;
  z-index: 1;

  ${({ $hovered, $accent }) =>
    $hovered &&
    css`
      transform: rotate(0deg) translateY(-20px);
      border-color: ${$accent};
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
      z-index: 10;
    `}

  @media (max-width: ${BREAKPOINT}) {
    width: 100%;
    min-height: auto;
    margin: 0;
    transform: none;

    ${({ $hovered, $accent }) =>
      $hovered &&
      css`
        transform: none;
        border-color: ${$accent};
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      `}
  }
`;

const Emoji = styled.div`
  font-size: 32px;
  margin-bottom: 10px;
  line-height: 1;
`;

const PlanName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #e8e8e8;
  margin-bottom: 4px;
`;

const Slogan = styled.div`
  font-size: 11px;
  color: #666;
  margin-bottom: 14px;
  line-height: 1.4;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 3px;
  margin-bottom: 16px;
`;

const Price = styled.span<{ $accent: string }>`
  font-size: 26px;
  font-weight: 800;
  color: ${({ $accent }) => ($accent === '#666' ? '#999' : $accent)};
  line-height: 1;
`;

const Unit = styled.span`
  font-size: 11px;
  color: #555;
`;

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 18px;
  flex: 1;
`;

const Feature = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11px;
  color: #999;
  line-height: 1.3;
`;

const ActionBtn = styled(Button)<{ $accent: string }>`
  && {
    width: 100%;
    border-radius: 8px;
    height: 34px;
    font-size: 12px;
    font-weight: 600;
    background: ${({ $accent, disabled }) => (disabled ? 'rgba(255,255,255,0.05)' : $accent)};
    border-color: ${({ $accent, disabled }) => (disabled ? 'rgba(255,255,255,0.08)' : $accent)};
    color: ${({ disabled, $accent }) =>
      disabled ? '#555' : $accent === '#ffe24d' || $accent === '#faad14' ? '#1a1a1a' : '#fff'};
    &:hover:not(:disabled) {
      opacity: 0.85;
      background: ${({ $accent }) => $accent};
      border-color: ${({ $accent }) => $accent};
    }
  }
`;

const Footer = styled.p`
  text-align: center;
  font-size: 12px;
  color: #444;
  padding: 0 24px 32px;

  @media (max-width: ${BREAKPOINT}) {
    padding: 0 16px 24px;
  }
`;
