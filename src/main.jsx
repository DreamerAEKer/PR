import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

window.onerror = function(msg, url, line, col, error) {
  const errMsg = "Global Error: " + msg + "\nAt: " + url + ":" + line + ":" + col;
  console.error(errMsg, error);
  // document.body.innerHTML += `<div style="color:red;padding:20px;background:white;position:fixed;top:0;z-index:9999">${errMsg}</div>`;
};

window.onunhandledrejection = function(event) {
  console.error("Unhandled Rejection:", event.reason);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
