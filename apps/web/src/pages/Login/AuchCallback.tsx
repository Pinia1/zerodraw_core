import { useMount } from '@zeroDraw/common';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { githubLogin } from '../../services/login';
import { useUserStore } from '../../store/useUserStore';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
`;

const AuthCallback = () => {
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  useMount(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      githubLogin({ code })
        .then((data) => {
          if (data) {
            setUser(data.user);
            localStorage.setItem('token', data.token);
            navigate('/');
          }
        })
        .catch(loginError);
    } else {
      loginError();
    }
  });
  const loginError = () => {
    navigate('/login');
  };
  return <Container>loading...</Container>;
};
export default AuthCallback;
