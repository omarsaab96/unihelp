require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const ChatMessage = require('./models/ChatMessage');

const universityEventsRoutes = require('./routes/universityEventsRoutes');
const helpOffersRoutes = require("./routes/helpOffersRoutes")
const userRoutes = require("./routes/userRoutes");
const tutorRoutes = require("./routes/tutorRoutes");
const sponsorsRoutes = require("./routes/sponsorsRoutes");
const scheduledSessionsRoutes = require("./routes/scheduledSessionsRoutes");
const notificationRoutes = require('./routes/notificationsRoutes');
const clubsRoutes = require("./routes/clubsRoutes");
const authRoutes = require("./routes/auth");
const walletRoutes = require("./routes/walletRoutes");
const chatRoutes = require('./routes/chatRoutes');

// const notificationsRoutes = require('./routes/notificationsRoutes');
// const imageRoutes = require('./routes/imageRoutes');
// const teamsRoutes = require('./routes/teamRoutes');
// const schedulesRoutes = require('./routes/scheduleRoutes');
// const staffRoutes = require('./routes/staffRoutes');
// const inventoryRoutes = require('./routes/inventoryRoutes');
// const paymentRoutes = require('./routes/paymentRoutes');
// const postRoutes = require('./routes/postRoutes')
// const searchRoutes = require('./routes/searchRoutes')
// const chatRouter = require('./routes/chatRoutes');
// const verificationRoutes = require("./routes/verificationRoutes");
// const Chat = require("./models/Chat");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

connectDB();

app.use('/api/universityEvents', universityEventsRoutes);
app.use('/api/helpOffers', helpOffersRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tutors", tutorRoutes);
app.use("/api/sponsors", sponsorsRoutes);
app.use("/api/scheduledSessions", scheduledSessionsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/clubs", clubsRoutes);
app.use('/api/wallet', walletRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/chats', chatRoutes);

// app.use('/api/teams', teamsRoutes);
// app.use('/api/schedules', schedulesRoutes);
// app.use('/api/staff', staffRoutes);
// app.use('/api/inventory', inventoryRoutes);
// app.use('/api/financials', paymentRoutes);
// app.use('/api/posts', postRoutes);
// app.use('/api/chats', chatRouter);
// app.use('/api/verify', verificationRoutes);

// app.use('/api/search', searchRoutes);
// app.use('/api/notifications', notificationsRoutes);
// app.use('/api/removeBG', imageRoutes);


app.get('/', (req, res) =>
    res.send(`🚀 Server running on http://localhost:${process.env.PORT || 4000}`)
);

// --- SOCKET.IO LOGIC ---
io.on('connection', (socket) => {
    console.log('🟢 User connected:', socket.id);

    socket.on('join', (chatId) => {
        socket.join(chatId);
        console.log(`📥 Joined chat: ${chatId}`);
    });

    socket.on('sendMessage', async (msg) => {
        try {
            const { _id, ...cleanMsg } = msg;
            const newMsg = await ChatMessage.create(msg);
            io.to(msg.chatId).emit('newMessage', newMsg);
        } catch (err) {
            console.error('❌ Error saving message:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('🔴 User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
