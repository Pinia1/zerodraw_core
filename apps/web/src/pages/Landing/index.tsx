import { Icons } from '@zeroDraw/core';
import styled from 'styled-components';

const navItems = ['功能', '定价', '模板', '帮助', '更新日志'];

const doodles = [
  { text: '⌁', x: '24%', y: '26%', color: '#b9a7ff', size: 58, rotate: -18 },
  { text: '○', x: '37%', y: '25%', color: '#ffd7a8', size: 22, rotate: 0 },
  { text: '⌁', x: '61%', y: '18%', color: '#9ed1ff', size: 52, rotate: 75 },
  { text: '⌒', x: '72%', y: '39%', color: '#ffc58d', size: 42, rotate: 12 },
  { text: '▱', x: '76%', y: '48%', color: '#c6b8ff', size: 38, rotate: -18 },
  { text: '✦', x: '68%', y: '32%', color: '#91f1a5', size: 28, rotate: 16 },
  { text: '⌁', x: '43%', y: '50%', color: '#ffc58d', size: 48, rotate: 40 },
  { text: '○', x: '58%', y: '53%', color: '#ffd7a8', size: 22, rotate: 0 },
  { text: '⌒', x: '31%', y: '45%', color: '#90cfff', size: 38, rotate: -28 },
  { text: '•', x: '74%', y: '35%', color: '#ff9a9a', size: 30, rotate: 0 },
  { text: '•', x: '36%', y: '48%', color: '#91f1a5', size: 34, rotate: 0 },
];

const LandingPage = () => {
  return (
    <Page>
      <Header />
      <Hero />
      <BoardPreview />
    </Page>
  );
};

const Header = () => (
  <HeaderBar>
    <Brand>
      <Icons.IconLogo />
    </Brand>
    <Nav>
      {navItems.map((item) => (
        <NavLink key={item}>{item}</NavLink>
      ))}
    </Nav>
    <HeaderActions>
      <IconButton>⌘</IconButton>
      <GithubBadge>★ 125k</GithubBadge>
      <GhostButton>登录</GhostButton>
      <PrimaryButton>免费白板</PrimaryButton>
    </HeaderActions>
  </HeaderBar>
);

const Hero = () => (
  <HeroSection>
    <DoodleLayer>
      {doodles.map((item, index) => (
        <Doodle
          $color={item.color}
          $rotate={item.rotate}
          $size={item.size}
          $x={item.x}
          $y={item.y}
          key={`${item.text}-${index}`}
        >
          {item.text}
        </Doodle>
      ))}
      <FloatingTag $x="32%" $y="19%" $rotate={-3}>brainstorm</FloatingTag>
      <FloatingTag $x="76%" $y="34%" $rotate={2}>rainbow sketch</FloatingTag>
      <FloatingTag $x="16%" $y="42%" $rotate={-1}>all ideas</FloatingTag>
    </DoodleLayer>
    <HeroContent>
      <Headline>
        浏览器里的
        <Highlight>自由白板</Highlight>
        创作工具
      </Headline>
      <SubTitle>Ideate, Collaborate, Share. Simply with ZeroDraw.</SubTitle>
      <GithubButton>★ 125k on Github</GithubButton>
      <PenNib />
    </HeroContent>
  </HeroSection>
);

const BoardPreview = () => (
  <PreviewShell>
    <PreviewHeader>
      <PreviewLeft>
        <SquareButton>▥</SquareButton>
        <SquareButton>☰</SquareButton>
        <SceneName>ZeroDraw scene</SceneName>
      </PreviewLeft>
      <ToolBar>
        {['🔒', '✣', '□', '◇', '○', '→', '−', '✎', 'Aa', '▧', '⌫', '⌘'].map((item) => (
          <ToolItem key={item}>{item}</ToolItem>
        ))}
      </ToolBar>
      <PreviewRight>
        <AvatarStack>
          {['#7664f6', '#9ed1ff', '#ffc58d', '#ff9a9a', '#91f1a5'].map((color) => (
            <Avatar $color={color} key={color} />
          ))}
        </AvatarStack>
        <ShareButton>↗</ShareButton>
      </PreviewRight>
    </PreviewHeader>
    <PreviewBody>
      <PalettePanel />
      <CanvasPlaceholder />
      <CommentsPanel />
    </PreviewBody>
  </PreviewShell>
);

const PalettePanel = () => (
  <Palette>
    <PanelTitle>Stroke</PanelTitle>
    <Swatches>
      {['#12151a', '#e83d4c', '#42c76b', '#3478f6', '#ff8a21'].map((color) => (
        <Swatch $color={color} key={color} />
      ))}
    </Swatches>
    <PanelTitle>Background</PanelTitle>
    <Swatches>
      {['#f3edff', '#ffd1dc', '#c9f4d2', '#bfe1ff', '#ffe49a'].map((color) => (
        <Swatch $color={color} key={color} />
      ))}
    </Swatches>
    <PanelTitle>Most used colors</PanelTitle>
    <ColorGrid>
      {['#2aa66a', '#1f8fb2', '#5b68e8', '#9b4bd4', '#d9436f', '#ff7a21'].map((color) => (
        <ColorCell $color={color} key={color} />
      ))}
    </ColorGrid>
  </Palette>
);

const CanvasPlaceholder = () => (
  <CanvasArea>
    <CanvasHint>图片 / 产品画面占位区</CanvasHint>
    <SketchBox $x="30%" $y="30%" $color="#8f7bff">ZeroDraw</SketchBox>
    <SketchBox $x="52%" $y="48%" $color="#91f1a5">AI canvas</SketchBox>
    <SketchLine $x="38%" $y="42%" $rotate={14} />
    <SketchLine $x="50%" $y="62%" $rotate={-10} />
    <CursorDot />
  </CanvasArea>
);

const CommentsPanel = () => (
  <Comments>
    <Tabs>
      <Tab $active>💬</Tab>
      <Tab>▣</Tab>
    </Tabs>
    <SearchBox>⌕ Quick search</SearchBox>
    <CommentCard>✓ Mark all as read</CommentCard>
    <CommentCard>↕ Sort by date</CommentCard>
    <CommentCard>↕ Sort by unread</CommentCard>
  </Comments>
);

const Page = styled.div`
  min-height: 100dvh;
  overflow: auto;
  color: #f8f7ff;
  background:
    radial-gradient(circle at 50% 24%, rgba(121, 101, 255, 0.18), transparent 30%),
    radial-gradient(circle at 15% 80%, rgba(94, 242, 157, 0.1), transparent 28%),
    linear-gradient(180deg, #080a12 0%, #0c1019 48%, #090b10 100%);
`;

const HeaderBar = styled.header`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 54px;
  height: 92px;
  padding: 0 48px;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr auto;
    padding: 0 22px;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  color: #fff;
  font-size: 30px;
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 42px;

  @media (max-width: 1000px) {
    display: none;
  }
`;

const NavLink = styled.a`
  color: #d7d2ff;
  font-size: 15px;
  letter-spacing: 0.02em;
  text-decoration: none;
  cursor: pointer;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const IconButton = styled.button`
  width: 38px;
  height: 38px;
  border: 0;
  color: #d8d2ff;
  background: transparent;
  font-size: 18px;

  @media (max-width: 1000px) {
    display: none;
  }
`;

const GithubBadge = styled.span`
  color: #d8d2ff;
  font-size: 14px;

  @media (max-width: 1000px) {
    display: none;
  }
`;

const GhostButton = styled.button`
  height: 50px;
  padding: 0 28px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  color: #fff;
  background: rgba(255, 255, 255, 0.03);
  font: inherit;
`;

const PrimaryButton = styled.button`
  height: 50px;
  padding: 0 30px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(135deg, #7b6ff6, #6659db);
  box-shadow: 0 12px 30px rgba(96, 78, 225, 0.42);
  font: inherit;
  font-weight: 700;
`;

const HeroSection = styled.section`
  position: relative;
  min-height: 660px;
  display: grid;
  place-items: center;
  padding: 70px 24px 120px;
`;

const DoodleLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

const Doodle = styled.span<{
  $x: string;
  $y: string;
  $color: string;
  $size: number;
  $rotate: number;
}>`
  position: absolute;
  left: ${({ $x }) => $x};
  top: ${({ $y }) => $y};
  color: ${({ $color }) => $color};
  font-size: ${({ $size }) => $size}px;
  opacity: 0.86;
  transform: rotate(${({ $rotate }) => $rotate}deg);
`;

const FloatingTag = styled.span<{ $x: string; $y: string; $rotate: number }>`
  position: absolute;
  left: ${({ $x }) => $x};
  top: ${({ $y }) => $y};
  padding: 5px 10px;
  border: 1px solid rgba(255, 255, 255, 0.38);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.78);
  background: rgba(255, 255, 255, 0.06);
  font-size: 12px;
  transform: rotate(${({ $rotate }) => $rotate}deg);
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  text-align: center;
`;

const Headline = styled.h1`
  max-width: 920px;
  margin: 0;
  color: #f7f4ff;
  font-size: clamp(54px, 6vw, 84px);
  line-height: 1.08;
  letter-spacing: -0.055em;
  font-weight: 800;
`;

const Highlight = styled.span`
  display: inline-block;
  margin: 0 14px;
  padding: 0 18px 6px;
  border-radius: 14px;
  color: #0a0d14;
  background: #baf7c8;
  font-family: ZeroDraw, system-ui, sans-serif;
  font-weight: 700;
  transform: rotate(-1deg);
`;

const SubTitle = styled.p`
  margin: 62px 0 28px;
  color: #d7d2ff;
  font-size: 22px;
`;

const GithubButton = styled.button`
  height: 38px;
  padding: 0 22px;
  border: 1px solid #c99836;
  border-radius: 10px;
  color: #2a210e;
  background: #ffe096;
  font: inherit;
  font-weight: 700;
`;

const PenNib = styled.div`
  position: relative;
  width: 38px;
  height: 140px;
  margin-top: 64px;
  border: 4px solid #d8d6e7;
  border-bottom: 0;
  border-radius: 5px 5px 18px 18px;
  background: #1d2230;
  transform: perspective(100px) rotateX(8deg);

  &::before {
    content: '';
    position: absolute;
    left: -4px;
    right: -4px;
    bottom: -34px;
    height: 42px;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
    border: 4px solid #d8d6e7;
    border-top: 0;
    background: #1d2230;
  }

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -8px;
    width: 14px;
    height: 14px;
    border: 3px solid #d8d6e7;
    border-radius: 999px;
    transform: translateX(-50%);
  }
`;

const PreviewShell = styled.section`
  width: min(1780px, calc(100% - 104px));
  min-height: 430px;
  margin: -58px auto 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px 24px 0 0;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 -24px 80px rgba(0, 0, 0, 0.34);

  @media (max-width: 1000px) {
    width: calc(100% - 32px);
  }
`;

const PreviewHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 18px;
  height: 92px;
  padding: 0 24px;
  color: #222432;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
    height: auto;
    padding: 20px;
  }
`;

const PreviewLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SquareButton = styled.button`
  width: 44px;
  height: 44px;
  border: 1px solid #e3e0f0;
  border-radius: 9px;
  color: #4d4a5e;
  background: #fff;
  font-size: 18px;
`;

const SceneName = styled.span`
  margin-left: 12px;
  color: #696579;
  font-size: 14px;
`;

const ToolBar = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  height: 54px;
  padding: 0 20px;
  border: 1px solid #ebe8f5;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(23, 20, 38, 0.08);
`;

const ToolItem = styled.span`
  color: #5d5a6d;
  font-size: 15px;
`;

const PreviewRight = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;

  @media (max-width: 1000px) {
    display: none;
  }
`;

const AvatarStack = styled.div`
  display: flex;
  align-items: center;
`;

const Avatar = styled.span<{ $color: string }>`
  width: 22px;
  height: 22px;
  margin-left: -5px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: ${({ $color }) => $color};
`;

const ShareButton = styled.button`
  width: 50px;
  height: 50px;
  border: 0;
  border-radius: 10px;
  color: #fff;
  background: #6659db;
  font-size: 22px;
`;

const PreviewBody = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr 300px;
  gap: 16px;
  height: 350px;
  padding: 0 24px 24px;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
    height: 420px;
  }
`;

const Palette = styled.aside`
  padding: 18px;
  border: 1px solid #eeeaf5;
  border-radius: 12px;
  background: #fff;

  @media (max-width: 1000px) {
    display: none;
  }
`;

const PanelTitle = styled.div`
  margin: 0 0 12px;
  color: #696579;
  font-size: 13px;

  & + div {
    margin-bottom: 18px;
  }
`;

const Swatches = styled.div`
  display: flex;
  gap: 8px;
`;

const Swatch = styled.span<{ $color: string }>`
  width: 24px;
  height: 24px;
  border-radius: 5px;
  background: ${({ $color }) => $color};
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
`;

const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 28px);
  gap: 8px;
`;

const ColorCell = styled.span<{ $color: string }>`
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: ${({ $color }) => $color};
`;

const CanvasArea = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  background:
    radial-gradient(#d7d2e8 1px, transparent 1px),
    #fbfaf7;
  background-size: 22px 22px;
`;

const CanvasHint = styled.div`
  position: absolute;
  left: 50%;
  top: 44%;
  color: rgba(40, 36, 56, 0.18);
  font-size: 42px;
  font-weight: 800;
  transform: translate(-50%, -50%);
`;

const SketchBox = styled.div<{ $x: string; $y: string; $color: string }>`
  position: absolute;
  left: ${({ $x }) => $x};
  top: ${({ $y }) => $y};
  padding: 12px 20px;
  border: 3px solid ${({ $color }) => $color};
  border-radius: 12px;
  color: #211e2d;
  background: rgba(255, 255, 255, 0.7);
  font-weight: 700;
  transform: rotate(-2deg);
`;

const SketchLine = styled.span<{ $x: string; $y: string; $rotate: number }>`
  position: absolute;
  left: ${({ $x }) => $x};
  top: ${({ $y }) => $y};
  width: 160px;
  height: 4px;
  border-radius: 999px;
  background: #6659db;
  transform: rotate(${({ $rotate }) => $rotate}deg);
`;

const CursorDot = styled.span`
  position: absolute;
  left: 46%;
  bottom: 18%;
  width: 20px;
  height: 20px;
  border: 4px solid #fff;
  border-radius: 999px;
  background: #f0a34c;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
`;

const Comments = styled.aside`
  padding: 16px;
  border-left: 4px solid #6659db;
  border-radius: 12px;
  background: #fff;

  @media (max-width: 1000px) {
    display: none;
  }
`;

const Tabs = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 28px;
`;

const Tab = styled.span<{ $active?: boolean }>`
  display: grid;
  place-items: center;
  width: 48px;
  height: 40px;
  border-radius: 9px;
  color: ${({ $active }) => ($active ? '#fff' : '#5d5a6d')};
  background: ${({ $active }) => ($active ? '#6659db' : '#f4f2fb')};
`;

const SearchBox = styled.div`
  padding: 16px;
  border-radius: 9px;
  color: #8f8a9e;
  background: #f4f2fb;
`;

const CommentCard = styled.div`
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 9px;
  color: #4a4658;
  background: #fff;
  box-shadow: 0 0 0 1px #eeeaf5;
`;

export default LandingPage;
