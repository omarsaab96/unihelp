import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from "react-native";
import { GiftedChat, Send } from "react-native-gifted-chat";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import io from "socket.io-client";

export default function ChatPage() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = styling(colorScheme, insets);
  const params = useLocalSearchParams();
  /**
   * Expected params:
   * {
   *   userId: "64fe2a...",          // current user ID
   *   receiverId: "64fe3c...",      // receiver user ID
   *   name: "John Doe",
   *   avatar: "https://..."
   * }
   */

  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const socket = useRef<any>(null);

  const SERVER_URL = "http://192.168.2.40:4000";

  // 1️⃣ Initialize or create chat
  useEffect(() => {
    const initChat = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/api/chats/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderId: params.userId,
            receiverId: params.receiverId,
          }),
        });

        const data = await res.json();

        if (data?.chatId) {
          setChatId(data.chatId);

          // Format existing messages
          const formatted = (data.messages || []).map((m: any) => ({
            _id: m._id,
            text: m.text,
            createdAt: new Date(m.createdAt),
            user: { _id: m.senderId },
          }));

          setMessages(formatted);
        } else {
          console.log("⚠️ No chatId returned:", data);
        }
      } catch (err) {
        console.log("❌ Failed to init chat:", err);
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, []);

  // 2️⃣ Connect to socket after chatId is known
  useEffect(() => {
    if (!chatId) return;

    socket.current = io(SERVER_URL, { transports: ["websocket"] });
    socket.current.emit("join", chatId);
    console.log("✅ Joined chat:", chatId);

    socket.current.on("newMessage", (msg: any) => {
      setMessages((prev) => {
        const exists = prev.some(
          (m) =>
            m._id === msg._id ||
            (m.text === msg.text &&
              new Date(m.createdAt).getTime() === new Date(msg.createdAt).getTime())
        );

        if (exists) return prev;

        return GiftedChat.append(prev, {
          _id: msg._id,
          text: msg.text,
          createdAt: new Date(msg.createdAt),
          user: { _id: msg.senderId, avatar: msg.senderAvatar },
        });
      });
    });

    return () => {
      socket.current.disconnect();
      console.log("❌ Disconnected chat:", chatId);
    };
  }, [chatId]);

  // 3️⃣ Send message
  const onSend = useCallback((newMessages = []) => {
    if (!chatId) return;

    const msg = newMessages[0];
    const messageData = {
      chatId,
      senderId: params.userId,
      receiverId: params.receiverId,
      text: msg.text,
      createdAt: new Date(),
    };

    socket.current.emit("sendMessage", messageData);
    setMessages((prev) => GiftedChat.append(prev, newMessages));
  }, [chatId]);

  // 4️⃣ Show loading state
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={{ color: colorScheme === "dark" ? "#fff" : "#000", marginTop: 10 }}>
          Loading chat...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>

        <View style={styles.userInfo}>
          <Image
            source={{
              uri: (params?.avatar as string) || "https://placeimg.com/140/140/people",
            }}
            style={styles.avatar}
          />
          <Text style={styles.userName}>{params?.name || "User"}</Text>
        </View>
      </View>

      {/* CHAT */}
      <GiftedChat
        messages={messages}
        onSend={(msgs) => onSend(msgs)}
        user={{ _id: params.userId }}
        placeholder="Type a message..."
        alwaysShowSend
        showUserAvatar
        listViewProps={{
          style: {
            backgroundColor: styles.chatArea.backgroundColor,
          },
        }}
        textInputStyle={{
          color: colorScheme === "dark" ? "#fff" : "#000",
        }}

        // 👇 Outer container of each bubble
        renderMessage={(props) => (
          <View
            style={{
              marginVertical: 6, // spacing between messages
              paddingHorizontal: 14, // padding from left/right edges
              alignItems: props.position === "right" ? "flex-end" : "flex-start",
            }}
          >
            <props.renderBubble {...props} />
          </View>
        )}

        // 👇 Inner bubble itself
        renderBubble={(props) => {
          const isRight = props.position === "right";
          const bubbleColor = isRight
            ? "#10b981"
            : colorScheme === "dark"
              ? "#374151"
              : "#e5e7eb";
          const textColor = isRight
            ? "#fff"
            : colorScheme === "dark"
              ? "#fff"
              : "#000";

          return (
            <View
              style={{
                backgroundColor: bubbleColor,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                maxWidth: "85%",
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              <Text style={{ color: textColor, fontSize: 16, lineHeight: 22 }}>
                {props.currentMessage.text}
              </Text>

              {/* time */}
              <View style={{ alignItems: "flex-end", marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: textColor + "99" }}>
                  {new Date(props.currentMessage.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          );
        }}
        renderSend={(props) => (
          <Send
            {...props}
            textStyle={{ color: "#10b981", fontWeight: "700" }}   // <-- just text color
            containerStyle={{ paddingRight: 8, paddingBottom: 6 }} // optional spacing
          />
        )}
      />
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const styling = (colorScheme: string, insets: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorScheme === "dark" ? "#111827" : "#f4f3e9",
    },
    header: {
      backgroundColor: "#10b981",
      paddingTop: Platform.OS === "ios" ? insets.top + 10 : 30,
      paddingHorizontal: 20,
      paddingBottom: 15,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: 10,
    },
    backBtn: { marginRight: 10 },
    userInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#ccc" },
    userName: {
      color: "#fff",
      fontSize: 18,
      fontFamily: "Manrope_700Bold",
      textTransform: "capitalize",
    },
    chatArea: {
      backgroundColor: colorScheme === "dark" ? "#111827" : "#f4f3e9",
    },
  });
