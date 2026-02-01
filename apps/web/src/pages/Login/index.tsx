import { Button } from 'antd';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import styled from 'styled-components';
import { useUserStore } from '../../store/useUserStore';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
`;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useUserStore();
  const handleGithubLogin = () => {
    const client_id = 'Ov23lim2JDpZfclnzJ0w';
    const redirect_uri = 'http://localhost:3000/auth';
    const path = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}`;
    window.open(path, '_self');
    setLoading(true);
  };

  if (user) {
    return <Navigate to="/" replace />;
  }
  return (
    <Container>
      <Button loading={loading} onClick={handleGithubLogin} type="primary">
        Github Login
      </Button>
    </Container>
  );
};
export default Login;
