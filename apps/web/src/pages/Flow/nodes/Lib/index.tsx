import { useRequest } from '@zeroDraw/common';
import { Image, Masonry, Spin } from 'antd';
import React from 'react';
import styled from 'styled-components';
import { httpGetLibOutputs } from '../../../../services/generate';
import { apiUrl, fileUrl, thumbnailUrl } from '../../../../utils';

const Lib: React.FC = () => {
  const { data, loading } = useRequest(() => httpGetLibOutputs({ page: 1, pageSize: 100 }));

  if (loading) {
    return (
      <Container>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}
        >
          <Spin size="large" />
        </div>
      </Container>
    );
  }

  const items = data?.list || [];

  return (
    <Container className="nowheel">
      <Masonry
        columns={4}
        gutter={8}
        items={items.map((item) => ({
          key: item.id,
          data: item,
        }))}
        itemRender={({ data: item }) => (
          <Image
            src={`${apiUrl}${thumbnailUrl}/${item.s3Key}`}
            alt={item.id}
            style={{ width: '100%', borderRadius: 8 }}
            preview={{
              mask: null,
              src: `${apiUrl}${fileUrl}/${item.s3Key}`,
            }}
          />
        )}
      />
    </Container>
  );
};

export default Lib;

const Container = styled.div`
  width: 600px;
  height: 600px;
  padding: 24px;
  overflow-y: auto;
  background: #f5f5f5;
`;
