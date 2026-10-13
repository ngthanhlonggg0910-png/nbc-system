# Notification module

## Setup

1. Copy `.env.example` to `.env` and fill in the database/JWT values.
2. Set `ADMIN_ROLE_ID` to the role allowed to create notifications.
3. Run `npm install`.
4. Run `npm run migrate:notification-attachments` once per database.
5. Verify with `npm run check:notification-schema`.

For OneSignal push, set `ONESIGNAL_APP_ID` and `ONESIGNAL_API_KEY` in the backend. In the frontend set `VITE_ONESIGNAL_APP_ID` to the same public App ID. The API key must only exist on the backend. The browser uses `staff_id` as its OneSignal External ID.

## Postman flow

All endpoints require `Authorization: Bearer <token>` or the login cookie.

1. Create as admin: `POST /api/notifications`

```json
{
  "title": "Thông báo thử nghiệm",
  "description": "Vui lòng đọc và phản hồi.",
  "notification_type": "general",
  "tone": "blue",
  "audience": "employee",
  "staff_id": "NV002",
  "target_tab": "home",
  "is_urgent": false,
  "allow_reply": true
}
```

2. Upload: `POST /api/notifications/:id/attachments`, Body `form-data`, key `file`, maximum 10 MB. Accepted: PNG, JPG, PDF, DOCX, XLSX.
3. List: `GET /api/notifications?limit=20&offset=0&unread_only=false`.
4. Detail: `GET /api/notifications/:id`.
5. Read one: `PATCH /api/notifications/:id/read`.
6. Read all: `PATCH /api/notifications/read-all`.
7. Reply: `POST /api/notifications/:id/responses` with `{ "message": "Đã nhận thông báo" }`.
8. Archive: `PATCH /api/notifications/:id/archive` with `{ "is_archived": true }`.
9. Sent history: `GET /api/notifications/sent?limit=20&offset=0`.

Files are stored under `backend/uploads/notifications` for local/self-hosted deployments. For serverless or multiple backend instances, replace local storage with S3, Cloudflare R2 or another shared object store while retaining the attachment metadata table.

## Authentication integration

The official password, QR and biometric login flows store `{ authenticated, staffId, token, role }` in the existing portal session. The notification client uses that Bearer token (or `nbc-access-token` after reload) and the login cookie automatically. Enable live data with `VITE_ENABLE_API=true`.
