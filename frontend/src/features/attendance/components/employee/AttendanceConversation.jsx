import React from "react";
import { useRef, useState } from "react";
import { Reply, Send, UserCog } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";

export default function AttendanceConversation({
  messages,
  selectedDate,
  user,
  onSubmit,
  selectedDateKey,
}) {
  const conversationEndRef = useRef(null);

  const [replyMessage, setReplyMessage] = useState("");

  React.useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedDateKey, messages.length]);

  return (
    <section className="section-block attendance-conversation">
      <div className="conversation-head">
        <div>
          <span>TRAO ĐỔI VỚI NHÂN SỰ</span>
          <h2>Ý kiến về ngày {selectedDate}</h2>
        </div>
        <span>{messages.length} tin nhắn</span>
      </div>
      <div className="conversation-list">
        {messages.length === 0 ? (
          <div className="conversation-empty">
            <Reply />
            <strong>Chưa có nội dung trao đổi</strong>
            <p>
              Nếu dữ liệu ngày công chưa đúng, bạn có thể gửi phản hồi để HR
              kiểm tra.
            </p>
          </div>
        ) : (
          messages.map((message, index) =>
            message.sender === "hr" ? (
              <div
                className="chat-bubble hr"
                key={message.id ?? `${message.conversationId}-hr-${index}`}
              >
                <span>
                  <span className="hr-avatar">
                    <UserCog />
                  </span>
                  <strong>
                    Bộ phận Nhân sự
                    <small>{message.createdAt}</small>
                  </strong>
                </span>
                <p>{message.text}</p>
              </div>
            ) : (
              <div
                className="chat-bubble employee"
                key={
                  message.id ?? `${message.conversationId}-employee-${index}`
                }
              >
                <span>
                  <Avatar name={user.name} src={undefined} />
                  <strong>
                    {user.name}
                    <small>{message.createdAt}</small>
                  </strong>
                </span>
                <p>{message.text}</p>
              </div>
            ),
          )
        )}
        <span ref={conversationEndRef} />
      </div>
      <form
        className="conversation-reply"
        onSubmit={(event) => {
          event.preventDefault();
          const message = replyMessage.trim();
          if (!message) return;
          onSubmit(selectedDate, message);
          setReplyMessage("");
        }}
      >
        <textarea
          aria-label="Nội dung trả lời"
          rows={1}
          value={replyMessage}
          onChange={(event) => setReplyMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Nhập tin nhắn trả lời..."
        />
        <button
          type="submit"
          disabled={!replyMessage.trim()}
          aria-label="Gửi tin nhắn"
        >
          <Send />
        </button>
      </form>
    </section>
  );
}
