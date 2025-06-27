// Service Worker cho Push Notifications
const CACHE_NAME = 'push-notification-v1';

// Cài đặt service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker đang được cài đặt...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache đã được mở');
        return cache.addAll([
          '/',
          // '/static/js/bundle.js', // Nếu chắc chắn có file này thì giữ lại, không thì xóa/comment
          // '/static/css/main.css'  // XÓA hoặc comment nếu không tồn tại
        ]);
      })
  );
});

// Kích hoạt service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker đã được kích hoạt');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Xóa cache cũ:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Xử lý push notifications
self.addEventListener('push', (event) => {
  console.log('Nhận được push notification:', event);

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Thông báo mới', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'Bạn có thông báo mới!',
    icon: data.icon || '/favicon/favicon.svg',
    badge: data.badge || '/favicon/favicon.svg',
    vibrate: data.vibrate || [100, 50, 100],
    data: data.data || {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Xem chi tiết',
        icon: '/favicon/favicon.svg'
      },
      {
        action: 'close',
        title: 'Đóng',
        icon: '/favicon/favicon.svg'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Thông báo mới', options)
  );
});

// Xử lý khi người dùng click vào notification
self.addEventListener('notificationclick', (event) => {
  console.log('Notification được click:', event);
  
  event.notification.close();

  if (event.action === 'explore') {
    // Mở trang web khi click vào "Xem chi tiết"
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Xử lý fetch requests
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Trả về response từ cache nếu có
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
}); 