import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Đăng ký service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker đăng ký thành công:', registration);
      })
      .catch((error) => {
        console.log('Service Worker đăng ký thất bại:', error);
      });
  });
}

// Nếu bạn muốn bắt đầu đo lường hiệu suất trong ứng dụng, hãy truyền một hàm
// để ghi log kết quả (ví dụ: reportWebVitals(console.log))
// hoặc gửi đến một endpoint phân tích. Tìm hiểu thêm: https://bit.ly/CRA-vitals
reportWebVitals(); 