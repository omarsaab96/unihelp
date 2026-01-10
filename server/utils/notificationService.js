const { Expo } = require('expo-server-sdk');
const Notification = require('../models/Notification');
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
});

async function sendNotification(user, title, body, data = {}, save = true) {
  if (!user.notificationToken) {
    console.log('User', user._id ,' Missing Expo push token')
    return;
  }

  if (!Expo.isExpoPushToken(user.notificationToken)) {
    console.log('Invalid Expo push token')
    throw new Error('Invalid Expo push token');
  }

  console.log('Sending notification to', user._id)

  const messages = [{
    to: user.notificationToken,
    sound: 'default',
    title: title || 'A lot is happening right now!',
    body: body || 'Jump back in to see what\'s going on.',
    data: data || {},
  }];

  const tickets = await expo.sendPushNotificationsAsync(messages);
  console.log('Push notification tickets:', tickets);

  if (save) {
    const notification = new Notification({
      userId: user._id,
      title: title,
      content: body,
      read: false,
      ticket: tickets,
      data: data || {},
      dateTime: new Date(),
    });

    await notification.save();
  }
  return tickets;
}


module.exports = { sendNotification };