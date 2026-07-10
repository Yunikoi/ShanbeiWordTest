import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { hydrateUserDataFromBoundFile } from './userDataFileStorage.js'

async function bootstrap() {
  try {
    await hydrateUserDataFromBoundFile()
  } catch {
    /* 未绑定文件或权限被拒时仍正常启动 */
  }
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
