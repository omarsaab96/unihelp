const express = require("express");
const router = express.Router();
const Chat = require("../models/Chat");
const ChatMessage = require("../models/ChatMessage");

/**
 * 🔹 Initialize or get existing chat between two users
 * POST /api/chats/init
 * body: { senderId, receiverId }
 */
router.post("/init", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      return res
        .status(400)
        .json({ error: "senderId and receiverId are required" });
    }

    // 1️⃣ Find existing chat between users
    let chat = await Chat.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    // 2️⃣ If not found, create new chat
    if (!chat) {
      chat = await Chat.create({
        participants: [senderId, receiverId],
      });
      console.log("🆕 Created new chat:", chat._id);
    }

    // 3️⃣ Fetch recent messages (most recent first)
    const messages = await ChatMessage.find({ chatId: chat._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      chatId: chat._id,
      messages,
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
      .populate("participants", "_id firstname lastname photo")
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
          .select("_id text createdAt senderId")
          .lean();

        return {
          ...chat,
          lastMessage: lastMsg ? lastMsg.text : null,
          lastMessageAt: lastMsg ? lastMsg.createdAt : chat.updatedAt,
          lastMessageSenderId: lastMsg ? lastMsg.senderId : null,
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
