import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Keyboard,
  Alert,
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
import { localstorage } from '../utils/localStorage';
import { setActiveChat } from "../src/state/activeChat";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput, BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { fetchWithAuth, fetchWithoutAuth, getCurrentUser } from "../src/api";

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
  const [negotiationInProgress, setNegotiationInProgress] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const sheetRef = useRef<BottomSheet>(null);
  const [sheetMode, setSheetMode] = useState<"menu" | "jobs" | "report" | "dispute">("menu");
  const [chatJobs, setChatJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [disputeSending, setDisputeSending] = useState(false);
  const [negotiationOffer, setNegotiationOffer] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const CHAT_SERVER_URL = Constants.expoConfig.extra.CHAT_SERVER_URL;
  const NEGOTIATIONS_KEY = "offer_negotiations";
  const sheetSnapPoints = ["35%", "60%", "90%"];

  useEffect(() => {
    // when chat opens
    if (params.receiverId) {
      setActiveChat(params.receiverId as string);
    }

    return () => {
      // when chat closes
      setActiveChat(null);
    };
  }, []);

  useEffect(() => {
    resolveNegotiationOffer();
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardOpen(true)
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardOpen(false)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (keyboardOpen) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: 0,
          animated: true,
        });
      }, 50);
    }
  }, [keyboardOpen]);

  const checkNegotiationStatus = async () => {
    try {
      const raw = await localstorage.get(NEGOTIATIONS_KEY);
      if (!raw) {
        setNegotiationInProgress(false);
        return;
      }

      const negotiations: Record<string, string[]> = JSON.parse(raw);

      const receiverId = params.receiverId as string;

      // Check if receiver is part of ANY active negotiation
      const isNegotiating = Object.values(negotiations).some(
        (bidders) => bidders.includes(receiverId)
      );

      setNegotiationInProgress(isNegotiating);
    } catch (e) {
      console.error("Negotiation check failed", e);
      setNegotiationInProgress(false);
    }
  };

  const getNegotiationOfferId = async (): Promise<string | null> => {
    const raw = await localstorage.get(NEGOTIATIONS_KEY);
    if (!raw) return null;

    const negotiations = JSON.parse(raw);
    const receiverId = params.receiverId as string;

    for (const offerId of Object.keys(negotiations)) {
      if (negotiations[offerId].includes(receiverId)) {
        return offerId;
      }
    }

    return null;
  };

  const resolveNegotiationOffer = async () => {
    try {
      const offerId = await getNegotiationOfferId();
      if (!offerId) {
        setNegotiationOffer(null);
        setNegotiationInProgress(false);
        return;
      }

      // fetch offer info (title only is enough)
      const res = await fetch(`${CHAT_SERVER_URL}/api/helpOffers/${offerId}`);
      if (!res.ok) return;

      const offer = await res.json();

      setNegotiationOffer({
        id: offerId,
        title: offer.title,
      });

      setNegotiationInProgress(true);
    } catch (e) {
      console.error("Failed to resolve negotiation offer", e);
    }
  };

  const goToOffer = () => {
    if (negotiationOffer) {
      router.push({
        pathname: '/helpOfferDetails',
        params: { data: negotiationOffer.id }
      });
    }
  }

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

    socket.current.on("connect", () => {
      console.log("🟢 SOCKET CONNECTED", socket.current.id);
    });

    socket.current.on("connect_error", (err) => {
      console.log("❌ SOCKET ERROR", err.message);
    });

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
    console.log('new message: ', input)
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

  const closeAllSheets = () => {
    
    sheetRef.current?.close();
  };

  const openMenu = async () => {
    Keyboard.dismiss();
    setSheetMode("menu");
    sheetRef.current?.expand();
    await loadChatJobs();
  };

  const formatShortDate = (value?: string | Date | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString();
  };

  const loadChatJobs = async () => {
    try {
      setJobsLoading(true);
      const data = await getCurrentUser();
      if (!data || data.error) {
        setChatJobs([]);
        return;
      }

      const openJobs = (data.helpjobs || []).filter((job: any) => job?.status === "open");
      if (openJobs.length === 0) {
        setChatJobs([]);
        return;
      }

      const receiverId = params.receiverId as string;

      const resolved = await Promise.all(
        openJobs.map(async (job: any) => {
          const rawOfferId = job?.offer?._id ?? job?.offer;
          if (!rawOfferId) return null;

          try {
            const offerRes = await fetchWithoutAuth(`/helpOffers/${rawOfferId}`);
            if (!offerRes.ok) return null;
            const offer = await offerRes.json();

            const ownerId = offer?.user?._id;
            const acceptedId = offer?.acceptedBid?.user?._id;

            const matchesReceiver =
              receiverId &&
              (receiverId === ownerId || receiverId === acceptedId);

            if (!matchesReceiver) return null;

            const isOwner = params.userId === ownerId;
            return {
              offerId: rawOfferId,
              title: offer?.title || "Untitled offer",
              subject: offer?.subject || "N/A",
              helpType: offer?.helpType || "N/A",
              startedAt: job?.startedAt,
              completedAt: job?.completedAt,
              role: job?.completedAt == null ? "On going" : "Completed",
            };
          } catch (e) {
            console.error("Failed to resolve job offer", e);
            return null;
          }
        })
      );

      setChatJobs(resolved.filter(Boolean));
    } finally {
      setJobsLoading(false);
    }
  };

  const openJobsSheet = async () => {
    setSheetMode("jobs");

    // sheetRef.current?.snapToIndex(1);
  };

  const openReportSheet = () => {
    setSheetMode("report");
    // sheetRef.current?.snapToIndex(1);
  };

  const openDisputeSheet = () => {
    setSheetMode("dispute");
    // sheetRef.current?.snapToIndex(1);
  };

  const sendSupportMessage = async (kind: "report" | "dispute") => {
    Keyboard.dismiss();
    const reason = kind === "report" ? reportReason.trim() : disputeReason.trim();
    if (!reason) {
      Alert.alert("Missing reason", "Please describe the issue first.");
      return;
    }

    const label = kind === "report" ? "Chat Report" : "Dispute Request";
    const payload = `${label}\nChatId: ${chatId ?? "unknown"}\nReporter: ${params.userId}\nReported: ${params.receiverId}\nReason: ${reason}`;

    try {
      kind === "report" ? setReportSending(true) : setDisputeSending(true);

      const resp = await fetchWithAuth("/support/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: payload }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        Alert.alert("Error", data?.message || "Failed to send your request.");
        return;
      }

      if (kind === "report") {
        setReportReason("");
      } else {
        setDisputeReason("");
      }

      closeAllSheets();
      Alert.alert("Sent", "Your request has been submitted.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to send your request.");
    } finally {
      kind === "report" ? setReportSending(false) : setDisputeSending(false);
    }
  };

  // -------------------------------------------------------
  // LOADING SCREEN
  // -------------------------------------------------------
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="small" color="#10b981" />
        <Text
          style={{ marginTop: 10, textAlign: 'center', color: colorScheme === "dark" ? "#fff" : "#000" }}
        >
          Loading chat...
        </Text>
      </View>
    );
  }

  // -------------------------------------------------------
  // -------------------------------------------------------
  // MAIN UI
  // -------------------------------------------------------
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0} // adjust as needed
      >
        <View style={styles.container}>
          <StatusBar style="light" />

          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/messages"); // or your inbox / home screen
                }
              }} style={styles.backBtn}>
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

            <TouchableOpacity onPress={openMenu} style={styles.menuBtn} accessibilityLabel="Open chat actions">
              <View style={styles.menuDots}>
                <View style={styles.menuDot} />
                <View style={styles.menuDot} />
              </View>
            </TouchableOpacity>
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
          <View>
            {negotiationInProgress && negotiationOffer && (
              <TouchableOpacity onPress={() => goToOffer()} style={styles.negotiation}>
                <Text style={styles.negotiationTitle}>
                  Negotiation in progress  - {negotiationOffer.title}
                </Text>

                {/* <Text style={styles.negotiationText}>
                  {negotiationOffer.title}
                </Text> */}

                <Text
                  style={[
                    styles.negotiationText,
                    { marginTop: 4, fontSize: 12 }
                  ]}
                >
                  Tap here to accept or reject {params.name} for this offer.
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.inputBar}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor={colorScheme === "dark" ? "#aaa" : "#666"}
                value={input}
                onChangeText={setInput}
              />

              <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: keyboardOpen ? 10 : insets.bottom }} />

          {/* ACTION SHEET */}
          <BottomSheet
            ref={sheetRef}
            index={-1}
            enableDynamicSizing={true}
            enablePanDownToClose
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.sheetHandle}
            keyboardBehavior="extend"
            keyboardBlurBehavior="restore"
            backdropComponent={(props) => (
              <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
              />
            )}
          >
            <BottomSheetView style={[styles.sheetBody, { paddingBottom: keyboardOpen ? 10 : insets.bottom }]}>
              {sheetMode === "menu" && (
                <>
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Chat Actions</Text>
                    <TouchableOpacity style={styles.sheetClose} onPress={closeAllSheets}>
                      <Ionicons name="close" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.sheetOption} onPress={openJobsSheet}>
                    <Ionicons name="briefcase-outline" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                    <Text style={styles.sheetOptionText}>Go to job details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.sheetOption} onPress={openReportSheet}>
                    <Ionicons name="flag-outline" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                    <Text style={styles.sheetOptionText}>Report</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.sheetOption} onPress={openDisputeSheet}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                    <Text style={styles.sheetOptionText}>Request dispute solution</Text>
                  </TouchableOpacity>
                </>
              )}

              {sheetMode === "jobs" && (
                <>
                  <View style={styles.sheetHeader}>
                    <View style={styles.sheetHeaderRow}>
                      <TouchableOpacity style={styles.sheetBack} onPress={() => setSheetMode("menu")}>
                        <Ionicons name="chevron-back" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                      </TouchableOpacity>
                      <Text style={styles.sheetTitle}>Open Job Details</Text>
                    </View>
                    <TouchableOpacity style={styles.sheetClose} onPress={closeAllSheets}>
                      <Ionicons name="close" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                    </TouchableOpacity>
                  </View>

                  <BottomSheetScrollView contentContainerStyle={styles.sheetScroll}>
                    {jobsLoading && (
                      <View style={styles.sheetLoading}>
                        <ActivityIndicator size="small" color="#10b981" />
                        <Text style={styles.sheetHint}>Loading open jobs...</Text>
                      </View>
                    )}

                    {!jobsLoading && chatJobs.length === 0 && (
                      <Text style={styles.sheetHint}>No open jobs found between you and {params.name}.</Text>
                    )}

                    {!jobsLoading && chatJobs.map((job) => (
                      <TouchableOpacity
                        key={job.offerId}
                        style={styles.jobCard}
                        onPress={() => {
                          closeAllSheets();
                          router.push({
                            pathname: "/jobDetails",
                            params: { offerId: job.offerId },
                          });
                        }}
                      >
                        <Text style={styles.jobTitle}>{job.title}</Text>
                        <Text style={styles.jobMeta}>{job.helpType} - {job.subject}</Text>
                        <Text style={styles.jobMeta}>Started: {formatShortDate(job.startedAt)}</Text>
                        <Text style={[styles.jobRole, job.completedAt != null && { color: '#ff0000' }]}>Status: {job.role}</Text>
                      </TouchableOpacity>
                    ))}
                  </BottomSheetScrollView>
                </>
              )}

              {sheetMode === "report" && (
                <>
                  <View style={styles.sheetHeader}>
                    <View style={styles.sheetHeaderRow}>
                      <TouchableOpacity style={styles.sheetBack} onPress={() => setSheetMode("menu")}>
                        <Ionicons name="chevron-back" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                      </TouchableOpacity>
                      <Text style={styles.sheetTitle}>Report User</Text>
                    </View>
                    <TouchableOpacity style={styles.sheetClose} onPress={closeAllSheets}>
                      <Ionicons name="close" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                    </TouchableOpacity>
                  </View>

                  <BottomSheetTextInput
                    multiline
                    value={reportReason}
                    onChangeText={setReportReason}
                    placeholder="Describe the issue and why you're reporting."
                    placeholderTextColor={colorScheme === "dark" ? "#9ca3af" : "#666"}
                    style={styles.sheetInput}
                  />

                  <TouchableOpacity
                    style={[styles.sheetSubmit, reportSending && styles.sheetSubmitDisabled]}
                    onPress={() => { sendSupportMessage("report"); }}
                    disabled={reportSending}
                  >
                    {reportSending && <ActivityIndicator size="small" color="#fff" />}
                    <Text style={styles.sheetSubmitText}>Submit report</Text>
                  </TouchableOpacity>
                </>
              )}

              {sheetMode === "dispute" && (
                <>
                  <View style={styles.sheetHeader}>
                    <View style={styles.sheetHeaderRow}>
                      <TouchableOpacity style={styles.sheetBack} onPress={() => setSheetMode("menu")}>
                        <Ionicons name="chevron-back" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                      </TouchableOpacity>
                      <Text style={styles.sheetTitle}>Request Dispute Solution</Text>
                    </View>
                    <TouchableOpacity style={styles.sheetClose} onPress={closeAllSheets}>
                      <Ionicons name="close" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                    </TouchableOpacity>
                  </View>

                  <BottomSheetTextInput
                    multiline
                    value={disputeReason}
                    onChangeText={setDisputeReason}
                    placeholder="Explain what you disagree about and what outcome you need."
                    placeholderTextColor={colorScheme === "dark" ? "#9ca3af" : "#666"}
                    style={styles.sheetInput}
                  />

                  <TouchableOpacity
                    style={[styles.sheetSubmit, disputeSending && styles.sheetSubmitDisabled]}
                    onPress={() => { sendSupportMessage("dispute"); }}
                    disabled={disputeSending}
                  >
                    {disputeSending && <ActivityIndicator size="small" color="#fff" />}
                    <Text style={styles.sheetSubmitText}>Submit request</Text>
                  </TouchableOpacity>
                </>
              )}
            </BottomSheetView>
          </BottomSheet>
        </View>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
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
      justifyContent: "space-between",
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
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
    negotiation: {
      marginBottom: 10,
      backgroundColor: colorScheme === "dark" ? "#2c3854" : "#e4e4e4",
      marginHorizontal: 10,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 10,
      // flexDirection: "row",
      // justifyContent: "space-between",
      // alignItems: "center",
    },
    negotiationTitle: {
      fontSize: 14,
      color: colorScheme === "dark" ? "#fff" : "#000",
      fontFamily: "Manrope_600SemiBold",
    },
    negotiationText: {
      fontSize: 14,
      color: colorScheme === "dark" ? "#fff" : "#000",
      fontFamily: "Manrope_400Regular",
      opacity: 0.6,
    },
    negotiationCtas: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10
    },
    negotiationCtaText: {
      fontSize: 14,
      color: colorScheme === "dark" ? "#fff" : "#000",
      fontFamily: "Manrope_600SemiBold",
    },
    accept: {
      color: '#10b981'
    },
    reject: {
      color: '#f85151'
    },
    inputBar: {
      flexDirection: "row",
      paddingHorizontal: 10,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: colorScheme === "dark" ? "#2c3854" : "#e4e4e4",
      marginHorizontal: 10,
      borderRadius: 14,
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
    menuBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#ffffff66",
    },
    menuDots: {
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    menuDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#fff",
    },
    sheetBackground: {
      backgroundColor: colorScheme === "dark" ? "#111827" : "#f4f3e9",
    },
    sheetHandle: {
      backgroundColor: colorScheme === "dark" ? "#2c3854" : "#b0b0b0",
    },
    sheetBody: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 0,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === "dark" ? "#1f2937" : "#e5e7eb",
      marginBottom: 12,
    },
    sheetHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    sheetBack: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#374151" : "#d1d5db",
    },
    sheetTitle: {
      fontSize: 16,
      fontFamily: "Manrope_700Bold",
      color: colorScheme === "dark" ? "#fff" : "#000",
    },
    sheetClose: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#374151" : "#d1d5db",
      alignItems: "center",
      justifyContent: "center",
    },
    sheetOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
    },
    sheetOptionText: {
      fontSize: 15,
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_600SemiBold",
    },
    sheetScroll: {
      paddingBottom: insets.bottom + 30,
    },
    sheetLoading: {
      paddingTop: 10,
      alignItems: "center",
      gap: 8,
      flexDirection: 'row',
      justifyContent: 'center'
    },
    sheetHint: {
      fontSize: 14,
      color: colorScheme === "dark" ? "#9ca3af" : "#6b7280",
      fontFamily: "Manrope_400Regular",
      textAlign: "center",
      // marginTop: 10,
    },
    jobCard: {
      padding: 14,
      borderRadius: 14,
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#fff",
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#2c3854" : "#e5e7eb",
    },
    jobTitle: {
      fontSize: 15,
      fontFamily: "Manrope_700Bold",
      color: colorScheme === "dark" ? "#fff" : "#111827",
      marginBottom: 4,
    },
    jobMeta: {
      fontSize: 13,
      color: colorScheme === "dark" ? "#9ca3af" : "#6b7280",
      fontFamily: "Manrope_400Regular",
    },
    jobRole: {
      marginTop: 6,
      fontSize: 12,
      color: "#10b981",
      fontFamily: "Manrope_600SemiBold",
    },
    sheetInput: {
      minHeight: 120,
      borderRadius: 14,
      padding: 12,
      textAlignVertical: "top",
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#fff",
      color: colorScheme === "dark" ? "#fff" : "#111827",
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#2c3854" : "#e5e7eb",
      fontFamily: "Manrope_400Regular",
      marginBottom: 16,
    },
    sheetSubmit: {
      backgroundColor: "#10b981",
      borderRadius: 24,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    sheetSubmitDisabled: {
      opacity: 0.7,
    },
    sheetSubmitText: {
      color: "#fff",
      fontFamily: "Manrope_700Bold",
      fontSize: 15,
    },
  });
