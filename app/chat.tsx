import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Keyboard,
  TouchableOpacity,
  Image,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  useColorScheme,
  KeyboardAvoidingView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import io from "socket.io-client";

export default function ChatPage() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  const styles = styling(colorScheme, insets);

  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const socket = useRef<any>(null);

  const CHAT_SERVER_URL = Constants.expoConfig.extra.CHAT_SERVER_URL;

  // -------------------------------------------------------
  // INIT CHAT
  // -------------------------------------------------------
  useEffect(() => {
    const initChat = async () => {
      try {
        const res = await fetch(`${CHAT_SERVER_URL}/api/chats/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderId: params.userId,
            receiverId: params.receiverId,
          }),
        });

        const data = await res.json();
        setChatId(data.chatId);

        const formatted = (data.messages || []).map((m: any) => ({
          _id: m._id,
          text: m.text,
          createdAt: new Date(m.createdAt),
          user: { _id: m.senderId },
        }));

        setMessages(formatted);
      } catch (e) {
        console.log("Chat init error:", e);
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, []);

  // -------------------------------------------------------
  // SOCKET CONNECTION
  // -------------------------------------------------------
  useEffect(() => {
    if (!chatId) return;

    socket.current = io(CHAT_SERVER_URL, { transports: ["websocket"] });
    socket.current.emit("join", chatId);

    socket.current.on("newMessage", (msg: any) => {
      setMessages((prev) => {
        // STEP 1 — does a pending message match this?
        if (msg.tempId) {
          const idx = prev.findIndex((m) => m._id === msg.tempId);
          if (idx !== -1) {
            // Replace pending with real message
            const updated = [...prev];
            updated[idx] = {
              _id: msg._id,
              text: msg.text,
              createdAt: new Date(msg.createdAt),
              user: { _id: msg.senderId },
              pending: false,
            };
            return updated;
          }
        }

        // STEP 2 — Normal received message (not ours)
        return [
          {
            _id: msg._id,
            text: msg.text,
            createdAt: new Date(msg.createdAt),
            user: { _id: msg.senderId },
          },
          ...prev,
        ];
      });
    });


    return () => socket.current.disconnect();
  }, [chatId]);

  // -------------------------------------------------------
  // SEND MESSAGE
  // -------------------------------------------------------
  const sendMessage = () => {
    if (!input.trim() || !chatId) return;

    const localId = "local-" + Date.now();

    // 1️⃣ Add instant pending bubble
    const pendingMessage = {
      _id: localId,
      text: input,
      createdAt: new Date(),
      user: { _id: params.userId },
      pending: true, // ⬅ VERY IMPORTANT
    };

    setMessages((prev) => [pendingMessage, ...prev]);

    // 2️⃣ Emit to server
    socket.current.emit("sendMessage", {
      chatId,
      senderId: params.userId,
      receiverId: params.receiverId,
      text: input,
      tempId: localId,   // ⬅ Send tempId to server
      createdAt: new Date(),
    });

    setInput("");
  };


  // -------------------------------------------------------
  // RENDER BUBBLE
  // -------------------------------------------------------
  const renderItem = ({ item }: any) => {
    const isMe = item.user._id === params.userId;

    return (
      <View
        style={{
          paddingHorizontal: 16,
          marginVertical: 6,
          flexDirection: "row",
          justifyContent: isMe ? "flex-end" : "flex-start",
        }}
      >
        <View
          style={{
            maxWidth: "80%",
            backgroundColor: isMe
              ? "#10b981"
              : colorScheme === "dark"
                ? "#374151"
                : "#e5e7eb",
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 18,
          }}
        >
          <Text
            style={{
              color: isMe
                ? "#fff"
                : colorScheme === "dark"
                  ? "#fff"
                  : "#000",
              fontSize: 16,
            }}
          >
            {item.text}
          </Text>

          <Text
            style={{
              color:
                isMe
                  ? "#ffffff99"
                  : colorScheme === "dark"
                    ? "#ffffff99"
                    : "#00000099",
              fontSize: 11,
              marginTop: 4,
              textAlign: "right",
            }}
          >
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  // -------------------------------------------------------
  // LOADING SCREEN
  // -------------------------------------------------------
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="small" color="#10b981" />
        <Text
          style={{ marginTop: 10, color: colorScheme === "dark" ? "#fff" : "#000" }}
        >
          Loading chat...
        </Text>
      </View>
    );
  }

  // -------------------------------------------------------
  // MAIN UI
  // -------------------------------------------------------
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0} // adjust as needed
    >
      <View style={styles.container}>
        <StatusBar style="light" />

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={styles.userInfo}>
            <Image
              source={{
                uri: params.avatar || "https://placeimg.com/140/140/people",
              }}
              style={styles.avatar}
            />
            <Text style={styles.userName}>{params.name}</Text>
          </View>
        </View>

        {/* CHAT LIST */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          inverted
          contentContainerStyle={{ paddingTop: 20 }}
        />

        {/* INPUT BAR */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor={colorScheme === "dark" ? "#aaa" : "#666"}
            value={input}
            onChangeText={setInput}
          />

          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ height: insets.bottom + 5 }} />
      </View>
    </KeyboardAvoidingView>
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
      borderBottomLeftRadius: Platform.OS === "ios" ? 60 : 30,
      borderBottomRightRadius: Platform.OS === "ios" ? 60 : 30,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    backBtn: { paddingRight: 10 },
    userInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#ccc" },
    userName: {
      color: "#fff",
      fontSize: 18,
      fontFamily: "Manrope_700Bold",
      textTransform: "capitalize",
    },

    inputBar: {
      flexDirection: "row",
      paddingHorizontal: 10,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: colorScheme === "dark" ? "#2c3854" : "#e4e4e4",
      marginHorizontal: 10,
      borderRadius: 14,
      marginBottom: 5,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: colorScheme === "dark" ? "#fff" : "#000",
      paddingHorizontal: 10,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#10b981",
      justifyContent: "center",
      alignItems: "center",
    },
  });
