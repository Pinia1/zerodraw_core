import { useMount } from '@monorepo/common';
import { message } from 'antd';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
`;

export default () => {
  const executedRef = useRef(false);
  const navigate = useNavigate();
  useMount(() => {
    if (executedRef.current) return;
    executedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      fetch(`http://localhost:3008/github/login?code=${code}`)
        .then((res) => res.json())
        .then((data) => {
          console.log(data);
          if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            navigate('/');
          } else {
            message.error(data.error);
            localStorage.clear();
            setTimeout(() => {
              navigate('/login');
            }, 1000);
          }
        });
    } else {
      navigate('/login');
    }
  });
  return <Container>loading...</Container>;
};
