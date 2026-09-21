import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#252733',
            color: '#e1e2e5',
            border: '1px solid #3a3d4a',
            borderRadius: '10px',
            fontSize: '13px',
            fontFamily: 'IBM Plex Sans, sans-serif',
          },
          success: { iconTheme: { primary: '#34d399', secondary: '#252733' } },
          error:   { iconTheme: { primary: '#f87171', secondary: '#252733' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
