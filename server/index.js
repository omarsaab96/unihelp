require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const universityEventsRoutes = require('./routes/universityEventsRoutes');
const helpOffersRoutes = require("./routes/helpOffersRoutes")
const userRoutes = require("./routes/userRoutes");
const tutorRoutes = require("./routes/tutorRoutes");
const authRoutes = require("./routes/auth");
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
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

connectDB();

app.use('/api/universityEvents', universityEventsRoutes);
app.use('/api/helpOffers', helpOffersRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tutors", tutorRoutes);
app.use("/api/auth", authRoutes);
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


const PORT = process.env.PORT || 4000;
app.get('/', (req, res) => res.send(`🚀 Server running on http://localhost:${PORT}`));

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
