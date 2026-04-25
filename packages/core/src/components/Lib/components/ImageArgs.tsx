import { Typography } from 'antd';
import React from 'react';
import styled from 'styled-components';
import Fetch from '../../../fetch';
import Container from '../../Container';

interface ImageArgsProps extends BaseArgsType {}

const resolveImageSrc = (value: string, type: 'thumbnail' | 'original') => {
  if (/^https?:\/\//i.test(value)) return value;
  return `${type === 'thumbnail' ? Fetch.thumbnailUrl : Fetch.fileUrl}/${value}`;
};

const ImageArgs: React.FC<ImageArgsProps> = (props) => {
  const { prompt, aspectRatio, imageSize, image, model } = props;
  const refImages = Array.isArray(image) ? image.filter(Boolean) : [];
  // const { handleCopy, loading } = useCopy({
  //   onSuccess: () => {
  //     message.success('Copied');
  //   },
  //   onError: (error) => {
  //     message.error(error.message);
  //   },
  // });

  return (
    <Container>
      <Panel>
        <Section>
          <Label>Prompt</Label>
          <PromptText
            copyable={{
              tooltips: false,
            }}
            ellipsis={{ rows: 12, expandable: true, symbol: 'more' }}
          >
            {prompt || '-'}
          </PromptText>
        </Section>

        <MetaRow>
          <MetaItem>
            <Label>Size</Label>
            <MetaValue>{imageSize || '-'}</MetaValue>
          </MetaItem>
          <MetaItem>
            <Label>AspectRatio</Label>
            <MetaValue>{aspectRatio}</MetaValue>
          </MetaItem>
        </MetaRow>

        <MetaRow>
          <MetaItem>
            <Label>model</Label>
            <MetaValue>{model || '-'}</MetaValue>
          </MetaItem>
        </MetaRow>

        {refImages.length > 0 && (
          <Section>
            <Label>Reference Images</Label>
            <RefList>
              {refImages.map((item) => {
                const thumbnail = resolveImageSrc(item, 'thumbnail');
                return (
                  <RefThumbWrap key={item}>
                    <RefThumb src={thumbnail} alt="reference" />
                    {/* <CopyBtn
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(`${Fetch.apiUrl}/api/file/volc/stream/${item}`);
                      }}
                    >
                      {loading ? <LoadingOutlined /> : <CopyOutlined />}
                    </CopyBtn> */}
                  </RefThumbWrap>
                );
              })}
            </RefList>
          </Section>
        )}
      </Panel>
    </Container>
  );
};

export default React.memo(ImageArgs);

const Panel = styled.div`
  position: absolute;
  top: 20px;
  right: 40px;
  width: 300px;
  height: calc(100vh - 40px);
  overflow: auto;
  border-radius: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  color: #fff;
`;

const Section = styled.div`
  &:not(:last-child) {
    margin-bottom: 12px;
  }
`;

const Label = styled.div`
  font-size: 12px;
  line-height: 18px;
  opacity: 0.75;
  margin-bottom: 4px;
`;

const PromptText = styled(Typography.Paragraph)`
  margin: 0 !important;
  color: #fff !important;
  font-size: 13px;
  line-height: 20px;
`;

const MetaRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
`;

const MetaItem = styled.div`
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
`;

const MetaValue = styled.div`
  font-size: 13px;
  line-height: 20px;
`;

const RefList = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
`;

const RefThumbWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const CopyBtn = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.85);
  }
`;

const RefThumb = styled.img`
  width: 134px;
  border-radius: 8px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
`;
