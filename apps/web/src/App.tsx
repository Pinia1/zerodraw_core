import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { ConfigProvider } from 'antd';
import { useTranslation } from 'react-i18next';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

function App() {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'zh' ? zhCN : enUS;

  return (
    <ConfigProvider locale={locale}>
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}

export default App;
