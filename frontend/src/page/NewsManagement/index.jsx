import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NewsAdminPage } from "./NewsManagementView";
import { createNotification, fetchNotificationAudiences, fetchNotificationResponses, fetchSentNotifications, uploadNotificationAttachment } from "../../utils/notification-api";
import { NotificationDetailModal } from "../../components/Notice";
import { setNotificationsOpen } from "../../redux/userSlice";

function categoryFromType(item) {
  if (item.is_urgent || item.notification_type === "urgent") return "Thông báo ưu tiên";
  if (item.notification_type === "system") return "Thông báo hệ thống";
  return "Thông báo nội bộ";
}

function mapSentNotification(item) {
  const scheduled = item.published_at && new Date(item.published_at) > new Date();
  return {
    id: Number(item.id),
    title: item.title,
    summary: item.description,
    content: item.description,
    category: categoryFromType(item),
    author: item.created_by || "Admin-HR",
    status: scheduled ? "scheduled" : "published",
    imageUrl: item.image_url,
    priority: Boolean(item.is_urgent),
    updatedAt: item.published_at ?? item.created_at,
    publishedAt: item.published_at,
    audienceMode: item.audience,
    recipientStaffId: item.staff_id,
    allowReply: Boolean(item.allow_reply),
    recipientCount: Number(item.recipient_count ?? 0),
    readCount: Number(item.read_count ?? 0),
    responseCount: Number(item.response_count ?? 0),
    raw: item,
    attachments: [],
  };
}

export default function NewsAdmin() {
  const dispatch = useDispatch();
  const session = useSelector((state) => state.user.session);
  const notices = useSelector((state) => state.user.notices);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [responseInbox, setResponseInbox] = useState([]);
  const [departments, setDepartments] = useState([]);

  const loadSentNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sentData, responseData, audienceData] = await Promise.all([
        fetchSentNotifications({ token: session?.token, limit: 100 }),
        fetchNotificationResponses(session?.token),
        fetchNotificationAudiences(session?.token),
      ]);
      setItems((sentData.items ?? []).map(mapSentNotification));
      setResponseInbox(responseData ?? []);
      setDepartments(audienceData?.departments ?? []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [session?.token]);

  useEffect(() => { void loadSentNotifications(); }, [loadSentNotifications]);

  const saveNotification = async (draft) => {
    const files = [
      ...(draft.imageFile instanceof File ? [draft.imageFile] : []),
      ...(draft.attachments ?? []).filter((item) => item.file instanceof File).map((item) => item.file),
    ];
    const linkedAttachment = draft.attachments?.find((item) => item.type === "link");
    const notification = await createNotification({
      title: draft.title,
      description: draft.summary,
      audience: draft.audienceMode || "employee",
      staff_id: draft.audienceMode === "employee" ? draft.recipientStaffId : null,
      department_id: draft.audienceMode === "department" ? Number(draft.departmentId) : null,
      published_at: draft.sendMode === "scheduled" ? new Date(draft.scheduledAt).toISOString() : null,
      notification_type: draft.category === "Thông báo hệ thống" ? "system" : (draft.category === "Thông báo ưu tiên" ? "urgent" : "general"),
      tone: draft.category === "Thông báo ưu tiên" ? "orange" : "blue",
      target_tab: "news",
      action_url: linkedAttachment?.url || null,
      image_url: draft.imageUrl?.startsWith("http") ? draft.imageUrl : null,
      is_urgent: draft.category === "Thông báo ưu tiên",
      allow_reply: draft.allowReply !== false,
    }, session?.token);
    await Promise.all(files.map((file) => uploadNotificationAttachment(notification.id, file, session?.token)));
    await loadSentNotifications();
  };

  const unreadCount = notices.filter((item) => !item.read).length;

  return (<>
    <NewsAdminPage
      articles={items}
      loading={loading}
      error={error}
      notificationMode
      onSave={saveNotification}
      onDelete={() => undefined}
      onOpen={(item) => setSelectedNotification({ ...item.raw, sent: true, allowReply: item.raw.allow_reply })}
      onNotifications={() => dispatch(setNotificationsOpen(true))}
      unreadCount={unreadCount}
      responseInbox={responseInbox}
      departments={departments}
      onOpenResponse={(item) => setSelectedNotification({ id: item.notification_id, title: item.title, description: item.description, allowReply: item.allow_reply, sent: true })}
    />
    {selectedNotification && <NotificationDetailModal notice={selectedNotification} token={session?.token} canArchive={false} onClose={() => { setSelectedNotification(null); void loadSentNotifications(); }} onArchived={() => undefined} />}
  </>);
}
