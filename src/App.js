import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [testStatus, setTestStatus] = useState('');
  const [vapidPublicKey, setVapidPublicKey] = useState('');

  useEffect(() => {
    // Kiểm tra quyền thông báo
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Lấy VAPID public key từ server
    fetchVapidPublicKey();

    // Lấy service worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        // Kiểm tra subscription hiện tại
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setIsSubscribed(true);
            setSubscription(sub);
          }
        });
      });
    }
  }, []);

  const fetchVapidPublicKey = async () => {
    try {
      const response = await fetch('/.netlify/functions/send-notification?type=vapid-public-key');
      if (response.ok) {
        const data = await response.json();
        setVapidPublicKey(data.publicKey);
        console.log('VAPID public key đã được lấy:', data.publicKey);
      } else {
        console.error('Không thể lấy VAPID public key');
      }
    } catch (error) {
      console.error('Lỗi khi lấy VAPID public key:', error);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        console.log('Quyền thông báo đã được cấp');
        setTestStatus('✅ Quyền thông báo đã được cấp!');
        setTimeout(() => setTestStatus(''), 3000);
      } else {
        console.log('Quyền thông báo bị từ chối');
        setTestStatus('❌ Quyền thông báo bị từ chối');
        setTimeout(() => setTestStatus(''), 3000);
      }
    } catch (error) {
      console.error('Lỗi khi yêu cầu quyền thông báo:', error);
      setTestStatus('❌ Lỗi khi yêu cầu quyền thông báo');
      setTimeout(() => setTestStatus(''), 3000);
    }
  };

  const subscribeToNotifications = async () => {
    try {
      if (!registration) {
        console.log('registration hiện tại:', registration);
        setTestStatus('❌ Service Worker chưa sẵn sàng');
        setTimeout(() => setTestStatus(''), 3000);
        return;
      }

      if (!vapidPublicKey) {
        setTestStatus('❌ VAPID public key chưa sẵn sàng');
        setTimeout(() => setTestStatus(''), 3000);
        return;
      }

      setTestStatus('Đang đăng ký...');

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('Đăng ký thành công:', sub);
      setSubscription(sub);
      setIsSubscribed(true);

      // Gửi subscription lên server
      await sendSubscriptionToServer(sub);
      
      setTestStatus('✅ Đăng ký thông báo thành công!');
      setTimeout(() => setTestStatus(''), 3000);
    } catch (error) {
      console.error('Lỗi khi đăng ký:', error);
      setTestStatus(`❌ Lỗi khi đăng ký: ${error.message}`);
      setTimeout(() => setTestStatus(''), 5000);
    }
  };

  const unsubscribeFromNotifications = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        setSubscription(null);
        setIsSubscribed(false);
        console.log('Đã hủy đăng ký thành công');
        setTestStatus('✅ Đã hủy đăng ký thành công!');
        setTimeout(() => setTestStatus(''), 3000);
      }
    } catch (error) {
      console.error('Lỗi khi hủy đăng ký:', error);
      setTestStatus('❌ Lỗi khi hủy đăng ký');
      setTimeout(() => setTestStatus(''), 3000);
    }
  };

  const sendSubscriptionToServer = async (sub) => {
    try {
      const response = await fetch('/.netlify/functions/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sub)
      });
      
      if (response.ok) {
        console.log('Subscription đã được lưu trên server');
      } else {
        console.error('Lỗi khi lưu subscription');
      }
    } catch (error) {
      console.error('Lỗi khi gửi subscription lên server:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    try {
      // Thêm padding nếu cần
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    } catch (error) {
      console.error('Lỗi khi decode VAPID key:', error);
      throw new Error('VAPID key không hợp lệ');
    }
  };

  const sendTestNotification = async () => {
    setTestStatus('Đang gửi thông báo...');
    
    try {
      // Gửi thông báo trực tiếp nếu có quyền
      if (Notification.permission === 'granted') {
        new Notification('🔔 Thông báo test', {
          body: 'Đây là thông báo test trực tiếp từ trình duyệt!',
          icon: '/favicon/favicon.svg',
          badge: '/favicon/favicon.svg',
          vibrate: [100, 50, 100],
          tag: 'test-notification',
          requireInteraction: true,
          data: {
            url: window.location.origin
          }
        });
        setTestStatus('✅ Thông báo test đã được gửi thành công!');
      }

      // Gửi thông báo qua server nếu đã đăng ký
      if (isSubscribed) {
        // Đảm bảo URL đầy đủ và chính xác
        const testUrl = window.location.origin;
        console.log('Gửi thông báo test với URL:', testUrl);
        
        const response = await fetch('/.netlify/functions/send-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: '🚀 Thông báo test từ server',
            body: 'Đây là thông báo test được gửi qua server!',
            icon: '/favicon/favicon.svg',
            url: testUrl
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          setTestStatus(`✅ Thông báo server: ${result.message}`);
        } else {
          setTestStatus('❌ Lỗi khi gửi thông báo qua server');
        }
      }
    } catch (error) {
      console.error('Lỗi khi gửi thông báo test:', error);
      setTestStatus('❌ Lỗi khi gửi thông báo test');
    }

    // Xóa thông báo status sau 5 giây
    setTimeout(() => setTestStatus(''), 5000);
  };

  const sendLocalNotification = () => {
    if (Notification.permission === 'granted') {
      const testUrl = window.location.origin;
      console.log('Gửi thông báo local với URL:', testUrl);
      
      new Notification('📱 Thông báo local', {
        body: 'Đây là thông báo local không cần server!',
        icon: '/favicon/favicon.svg',
        badge: '/favicon/favicon.svg',
        vibrate: [200, 100, 200],
        tag: 'local-notification',
        requireInteraction: false,
        data: {
          url: testUrl
        }
      });
      setTestStatus('✅ Thông báo local đã được gửi!');
      setTimeout(() => setTestStatus(''), 3000);
    } else {
      setTestStatus('❌ Cần quyền thông báo để gửi thông báo local');
      setTimeout(() => setTestStatus(''), 3000);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🔔 Ứng dụng Push Notification</h1>
        
        <div className="notification-status">
          <h2>📊 Trạng thái thông báo</h2>
          <p>🔐 Quyền: {notificationPermission}</p>
          <p>📝 Đăng ký: {isSubscribed ? '✅ Đã đăng ký' : '❌ Chưa đăng ký'}</p>
          <p>🔑 VAPID Key: {vapidPublicKey ? '✅ Sẵn sàng' : '⏳ Đang tải...'}</p>
        </div>

        <div className="notification-controls">
          {notificationPermission === 'default' && (
            <button onClick={requestNotificationPermission} className="btn btn-primary">
              🔐 Yêu cầu quyền thông báo
            </button>
          )}

          {notificationPermission === 'granted' && !isSubscribed && vapidPublicKey && (
            <button onClick={subscribeToNotifications} className="btn btn-success" disabled={!registration}>
              📝 Đăng ký nhận thông báo
            </button>
          )}

          {isSubscribed && (
            <button onClick={unsubscribeFromNotifications} className="btn btn-danger">
              🚫 Hủy đăng ký thông báo
            </button>
          )}
        </div>

        <div className="test-notification-section">
          <h3>🧪 Test Notifications</h3>
          <div className="test-buttons">
            <button onClick={sendLocalNotification} className="btn btn-warning">
              📱 Gửi thông báo local
            </button>
            <button onClick={sendTestNotification} className="btn btn-info">
              🚀 Gửi thông báo test
            </button>
          </div>
          {testStatus && (
            <div className={`test-status ${testStatus.includes('✅') ? 'success' : testStatus.includes('❌') ? 'error' : 'info'}`}>
              {testStatus}
            </div>
          )}
        </div>

        {notificationPermission === 'denied' && (
          <div className="error-message">
            <p>❌ Quyền thông báo đã bị từ chối. Vui lòng bật lại trong cài đặt trình duyệt.</p>
          </div>
        )}

        {!vapidPublicKey && (
          <div className="error-message">
            <p>⚠️ VAPID key chưa sẵn sàng. Vui lòng đợi hoặc refresh trang.</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App; 