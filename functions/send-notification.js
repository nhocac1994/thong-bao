const webpush = require('web-push');

// VAPID keys cố định (được tạo một lần và sử dụng lại)
const vapidKeys = {
  publicKey: 'BCLN3CzN7K_ne40PIWSo4F3JuvB0HWQ40pxEi0Tt7dD5QieSd6QHJeEoBNIMvmmg4XI9YgTD2Ea4jbC238Ix5_c',
  privateKey: '3s4Xlqc9dHkN9l2XgZifEDSuX_mNPNl8HnGNSGwtuoI'
};

webpush.setVapidDetails(
  'mailto:test@example.com', // Email cho VAPID
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Lưu trữ subscriptions (trong thực tế nên dùng database)
let subscriptions = [];

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  };

  // Xử lý preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { path } = event;

    // Endpoint để lưu subscription
    if (path === '/api/save-subscription' && event.httpMethod === 'POST') {
      const subscription = JSON.parse(event.body);
      
      // Kiểm tra xem subscription đã tồn tại chưa
      const existingIndex = subscriptions.findIndex(
        sub => sub.endpoint === subscription.endpoint
      );
      
      if (existingIndex >= 0) {
        subscriptions[existingIndex] = subscription;
      } else {
        subscriptions.push(subscription);
      }

      console.log('Subscription đã được lưu:', subscription.endpoint);

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: 'Subscription đã được lưu thành công',
          publicKey: vapidKeys.publicKey
        })
      };
    }

    // Endpoint để gửi notification
    if (path === '/api/send-notification' && event.httpMethod === 'POST') {
      const { title, body, icon } = JSON.parse(event.body);
      
      if (!subscriptions.length) {
        return {
          statusCode: 400,
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: 'Không có subscription nào để gửi thông báo' 
          })
        };
      }

      const payload = JSON.stringify({
        title: title || 'Thông báo mới',
        body: body || 'Bạn có thông báo mới!',
        icon: icon || '/icon.svg',
        badge: '/icon.svg',
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: 1
        }
      });

      // Gửi notification đến tất cả subscriptions
      const results = await Promise.allSettled(
        subscriptions.map(subscription =>
          webpush.sendNotification(subscription, payload)
        )
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      console.log(`Gửi thông báo: ${successful} thành công, ${failed} thất bại`);

      // Xóa các subscription không hợp lệ
      const validSubscriptions = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          validSubscriptions.push(subscriptions[index]);
        } else {
          console.log('Subscription không hợp lệ:', subscriptions[index].endpoint);
        }
      });
      subscriptions = validSubscriptions;

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: `Đã gửi thông báo: ${successful} thành công, ${failed} thất bại`,
          successful,
          failed
        })
      };
    }

    // Endpoint để lấy VAPID public key
    const url = new URL(event.rawUrl || `http://localhost${event.path}`);
    const type = url.searchParams.get('type');
    if (type === 'vapid-public-key') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ publicKey: vapidKeys.publicKey })
      };
    }

    // Endpoint để lấy danh sách subscriptions
    if (path === '/api/subscriptions' && event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          subscriptions: subscriptions.map(sub => ({
            endpoint: sub.endpoint,
            keys: sub.keys
          }))
        })
      };
    }

    return {
      statusCode: 404,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Endpoint không tìm thấy' })
    };

  } catch (error) {
    console.error('Lỗi:', error);
    
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Lỗi server nội bộ',
        details: error.message 
      })
    };
  }
}; 