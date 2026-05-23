const express = require("express");
const router = express.Router();
const Chat = require("../models/Chat");
const ChatMessage = require("../models/ChatMessage");

/**
 * 🔹 Initialize or get existing chat between two users
 * POST /api/chats/init
 * body: { senderId, receiverId, helpOfferId? }
 */
router.post("/init", async (req, res) => {
  try {
    const { senderId, receiverId, helpOfferId, bidId, createIfMissing = true } = req.body;

    if (!senderId || !receiverId) {
      return res
        .status(400)
        .json({ error: "senderId and receiverId are required" });
    }

    // 1️⃣ Find existing chat between users
    const helpOfferQuery = helpOfferId
      ? { helpOffer: helpOfferId }
      : { $or: [{ helpOffer: null }, { helpOffer: { $exists: false } }] };
    const bidQuery = bidId
      ? { $or: [{ bid: bidId }, { bid: null }, { bid: { $exists: false } }] }
      : { $or: [{ bid: null }, { bid: { $exists: false } }] };

    let chat = await Chat.findOne({
      participants: { $all: [senderId, receiverId] },
      $and: [helpOfferQuery, bidQuery],
    });

    // 2️⃣ If not found, create new chat
    let created = false;

    if (!chat && createIfMissing === false) {
      return res.json({
        chatId: null,
        messages: [],
        created: false,
      });
    }

    if (!chat) {
      chat = await Chat.create({
        participants: [senderId, receiverId],
        helpOffer: helpOfferId || null,
        bid: bidId || null,
      });
      created = true;
      console.log("🆕 Created new chat:", chat._id);
    } else if (bidId && !chat.bid) {
      chat.bid = bidId;
      await chat.save();
    }

    // 3️⃣ Fetch recent messages (most recent first)
    await ChatMessage.updateMany(
      {
        chatId: chat._id,
        receiverId: senderId,
        readBy: { $ne: senderId },
      },
      { $addToSet: { readBy: senderId } }
    );

    const messages = await ChatMessage.find({ chatId: chat._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      chatId: chat._id,
      messages,
      created,
    });
  } catch (err) {
    console.error("❌ Chat init error:", err);
    return res.status(500).json({ error: "Failed to initialize chat" });
  }
});

/**
 * 🔹 Get existing chats by user id
 * GET /api/chats/:userId
 * body: { senderId, receiverId }
 */
router.post("/:chatId/read", async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    if (!chatId || !userId) {
      return res.status(400).json({ error: "chatId and userId are required" });
    }

    await ChatMessage.updateMany(
      {
        chatId,
        receiverId: userId,
        readBy: { $ne: userId },
      },
      { $addToSet: { readBy: userId } }
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Chat read error:", err);
    return res.status(500).json({ error: "Failed to mark chat as read" });
  }
});

router.post("/:chatId/system", async (req, res) => {
  try {
    const { chatId } = req.params;
    const { senderId, receiverId, text, metadata } = req.body;

    if (!chatId || !senderId || !receiverId || !text) {
      return res.status(400).json({ error: "chatId, senderId, receiverId, and text are required" });
    }

    const message = await ChatMessage.create({
      chatId,
      senderId,
      receiverId,
      text,
      type: "system",
      attachments: [],
      metadata: metadata || null,
      readBy: [senderId],
    });

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: text,
      lastMessageAt: message.createdAt,
    });

    req.app.get("io")?.to(chatId).emit("newMessage", message.toObject());

    return res.status(201).json({ message });
  } catch (err) {
    console.error("System chat message error:", err);
    return res.status(500).json({ error: "Failed to create system message" });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res
        .status(400)
        .json({ error: "userId is required" });
    }

    const chats = await Chat.find({
      participants: userId,
    })
      .populate("participants", "_id firstname lastname photo role")
      .populate("helpOffer", "_id title type")
      .populate("bid", "_id user acceptedAt rejectedAt")
      .sort({ updatedAt: -1 })
      .lean();

    if (!chats || chats.length === 0) {
      return res.json({ chats: [] });
    }
    // 2️⃣ For each chat, find its most recent message
    const enrichedChats = await Promise.all(
      chats.map(async (chat) => {
        const lastMsg = await ChatMessage.findOne({ chatId: chat._id })
          .sort({ createdAt: -1 })
          .select("_id text createdAt senderId type attachments metadata")
          .lean();
        const unreadCount = await ChatMessage.countDocuments({
          chatId: chat._id,
          receiverId: userId,
          readBy: { $ne: userId },
        });

        const lastMessageText =
          lastMsg?.text?.trim() ||
          (lastMsg?.type === "system"
            ? lastMsg?.text || "System message"
            : lastMsg?.type === "image"
            ? "Photo"
            : lastMsg?.type === "audio"
              ? "Voice message"
              : lastMsg?.type === "file"
                ? "File"
                : null);

        return {
          ...chat,
          lastMessage: lastMsg ? lastMessageText : null,
          lastMessageType: lastMsg ? lastMsg.type : null,
          lastMessageMetadata: lastMsg ? lastMsg.metadata : null,
          lastMessageAt: lastMsg ? lastMsg.createdAt : chat.updatedAt,
          lastMessageSenderId: lastMsg ? lastMsg.senderId : null,
          unreadCount,
        };
      })
    );

    // 3️⃣ Sort chats by lastMessageAt descending
    enrichedChats.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

    return res.json({ chats: enrichedChats });
  } catch (err) {
    console.error("❌ Chat find error:", err);
    return res.status(500).json({ error: "Failed to initialize chat" });
  }
});

module.exports = router;
