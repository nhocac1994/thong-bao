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
  let rawText = '';
  
  if (event.data) {
    try {
      rawText = event.data.text();
      console.log('Raw push data text:', rawText);
      
      data = event.data.json();
      console.log('Push data (parsed JSON):', data);
      console.log('URL trong push data:', data.url);
      console.log('URL trong data.data:', data.data ? data.data.url : 'không có');
    } catch (e) {
      console.error('Lỗi parse JSON:', e);
      data = { title: 'Thông báo mới', body: rawText || 'Bạn có thông báo mới!' };
    }
  }

  console.log('Push data:', data);

  // URL mặc định chỉ sử dụng khi không có URL từ payload
  const defaultUrl = 'https://www.appsheet.com/start/1d77caaf-8819-42c2-9fbd-244e3748261b#view=DonHang_Detail';

  // Tìm URL từ nhiều nguồn có thể
  let urlFromPayload = null;
  
  // Kiểm tra URL trong các vị trí khác nhau
  if (data.url && typeof data.url === 'string' && data.url.trim() !== '') {
    urlFromPayload = data.url.trim();
    console.log('Tìm thấy URL trong data.url:', urlFromPayload);
  } else if (data.data && data.data.url && typeof data.data.url === 'string' && data.data.url.trim() !== '') {
    urlFromPayload = data.data.url.trim();
    console.log('Tìm thấy URL trong data.data.url:', urlFromPayload);
  } else {
    // Thử tìm URL trong rawText nếu là JSON string
    try {
      if (rawText && rawText.includes('url')) {
        const parsedFromRaw = JSON.parse(rawText);
        if (parsedFromRaw.url && typeof parsedFromRaw.url === 'string' && parsedFromRaw.url.trim() !== '') {
          urlFromPayload = parsedFromRaw.url.trim();
          console.log('Tìm thấy URL trong parsedFromRaw.url:', urlFromPayload);
        } else if (parsedFromRaw.data && parsedFromRaw.data.url && typeof parsedFromRaw.data.url === 'string' && parsedFromRaw.data.url.trim() !== '') {
          urlFromPayload = parsedFromRaw.data.url.trim();
          console.log('Tìm thấy URL trong parsedFromRaw.data.url:', urlFromPayload);
        }
      }
    } catch (e) {
      console.error('Không thể tìm URL trong raw text:', e);
    }
  }
  
  // Chỉ sử dụng URL mặc định khi không tìm thấy URL từ payload
  const safeUrl = urlFromPayload || defaultUrl;
  console.log('URL cuối cùng sẽ sử dụng:', safeUrl);

  // Đảm bảo data.url được truyền vào notification data
  const options = {
    body: data.body || 'Bạn có thông báo mới!',
    icon: data.icon || '/favicon/favicon.svg',
    badge: data.badge || '/favicon/favicon.svg',
    vibrate: data.vibrate || [100, 50, 100],
    data: {
      url: safeUrl,
      dateOfArrival: data.data ? data.data.dateOfArrival : Date.now(),
      primaryKey: data.data ? data.data.primaryKey : 1
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
    ],
    // Thêm tag để tránh hiển thị nhiều thông báo trùng lặp
    tag: 'push-notification-' + Date.now()
  };

  console.log('Notification options:', options);
  console.log('URL trong notification data:', options.data.url);

  // Xử lý action khi click vào notification
  options.data.onActionClick = {
    default: {url: safeUrl},
    explore: {url: safeUrl},
    close: {}
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Thông báo mới', options)
  );
});

// Xử lý khi người dùng click vào notification
self.addEventListener('notificationclick', (event) => {
  console.log('Notification được click:', event);
  console.log('Notification data:', event.notification.data);
  console.log('Notification data type:', typeof event.notification.data);
  console.log('Notification data keys:', event.notification.data ? Object.keys(event.notification.data) : 'không có keys');
  
  // Đóng notification
  event.notification.close();

  // URL mặc định chỉ sử dụng khi không có URL từ notification data
  const defaultUrl = 'https://www.appsheet.com/start/1d77caaf-8819-42c2-9fbd-244e3748261b#view=DonHang_Detail';

  // Biến để lưu URL cuối cùng
  let urlToOpen = null;
  
  // Xử lý action nếu có
  const action = event.action;
  console.log('Action:', action);
  
  if (action === 'close') {
    console.log('Người dùng chọn đóng thông báo');
    return; // Không làm gì cả, chỉ đóng thông báo
  }
  
  // Kiểm tra onActionClick trong data
  if (event.notification.data && event.notification.data.onActionClick) {
    const actionMap = event.notification.data.onActionClick;
    console.log('Action map:', actionMap);
    
    // Nếu có action cụ thể, sử dụng URL từ action đó
    if (action && actionMap[action] && actionMap[action].url) {
      urlToOpen = actionMap[action].url;
      console.log('Sử dụng URL từ action:', urlToOpen);
    } 
    // Nếu không có action cụ thể hoặc không tìm thấy action, sử dụng URL mặc định
    else if (actionMap.default && actionMap.default.url) {
      urlToOpen = actionMap.default.url;
      console.log('Sử dụng URL mặc định từ action map:', urlToOpen);
    }
  }
  // Nếu không có onActionClick, kiểm tra url trong data
  else if (event.notification.data && event.notification.data.url) {
    const rawUrl = event.notification.data.url;
    console.log('Raw URL từ notification data:', rawUrl, 'type:', typeof rawUrl);
    
    if (typeof rawUrl === 'string' && rawUrl.trim() !== '') {
      urlToOpen = rawUrl.trim();
    }
    console.log('Tìm thấy URL trong notification data:', urlToOpen);
    console.log('URL type:', typeof urlToOpen);
    console.log('URL length:', urlToOpen.length);
  } else {
    console.log('Không tìm thấy URL trong notification data, sử dụng URL mặc định');
    if (event.notification.data) {
      console.log('Các trường có trong notification data:', Object.keys(event.notification.data));
    }
  }

  // Chỉ sử dụng URL mặc định khi không tìm thấy URL từ notification data
  if (!urlToOpen) {
    urlToOpen = defaultUrl;
    console.log('Không tìm thấy URL từ notification data, sử dụng URL mặc định:', urlToOpen);
  }

  console.log('URL cuối cùng sẽ mở:', urlToOpen);
  console.log('URL cuối cùng (JSON):', JSON.stringify(urlToOpen));

  // Đảm bảo URL không rỗng trước khi mở
  if (urlToOpen && urlToOpen.trim() !== '') {
    // Đảm bảo URL có protocol
    if (!urlToOpen.startsWith('http://') && !urlToOpen.startsWith('https://') && urlToOpen !== '/') {
      urlToOpen = 'https://' + urlToOpen;
    }
    
    console.log('Mở URL cuối cùng:', urlToOpen);
    
    // Mở URL trong cửa sổ hiện có hoặc mở cửa sổ mới
    event.waitUntil(
      clients.matchAll({type: 'window', includeUncontrolled: true})
        .then(windowClients => {
          // Kiểm tra xem có cửa sổ nào đang mở không
          for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            // Nếu có cửa sổ đang mở, focus vào nó và điều hướng
            if ('focus' in client) {
              client.focus();
              // Nếu URL là đường dẫn tương đối, thêm origin
              if (urlToOpen.startsWith('/')) {
                const url = new URL(urlToOpen, self.location.origin).href;
                if ('navigate' in client) {
                  return client.navigate(url);
                } else {
                  return clients.openWindow(url);
                }
              } else {
                if ('navigate' in client) {
                  return client.navigate(urlToOpen);
                } else {
                  return clients.openWindow(urlToOpen);
                }
              }
            }
          }
          
          // Nếu không có cửa sổ nào đang mở, thử mở cửa sổ mới
          if (clients.openWindow) {
            // Nếu URL là đường dẫn tương đối, thêm origin
            if (urlToOpen.startsWith('/')) {
              const url = new URL(urlToOpen, self.location.origin).href;
              return clients.openWindow(url)
                .catch(error => {
                  console.error('Lỗi khi mở window:', error);
                  return null;
                });
            } else {
              return clients.openWindow(urlToOpen)
                .catch(error => {
                  console.error('Lỗi khi mở window:', error);
                  return null;
                });
            }
          }
          
          return null;
        })
    );
  } else {
    console.error('URL rỗng, không thể mở window');
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