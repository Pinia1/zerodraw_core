import { useMount } from '@monorepo/common';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { githubLogin } from '../../services/login';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
`;

export default () => {
  const navigate = useNavigate();
  useMount(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      githubLogin(code).then((data) => {
        if (data) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          navigate('/');
        }
      });
    } else {
      navigate('/login');
    }
  });
  return <Container>loading...</Container>;
};
