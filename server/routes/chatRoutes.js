const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const router = express.Router();
const { sendNotification } = require('../utils/notificationService');
const mongoose = require("mongoose");


// Middleware to verify token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Token missing' });

    jwt.verify(token, '123456', (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = decoded; // decoded contains userId
        next();
    });
};

// Get paginated chats for logged-in user
router.get("/", authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const chats = await Chat.find({
            participants: userId,
            visibleFor: userId
        })
            .populate("participants", "_id name image gender type")
            .sort({ "lastMessage.timestamp": -1 })
            .skip(skip)
            .limit(limit);

        // For each chat, find the other participant (exclude current user)
        const chatsWithOther = await Promise.all(
            chats.map(async (chat) => {
                const otherParticipant = chat.participants.find(
                    (p) => p._id.toString() !== userId.toString()
                );

                const lastOpened = chat.lastOpened?.get(userId) || new Date(0);

                const unreadMessages = await Message.find({
                    chatId: chat._id,
                    timestamp: { $gt: lastOpened }
                });

                return {
                    _id: chat._id,
                    unreadMessages: unreadMessages,
                    participants: chat.participants,
                    otherParticipant: otherParticipant || null,
                    lastMessage: chat.lastMessage,
                };
            })
        );

        res.json(chatsWithOther);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// Create a new chat between two participants
router.post("/create", authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { participantId } = req.body;

    if (!participantId) {
        return res.status(400).json({ message: "participantId is required" });
    }

    try {
        let chat = await Chat.findOne({
            participants: { $all: [userId, participantId] }
        }).populate("participants", "_id name image gender type");

        if (chat) {
            // If chat exists but is not visible to this user, make it visible
            if (!chat.visibleFor.includes(userId)) {
                chat.visibleFor.push(userId);
                await chat.save();
            }


            // Reset lastMessage if deleted
            if (chat.deleted?.get(userId) && chat.lastMessage?.timestamp <= chat.deleted?.get(userId)) {
                console.log("deleted is TRUE")
                chat.lastMessage = { text: "", senderId: null, timestamp: null };
            }

            // Chat already exists - still notify both participants
            const io = req.app.get("io");
            const notifyChatListUpdate = req.app.get("notifyChatListUpdate");

            notifyChatListUpdate(userId, {
                _id: chat._id,
                participants: chat.participants,
                otherParticipant: chat.participants.filter(p => p._id != userId),
                lastMessage: chat.lastMessage
            });

            return res.json(chat);
        }

        // Create new chat
        chat = new Chat({
            participants: [userId, participantId],
            activeParticipants: [userId],
            lastMessage: {
                text: "",
                senderId: null,
                timestamp: null,
            },
            lastOpened: {
                [userId]: new Date()
            },
            deleted: {
                [userId]: new Date(),
                [participantId]: new Date()
            },
            visibleFor: [userId]
        });

        await chat.save();

        // Populate participants for the socket event
        const populatedChat = await Chat.populate(chat, {
            path: 'participants',
            select: 'name image gender type'
        });

        // Notify both participants
        const io = req.app.get("io");
        const notifyChatListUpdate = req.app.get("notifyChatListUpdate");

        notifyChatListUpdate(userId, {
            _id: populatedChat._id,
            participants: populatedChat.participants,
            otherParticipant: populatedChat.participants.filter(p => p._id != userId),
            lastMessage: populatedChat.lastMessage
        });

        res.status(201).json(populatedChat);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// Delete chat route
router.delete('/delete/:chatId', authenticateToken, async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.userId;

    try {
        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ message: "Chat not found" });

        // Check if user is a participant of this chat
        if (!chat.participants.some(p => p.toString() === userId)) {
            return res.status(403).json({ message: "Not authorized to delete this chat" });
        }

        await Chat.findByIdAndUpdate(chatId, {
            $pull: { visibleFor: userId },              // remove user from visibleFor array
            $set: { [`deleted.${userId}`]: new Date() } // set per-user lastOpened timestamp
        });

        res.json({ message: "Chat unlinked" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

router.get("/participants", authenticateToken, async (req, res) => {
    try {
        const currentUserId = req.user.userId;

        const users = await User.find({ _id: { $ne: currentUserId } }).select("_id name image gender type");

        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// Add a new message to a chat
router.post("/:chatId/message", authenticateToken, async (req, res) => {
    const { chatId } = req.params;
    const { text, tempid } = req.body;
    const userId = req.user.userId;
    const notifyChatListUpdate = req.app.get("notifyChatListUpdate");


    try {
        const chat = await Chat.findById(chatId).populate("participants", "_id name image gender type");
        if (!chat) return res.status(404).json({ message: "Chat not found" });
        if (!chat.participants.some(p => p._id.toString() === userId))
            return res.status(403).json({ message: "Not authorized" });

        // Save the message
        const message = new Message({
            chatId,
            tempid,
            senderId: userId,
            text,
        });
        await message.save();

        // Update lastMessage in chat
        chat.lastMessage = {
            text,
            senderId: userId,
            timestamp: message.timestamp,
        };

        //make chat visible for all
        chat.visibleFor = Array.from(new Set(chat.participants.map(p => p._id.toString())));

        await chat.save();

        const sender = await User.findById(userId).select("name");

        // Emit to other participants
        const io = req.app.get("io");
        let unreadMessages = null;

        for (const participant of chat.participants) {
            if (participant._id.toString() !== userId.toString()) {
                if (chat.activeParticipants.includes(participant._id.toString())) {

                    io.to(chatId).emit("newMessage", { chatId, message });

                } else {

                    const lastOpened = chat.lastOpened?.get(participant._id);
                    const deletedAt = chat.deleted?.get(participant._id);

                    const minTimestamp = deletedAt && lastOpened
                        ? new Date(Math.max(deletedAt.getTime(), lastOpened.getTime()))
                        : deletedAt || lastOpened || new Date(0);

                    unreadMessages = await Message.find({
                        chatId,
                        timestamp: { $gt: minTimestamp },
                    }).sort({ timestamp: 1 });

                    //send notification
                    const userToNotify = await User.findOne({
                        _id: participant._id,
                        expoPushToken: { $exists: true, $ne: null }
                    });

                    if (!userToNotify) continue;

                    const notificationTitle = `${sender.name} sent you a new message`;
                    const notificationBody = text;

                    try {
                        await sendNotification(userToNotify, notificationTitle, notificationBody, { postId: chatId }, false);
                    } catch (err) {
                        console.error(`Failed to send notification to user ${userToNotify._id}:`, err.message);
                    }
                }
            }



            notifyChatListUpdate(participant._id, {
                _id: chat._id,
                participants: chat.participants,
                unreadMessages: unreadMessages,
                lastMessage: {
                    text,
                    senderId: userId,
                    timestamp: message.timestamp,
                },
            });
        }

        res.json({ success: true, message: "Message sent", data: message });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

router.patch("/open/:chatId", authenticateToken, async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.userId;
    console.log("UPDATING last open for ", userId)

    // validate chatId and userId
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ error: "Invalid chatId" });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
    }

    console.log("TRYING TO UPDATE NOW ")

    try {
        // Update lastOpened for this user
        const chat = await Chat.findById(chatId)
            .populate("participants", "_id name image gender type");

        chat.lastOpened.set(userId.toString(), new Date());

        const io = req.app.get("io");
        const notifyChatListUpdate = req.app.get("notifyChatListUpdate");

        await chat.save();


        notifyChatListUpdate(userId, {
            _id: chatId,
            participants: chat.participants,
            unreadMessages: null,
            otherParticipant: chat.participants.filter(p => p._id != userId),
            lastMessage: chat.lastMessage
        });

        console.log("Chat marked as opened for user ", userId)
        res.json({ message: "Chat marked as opened" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});


// Get chat details and all messages
router.get("/:chatId", authenticateToken, async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.userId;

    try {
        const chat = await Chat.findById(chatId).populate('participants', '_id name type gender image');
        if (!chat) return res.status(404).json({ message: "Chat not found" });

        if (!chat.participants.some(p => p._id.toString() === userId))
            return res.status(403).json({ message: "Not authorized" });

        const deletedAt = chat.deleted?.get(userId)

        const messages = await Message.find({
            chatId,
            timestamp: { $gt: deletedAt }
        }).sort({ timestamp: 1 });


        res.json({
            chat: chat,
            messages: messages
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;

