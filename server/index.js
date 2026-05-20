require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const ChatMessage = require('./models/ChatMessage');
const Chat = require('./models/Chat');
const User = require('./models/User');
const JobReport = require('./models/JobReport');
const Bid = require('./models/Bid');
const HelpOffer = require('./models/HelpOffer');

const universityRoutes = require('./routes/universityRoutes');
const universityEventsRoutes = require('./routes/universityEventsRoutes');
const staffEventsRoutes = require('./routes/staffEventsRoutes');
const universityNewsRoutes = require('./routes/universityNewsRoutes');
const helpOffersRoutes = require("./routes/helpOffersRoutes")
const userRoutes = require("./routes/userRoutes");
const tutorRoutes = require("./routes/tutorRoutes");
const sponsorsRoutes = require("./routes/sponsorsRoutes");
const offersRoutes = require("./routes/offersRoutes");
// const scheduledSessionsRoutes = require("./routes/scheduledSessionsRoutes");
const notificationRoutes = require('./routes/notificationsRoutes');
const clubsRoutes = require("./routes/clubsRoutes");
const authRoutes = require("./routes/auth");
const walletRoutes = require("./routes/walletRoutes");
const chatRoutes = require('./routes/chatRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const supportRoutes = require('./routes/supportRoutes.js');
const uploadRoutes = require('./routes/uploadRoutes');


// const notificationsRoutes = require('./routes/notificationsRoutes');
// const imageRoutes = require('./routes/imageRoutes');
// const teamsRoutes = require('./routes/teamRoutes');
// const schedulesRoutes = require('./routes/scheduleRoutes');
// const staffRoutes = require('./routes/staffRoutes');
// const inventoryRoutes = require('./routes/inventoryRoutes');
// const paymentRoutes = require('./routes/paymentRoutes');
const postRoutes = require('./routes/postRoutes')
// const searchRoutes = require('./routes/searchRoutes')
// const chatRouter = require('./routes/chatRoutes');
const verificationRoutes = require("./routes/verificationRoutes");
const { sendNotification } = require('./utils/notificationService');
// const Chat = require("./models/Chat");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' },
});
app.set('io', io);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

connectDB();

app.get("/api", (req, res) => {
    res.send("OK");
});
app.use('/api/universityEvents', universityEventsRoutes);
app.use('/api/staffEvents', staffEventsRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/universityNews', universityNewsRoutes);
app.use('/api/helpOffers', helpOffersRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tutors", tutorRoutes);
app.use("/api/sponsors", sponsorsRoutes);
app.use("/api/offers", offersRoutes);
// app.use("/api/scheduledSessions", scheduledSessionsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/clubs", clubsRoutes);
app.use('/api/wallet', walletRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/financials', paymentRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// app.use('/api/teams', teamsRoutes);
// app.use('/api/schedules', schedulesRoutes);
// app.use('/api/staff', staffRoutes);
// app.use('/api/inventory', inventoryRoutes);
// app.use('/api/financials', paymentRoutes);
app.use('/api/posts', postRoutes);
// app.use('/api/chats', chatRouter);
app.use('/api/verify', verificationRoutes);

// app.use('/api/search', searchRoutes);
// app.use('/api/notifications', notificationsRoutes);
// app.use('/api/removeBG', imageRoutes);


app.get('/', (req, res) =>
    res.send(`🚀 Server running on http://localhost:${process.env.PORT || 4000}`)
);

// --- SOCKET.IO LOGIC ---
io.use((socket, next) => {
    console.log("⚡ Incoming socket handshake");
    next();
});

io.on('connection', (socket) => {
    console.log('🟢 User connected:', socket.id);

    socket.onAny((event, ...args) => {
        console.log("📨 EVENT:", event, args);
    });

    socket.on('join', (chatId) => {
        socket.join(chatId);
        console.log(`📥 Joined chat: ${chatId}`);
    });

    socket.on('sendMessage', async (msg) => {

        console.log("sending msg= ", msg)
        try {
            if (msg.type !== "system") {
                const chat = await Chat.findById(msg.chatId).select("helpOffer participants");
                if (chat?.helpOffer) {
                    const frozenReport = await JobReport.exists({ offer: chat.helpOffer, resolvedAt: null });
                    if (frozenReport) {
                        socket.emit("messageError", {
                            chatId: msg.chatId,
                            tempId: msg.tempId,
                            code: "jobReported",
                            message: "This job has been reported and chat is frozen until review.",
                        });
                        return;
                    }

                    const offer = await HelpOffer.findById(chat.helpOffer).select("type user closedAt");
                    if (offer?.type === "seek" && offer.closedAt) {
                        const acceptedBid = await Bid.findOne({
                            offer: chat.helpOffer,
                            acceptedAt: { $ne: null },
                        }).select("user");

                        const participantIds = (chat.participants || []).map((id) => id.toString());
                        const ownerId = offer.user?.toString();
                        const acceptedBidderId = acceptedBid?.user?.toString();
                        const isAcceptedJobChat =
                            ownerId &&
                            acceptedBidderId &&
                            participantIds.includes(ownerId) &&
                            participantIds.includes(acceptedBidderId);

                        if (!isAcceptedJobChat) {
                            socket.emit("messageError", {
                                chatId: msg.chatId,
                                tempId: msg.tempId,
                                code: "offerClosed",
                                message: "This offer is closed because another bid was accepted.",
                            });
                            return;
                        }
                    }
                }
            }

            // Extract tempId from client
            const { tempId, ...rest } = msg;
            rest.readBy = [msg.senderId];

            // Save message in MongoDB
            const newMsg = await ChatMessage.create(rest);
            await Chat.findByIdAndUpdate(msg.chatId, {
                lastMessage:
                    (msg.text || "").trim() ||
                    (msg.type === "system"
                        ? (msg.text || "System message")
                        : msg.type === "image"
                        ? "Photo"
                        : msg.type === "audio"
                            ? "Voice message"
                            : msg.type === "file"
                                ? "File"
                                : "New message"),
                lastMessageAt: newMsg.createdAt,
            });

            // Emit saved message back to all users in this chat
            io.to(msg.chatId).emit('newMessage', {
                ...newMsg.toObject(),
                tempId,
            });

            if (msg.type === "system") return;

            const sender = await User.findById(msg.senderId).select("-password")
            const receiver = await User.findById(msg.receiverId).select("-password")
            const chat = await Chat.findById(msg.chatId)
                .select("helpOffer")
                .populate("helpOffer", "_id title type");
            if (sender && receiver) {
                console.log('Send notification requested on New message sent')
                const notificationBody =
                    (msg.text || "").trim() ||
                    (msg.type === "system"
                        ? (msg.text || "System message")
                        : msg.type === "image"
                        ? "Photo"
                        : msg.type === "audio"
                            ? "Voice message"
                            : msg.type === "file"
                                ? "File"
                                : "New message");
                await sendNotification(
                    receiver,
                    `New Message from ${capitalize(sender.firstname)} ${capitalize(sender.lastname)}`,
                    notificationBody,
                    {
                        screen: "chat",
                        data: JSON.stringify({
                            userId: receiver._id,
                            receiverId: sender._id,
                            name: `${capitalize(sender.firstname)} ${capitalize(sender.lastname)}`,
                            avatar: sender.photo,
                            helpOfferId: chat?.helpOffer?._id || chat?.helpOffer || undefined,
                            negotiationOfferId: chat?.helpOffer?._id || chat?.helpOffer || undefined,
                            threadTitle: chat?.helpOffer?.title || undefined,
                            threadType: chat?.helpOffer?.type || undefined,
                        })
                    },
                    false
                );
            }

        } catch (err) {
            console.error('❌ Error saving message:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('🔴 User disconnected:', socket.id);
    });
});

const capitalize = (str = "") =>
    str
        .toString()
        .split(" ")
        .map(s => s.charAt(0).toUpperCase() + s.substring(1))
        .join(" ");

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
