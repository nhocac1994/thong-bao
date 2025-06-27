const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

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

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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

    // Lưu subscription vào Supabase
    if (path === '/api/save-subscription' && event.httpMethod === 'POST') {
      const subscription = JSON.parse(event.body);

      // Kiểm tra trùng endpoint
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('endpoint', subscription.endpoint)
        .maybeSingle();

      if (!existing) {
        await supabase
          .from('subscriptions')
          .insert([{ endpoint: subscription.endpoint, keys: subscription.keys }]);
      }

      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Subscription đã được lưu thành công', publicKey: vapidKeys.publicKey })
      };
    }

    // Gửi notification tới tất cả subscription trong Supabase
    if (path === '/api/send-notification' && event.httpMethod === 'POST') {
      const { title, body, icon } = JSON.parse(event.body);

      // Lấy tất cả subscription
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*');

      if (!subscriptions || !subscriptions.length) {
        return {
          statusCode: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Không có subscription nào để gửi thông báo' })
        };
      }

      const payload = JSON.stringify({
        title: title || 'Thông báo mới',
        body: body || 'Bạn có thông báo mới!',
        icon: icon || '/icon.svg',
        badge: '/icon.svg',
        vibrate: [100, 50, 100],
        data: { dateOfArrival: Date.now(), primaryKey: 1 }
      });

      // Gửi notification tới tất cả subscription
      const results = await Promise.allSettled(
        subscriptions.map(subscription =>
          webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: subscription.keys
            },
            payload
          )
        )
      );

      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Đã gửi thông báo: ${results.filter(r => r.status === 'fulfilled').length} thành công, ${results.filter(r => r.status === 'rejected').length} thất bại`
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