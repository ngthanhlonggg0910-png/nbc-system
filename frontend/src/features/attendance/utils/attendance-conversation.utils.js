export function getConversationMessages(conversations) {
  return conversations
    .flatMap((item, conversationIndex) => {
      const messages =
        Array.isArray(item.messages) && item.messages.length
          ? item.messages
          : [
              ...(item.initiatedBy === "hr"
                ? []
                : [
                    {
                      id: `${item.id}-employee`,
                      sender: "employee",
                      text: item.message,
                      createdAt: item.createdAt,
                    },
                  ]),
              ...(item.reply
                ? [
                    {
                      id: `${item.id}-hr`,
                      sender: "hr",
                      text: item.reply,
                      createdAt: item.processedAt || "Đã trả lời",
                    },
                  ]
                : []),
              ...(item.initiatedBy === "hr"
                ? [
                    {
                      id: `${item.id}-hr`,
                      sender: "hr",
                      text: item.message,
                      createdAt: item.createdAt,
                    },
                  ]
                : []),
            ];
      return messages
        .filter((message) => message?.text)
        .map((message, messageIndex) => ({
          ...message,
          conversationId: item.id,
          originalOrder: conversationIndex * 1000 + messageIndex,
        }));
    })
    .sort((left, right) => {
      const leftTime = Date.parse(left.createdAt);
      const rightTime = Date.parse(right.createdAt);
      if (
        Number.isFinite(leftTime) &&
        Number.isFinite(rightTime) &&
        leftTime !== rightTime
      )
        return leftTime - rightTime;
      if (Number.isFinite(leftTime) !== Number.isFinite(rightTime))
        return Number.isFinite(leftTime) ? -1 : 1;
      return left.originalOrder - right.originalOrder;
    });
}
