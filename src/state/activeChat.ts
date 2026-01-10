let activeChatReceiverId: string | null = null;

export const setActiveChat = (receiverId: string | null) => {
  activeChatReceiverId = receiverId;
};

export const getActiveChat = () => activeChatReceiverId;
