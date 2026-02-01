import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 使用 BrowserRouter (history 模式)
ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>
);
