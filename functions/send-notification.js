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
  'https://vnzedwjfihhvmvlsascl.supabase.co', // Thay bằng SUPABASE_URL thực tế của bạn
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuemVkd2pmaWhodm12bHNhc2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5OTY5MzEsImV4cCI6MjA2NjU3MjkzMX0.hNbRYoM4q_wQvQ5Ipx7wAxRQKjXo2Bfve1f7sAl-rF4' // Thay bằng SUPABASE_SERVICE_KEY thực tế của bạn
);

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  };

  // TEST: Lấy danh sách subscription và log ra ngay khi function được gọi
  try {
    const { data: allSubscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*');
    if (subError) {
      console.error('Lỗi khi lấy danh sách subscription (test):', subError);
    } else {
      console.log('Danh sách subscription (test):', allSubscriptions);
    }
  } catch (e) {
    console.error('Lỗi test lấy subscription:', e);
  }

  // Xử lý preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Lấy query type nếu có
    const url = new URL(event.rawUrl || `http://localhost${event.path}`);
    const type = url.searchParams.get('type');

    // Endpoint để lấy VAPID public key
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

    // Lưu subscription vào Supabase (POST, có subscription trong body)
    if (event.httpMethod === 'POST' && event.body && event.body.includes('endpoint')) {
      const subscription = JSON.parse(event.body);
      console.log('Nhận subscription:', subscription);
      // Kiểm tra trùng endpoint
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('endpoint', subscription.endpoint)
        .maybeSingle();
      console.log('Kết quả kiểm tra subscription đã tồn tại:', existing);
      if (!existing) {
        const { error } = await supabase
          .from('subscriptions')
          .insert([{ endpoint: subscription.endpoint, keys: subscription.keys }]);
        if (error) {
          console.error('Lỗi khi insert vào Supabase:', error);
        } else {
          console.log('Đã lưu subscription mới vào Supabase');
        }
      } else {
        console.log('Subscription đã tồn tại, không lưu lại');
      }
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Subscription đã được lưu thành công', publicKey: vapidKeys.publicKey })
      };
    }

    // Gửi notification tới tất cả subscription trong Supabase (POST, có title/body/icon/url trong body)
    if (event.httpMethod === 'POST' && event.body && event.body.includes('title')) {
      console.log('Raw request body:', event.body);
      
      // Parse JSON từ request body
      let requestData;
      try {
        requestData = JSON.parse(event.body.trim());
        console.log('Parsed request data:', requestData);
      } catch (error) {
        console.error('Lỗi khi parse JSON từ request body:', error);
        return {
          statusCode: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Lỗi khi parse JSON từ request body' })
        };
      }
      
      const { title, body, icon, url } = requestData;

      // Lấy tất cả subscription
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*');
      console.log('Danh sách subscription lấy từ Supabase:', subscriptions);
      if (!subscriptions || !subscriptions.length) {
        return {
          statusCode: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Không có subscription nào để gửi thông báo' })
        };
      }

      // Log thông tin URL nhận được
      console.log('URL nhận được từ request:', url);
      console.log('URL type:', typeof url);
      console.log('URL stringified:', JSON.stringify(url));

      // Đặt URL mặc định - thay đổi URL này thành URL mà bạn muốn mở khi click thông báo
      const defaultUrl = 'https://www.appsheet.com/start/1d77caaf-8819-42c2-9fbd-244e3748261b#view=DonHang_Detail';
      
      // Đảm bảo URL không rỗng
      let safeUrl = defaultUrl; // Luôn sử dụng URL mặc định
      if (url !== undefined && url !== null) {
        if (typeof url === 'string' && url.trim() !== '') {
          // Nếu có URL từ webhook, vẫn ưu tiên sử dụng nó
          safeUrl = url.trim();
        } else if (typeof url === 'object') {
          // Nếu URL là object, thử chuyển thành string
          safeUrl = JSON.stringify(url);
        }
      }
      console.log('URL sau khi xử lý:', safeUrl);
      console.log('URL type sau khi xử lý:', typeof safeUrl);

      const payload = JSON.stringify({
        title: title || 'Thông báo mới',
        body: body || 'Bạn có thông báo mới!',
        icon: icon || '/favicon/favicon.svg',
        badge: '/favicon/favicon.svg',
        vibrate: [100, 50, 100],
        url: safeUrl,
        data: { 
          url: safeUrl,
          dateOfArrival: Date.now(), 
          primaryKey: 1 
        }
      });
      
      // Log payload để kiểm tra
      console.log('Payload gửi đi:', payload);

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
      console.log('Kết quả gửi notification:', results);
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Đã gửi thông báo: ${results.filter(r => r.status === 'fulfilled').length} thành công, ${results.filter(r => r.status === 'rejected').length} thất bại`
        })
      };
    }

    // Endpoint để lấy danh sách subscriptions (GET)
    if (event.httpMethod === 'GET' && url.pathname.endsWith('/subscriptions')) {
      const { data: subscriptions } = await supabase.from('subscriptions').select('*');
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