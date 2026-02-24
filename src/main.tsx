import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App as AntdApp, ConfigProvider } from 'antd'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'
import { lavenderTheme } from './theme/lavenderTheme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={lavenderTheme}>
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
