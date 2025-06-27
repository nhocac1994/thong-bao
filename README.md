# Ứng dụng Push Notification

Ứng dụng React với tính năng Push Notifications sử dụng Service Workers và Netlify Functions.

## Cấu trúc dự án

```
your-react-app/
├── public/
│   ├── service-worker.js
│   ├── icon.png (icon tùy chọn cho thông báo)
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── App.js
│   ├── index.js
│   ├── App.css
│   ├── index.css
│   └── reportWebVitals.js
├── functions/
│   ├── send-notification.js
│   └── package.json
├── netlify.toml
├── package.json
└── README.md
```

## Cài đặt

1. **Cài đặt dependencies:**
   ```bash
   npm install
   cd functions && npm install
   ```

2. **Thay thế icon.png:**
   - Thay thế file `public/icon.png` bằng icon thực tế (khuyến nghị 192x192px)

3. **Cấu hình VAPID keys:**
   - Trong file `functions/send-notification.js`, thay thế:
     - `your-email@example.com` bằng email thực tế
     - Hoặc tạo VAPID keys riêng và thay thế `vapidKeys.publicKey` và `vapidKeys.privateKey`

4. **Cập nhật VAPID public key trong App.js:**
   - Thay thế `'YOUR_VAPID_PUBLIC_KEY'` trong `src/App.js` bằng VAPID public key thực tế

## Chạy ứng dụng

### Development
```bash
npm start
```

### Production
```bash
npm run build
```

## Deployment trên Netlify

1. **Push code lên GitHub**

2. **Kết nối với Netlify:**
   - Đăng nhập vào Netlify
   - Chọn "New site from Git"
   - Chọn repository của bạn

3. **Cấu hình build:**
   - Build command: `npm run build`
   - Publish directory: `build`

4. **Cài đặt environment variables (nếu cần):**
   - VAPID_PUBLIC_KEY
   - VAPID_PRIVATE_KEY
   - VAPID_EMAIL

## Tính năng

- ✅ Đăng ký/nhận Push Notifications
- ✅ Service Worker để xử lý notifications
- ✅ Giao diện đẹp và responsive
- ✅ Netlify Functions để gửi notifications
- ✅ Hỗ trợ PWA

## API Endpoints

- `POST /api/save-subscription` - Lưu subscription
- `POST /api/send-notification` - Gửi notification
- `GET /api/vapid-public-key` - Lấy VAPID public key
- `GET /api/subscriptions` - Lấy danh sách subscriptions

## Lưu ý quan trọng

1. **HTTPS bắt buộc:** Push notifications chỉ hoạt động trên HTTPS
2. **Service Worker:** Phải được đăng ký từ trang web chính
3. **VAPID keys:** Cần thiết để xác thực với push service
4. **Icon:** Nên có kích thước 192x192px cho best practice

## Troubleshooting

### Notification không hiển thị
- Kiểm tra quyền thông báo trong trình duyệt
- Đảm bảo Service Worker đã được đăng ký thành công
- Kiểm tra console để xem lỗi

### Lỗi VAPID
- Đảm bảo VAPID keys đã được cấu hình đúng
- Kiểm tra email trong VAPID configuration

### Lỗi CORS
- Đảm bảo Netlify Functions đã được deploy đúng cách
- Kiểm tra CORS headers trong function

## Tài liệu tham khảo

- [Web Push Protocol](https://tools.ietf.org/html/rfc8030)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [web-push library](https://github.com/web-push-libs/web-push) 