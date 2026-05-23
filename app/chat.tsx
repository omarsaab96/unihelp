import React, { useState, useEffect, useRef } from "react";
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
  KeyboardAvoidingView,
  PanResponder,
  Modal,
  Pressable,
  Share
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import io from "socket.io-client";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { WebView } from "react-native-webview";
import * as FileSystemLegacy from "expo-file-system/legacy";
import { localstorage } from '../utils/localStorage';
import { setActiveChat } from "../src/state/activeChat";
import BottomSheet, { BottomSheetBackdrop, BottomSheetTextInput, BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView, Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { fetchWithAuth, getCurrentUser } from "../src/api";
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useTranslation } from "../src/i18n";

export default function ChatPage() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();

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
  const [sheetMode, setSheetMode] = useState<"menu" | "report">("menu");
  const [reportReason, setReportReason] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [jobReported, setJobReported] = useState(false);
  const [hasReportedJob, setHasReportedJob] = useState(false);
  const [threadClosedByAcceptedBid, setThreadClosedByAcceptedBid] = useState(false);
  const [threadJobCompletedByEvent, setThreadJobCompletedByEvent] = useState(false);
  const [negotiationOffer, setNegotiationOffer] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [threadOffer, setThreadOffer] = useState<any>(null);
  const [threadTitle, setThreadTitle] = useState<string | null>(
    typeof params.threadTitle === "string" ? params.threadTitle : null
  );
  const [threadType, setThreadType] = useState<string | null>(
    typeof params.threadType === "string" ? params.threadType : null
  );
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordingCancel, setRecordingCancel] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<{ item: any; url: string } | null>(null);
  const previewSheetRef = useRef<BottomSheet>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewScale = useSharedValue(1);
  const previewSavedScale = useSharedValue(1);
  const previewTranslateX = useSharedValue(0);
  const previewTranslateY = useSharedValue(0);
  const previewSavedTranslateX = useSharedValue(0);
  const previewSavedTranslateY = useSharedValue(0);
  const previewOpacity = useSharedValue(1);
  const recordingCancelRef = useRef(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackInfo, setPlaybackInfo] = useState<{ id: string | null; position: number; duration: number; isPlaying: boolean }>({
    id: null,
    position: 0,
    duration: 0,
    isPlaying: false,
  });
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordTouchActiveRef = useRef(false);
  const recordingActiveRef = useRef(false);
  const pendingEmitQueueRef = useRef<Array<{ tempId: string; type: "image" | "audio" | "file"; attachment: any }>>([]);
  const emitRetryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingChatIdRef = useRef<string | null>(null);

  const [downloadStatus, setDownloadStatus] = useState<Record<string, { status: "idle" | "downloading" | "done"; progress: number; uri?: string }>>({});
  const downloadCacheRef = useRef<Record<string, { uri: string }>>({});
  const downloadsKey = chatId ? `chat_downloads_${chatId}` : null;
  const localUploadCacheRef = useRef<Record<string, string>>({});

  const CHAT_SERVER_URL = Constants.expoConfig.extra.CHAT_SERVER_URL;
  const NEGOTIATIONS_KEY = "offer_negotiations";
  const sheetSnapPoints = ["35%", "60%", "90%"];
  const threadHelpOfferId =
    (params.helpOfferId as string | undefined) ||
    (params.negotiationOfferId as string | undefined) ||
    (params.offerId as string | undefined);

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

  useEffect(() => {
    if (!previewImageUri) return;
    previewScale.value = 1;
    previewSavedScale.value = 1;
    previewTranslateX.value = 0;
    previewTranslateY.value = 0;
    previewSavedTranslateX.value = 0;
    previewSavedTranslateY.value = 0;
    previewOpacity.value = 1;
  }, [previewImageUri]);

  const checkNegotiationStatus = async () => {
    try {
      const raw = await localstorage.get(NEGOTIATIONS_KEY);
      if (!raw) {
        setNegotiationInProgress(false);
        return;
      }

      const negotiations: Record<string, string[]> = JSON.parse(raw);

      const receiverId = params.receiverId as string;
      const routeOfferId = threadHelpOfferId;

      if (routeOfferId) {
        setNegotiationInProgress(
          negotiations[routeOfferId]?.includes(receiverId) ?? false
        );
        return;
      }

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
    const routeOfferId = threadHelpOfferId;

    if (routeOfferId) {
      return negotiations[routeOfferId]?.includes(receiverId) ? routeOfferId : null;
    }

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
      setThreadOffer(offer);

      setNegotiationOffer({
        id: offerId,
        title: offer.title,
      });

      setNegotiationInProgress(true);
    } catch (e) {
      console.error("Failed to resolve negotiation offer", e);
    }
  };

  useEffect(() => {
    resolveNegotiationOffer();
  }, [threadHelpOfferId, params.receiverId]);

  useEffect(() => {
    const routeTitle = typeof params.threadTitle === "string" ? params.threadTitle : null;
    const routeType = typeof params.threadType === "string" ? params.threadType : null;

    if (!threadHelpOfferId) {
      setThreadTitle(routeTitle || t("messages.directChat"));
      setThreadType(routeType || "direct");
      setThreadOffer(null);
      return;
    }

    const loadThreadTitle = async () => {
      try {
        const res = await fetch(`${CHAT_SERVER_URL}/api/helpOffers/${threadHelpOfferId}`);
        if (!res.ok) return;

        const offer = await res.json();
        setThreadOffer(offer);
        setThreadTitle(routeTitle || offer.title);
        setThreadType(routeType || offer.type);
      } catch (e) {
        console.log("Failed to load chat thread title", e);
      }
    };

    loadThreadTitle();
  }, [threadHelpOfferId, params.threadTitle, params.threadType]);

  const isAdminReviewThread = params.adminReview === "true";
  const threadLabel = isAdminReviewThread
    ? t("chat.reportSettlementThread", { title: threadTitle || t("messages.directChat") })
    : threadType === "direct"
      ? t("messages.directChat")
      : threadTitle
        ? `${threadType === "offer" ? t("messages.offer") : t("messages.seek")}: ${threadTitle}`
        : null;
  const ownerId = threadOffer?.user?._id || threadOffer?.user;
  const threadParticipantIds = [params.userId, params.receiverId].map((id) => String(id));
  const threadCounterpartyBid = (threadOffer?.bids || []).find((bid: any) => {
    const bidUserId = bid?.user?._id || bid?.user;
    return bidUserId && threadParticipantIds.includes(String(bidUserId)) && String(bidUserId) !== String(ownerId);
  });
  const threadAcceptedBid = threadCounterpartyBid?.acceptedAt ? threadCounterpartyBid : threadOffer?.acceptedBid;
  const hasAcceptedBid = Boolean(threadAcceptedBid);
  const acceptedBidderId = threadAcceptedBid?.user?._id || threadAcceptedBid?.user;
  const threadBidRejected = Boolean(threadCounterpartyBid?.rejectedAt);
  const findThreadHelpJob = (person: any) =>
    person?.helpjobs?.find((item: any) =>
      String(item?.offer?._id || item?.offer) === String(threadHelpOfferId) &&
      (!threadAcceptedBid?._id || !item?.bid || String(item.bid?._id || item.bid) === String(threadAcceptedBid._id))
    );
  const ownerHelpJob = findThreadHelpJob(threadOffer?.user);
  const acceptedBidderHelpJob = findThreadHelpJob(threadAcceptedBid?.user);
  const threadJobCompleted = Boolean(
    ownerHelpJob?.completedAt ||
    acceptedBidderHelpJob?.completedAt ||
    ownerHelpJob?.status === "completed" ||
    acceptedBidderHelpJob?.status === "completed" ||
    threadJobCompletedByEvent
  );
  const isAcceptedJobThread = Boolean(
    hasAcceptedBid &&
    ownerId &&
    acceptedBidderId &&
    [params.userId, params.receiverId].some((id) => String(id) === String(ownerId)) &&
    [params.userId, params.receiverId].some((id) => String(id) === String(acceptedBidderId))
  );
  const offerChatFrozen = Boolean(
    !isAdminReviewThread &&
    (
      threadClosedByAcceptedBid ||
      threadJobCompleted ||
      threadBidRejected ||
      (threadOffer?.type === "seek" && hasAcceptedBid && !isAcceptedJobThread)
    )
  );
  const chatFrozen = threadJobCompleted || (!isAdminReviewThread && (jobReported || offerChatFrozen));
  const chatFrozenMessage = threadJobCompleted
    ? t("chat.jobCompletedFrozen")
    : jobReported
      ? t("chat.jobFrozen")
      : threadBidRejected
        ? t("chat.bidRejectedFrozen")
        : t("chat.offerClosed");
  const canReportJob = Boolean(threadHelpOfferId && hasAcceptedBid && isAcceptedJobThread);
  const detailsActionLabel = hasAcceptedBid
    ? t("chat.goToJobDetails")
    : t("chat.goToOfferDetails");

  const loadJobReportState = async () => {
    if (!threadHelpOfferId || !hasAcceptedBid || isAdminReviewThread) {
      setJobReported(false);
      setHasReportedJob(false);
      return;
    }

    try {
      const bidQuery = threadAcceptedBid?._id ? `?bidId=${encodeURIComponent(threadAcceptedBid._id)}` : "";
      const res = await fetchWithAuth(`/helpOffers/${threadHelpOfferId}/report${bidQuery}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        setJobReported(false);
        setHasReportedJob(false);
        return;
      }

      const data = await res.json();
      setJobReported(Boolean(data?.data && !data.data.resolvedAt));
      setHasReportedJob(Boolean(data?.data?.hasReported));
    } catch (_) {
      setJobReported(false);
      setHasReportedJob(false);
    }
  };

  useEffect(() => {
    setThreadClosedByAcceptedBid(false);
    setThreadJobCompletedByEvent(false);
    loadJobReportState();
  }, [threadHelpOfferId, hasAcceptedBid, isAdminReviewThread, threadAcceptedBid?._id]);

  const toAbsoluteUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("file:")) return url;
    return `${CHAT_SERVER_URL}${url}`;
  };

  const markCurrentThreadRead = async (activeChatId = chatId) => {
    if (!activeChatId || !params.userId) return;

    try {
      await fetch(`${CHAT_SERVER_URL}/api/chats/${activeChatId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: params.userId }),
      });
    } catch (e) {
      console.log("Failed to mark chat read", e);
    }
  };

  const initChatIfNeeded = async () => {
    if (chatId) return chatId;
    try {
      console.log("initChatIfNeeded: creating chat");
      const res = await fetch(`${CHAT_SERVER_URL}/api/chats/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: params.userId,
          receiverId: params.receiverId,
          helpOfferId: threadHelpOfferId,
        }),
      });
      const data = await res.json();
      if (data?.chatId) {
        setChatId(data.chatId);
        console.log("initChatIfNeeded: chatId", data.chatId);
        pendingChatIdRef.current = data.chatId;
        return data.chatId;
      }
      console.log("initChatIfNeeded: failed", data);
    } catch (e) {
      console.log("initChatIfNeeded: error", e);
    }
    return null;
  };

  const formatBytes = (bytes?: number) => {
    if (bytes == null) return "";
    if (bytes === 0) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
  };

  const formatDuration = (ms?: number) => {
    if (!ms || ms <= 0) return "0:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const getFileLabel = (mime?: string, name?: string) => {
    if (!mime) return name || t("chat.file");
    if (mime === "application/pdf") return t("chat.pdfDocument");
    if (mime === "application/msword") return t("chat.wordDocument");
    if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return t("chat.wordDocument");
    }
    if (mime === "application/vnd.ms-excel") return t("chat.spreadsheet");
    if (mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      return t("chat.spreadsheet");
    }
    return name || t("chat.file");
  };

  const getFileExtension = (name?: string) => {
    if (!name) return "";
    const parts = name.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  };

  const buildPreviewUrl = (url?: string, mime?: string, name?: string) => {
    if (!url) return "";
    if (!/^https?:/i.test(url)) return "";
    const ext = getFileExtension(name);
    const isWord =
      mime === "application/msword" ||
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === "doc" ||
      ext === "docx";
    const isExcel =
      mime === "application/vnd.ms-excel" ||
      mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      ext === "xls" ||
      ext === "xlsx";
    if (isWord || isExcel) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
  };

  const makeSafeFilename = (name?: string) => {
    if (!name) return `file-${Date.now()}`;
    return name.replace(/[^a-zA-Z0-9._-]/g, "_");
  };

  const loadDownloadCache = async () => {
    if (!downloadsKey) return;
    try {
      const raw = await localstorage.get(downloadsKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      const entries = Object.entries(parsed || {});
      const next: Record<string, { status: "idle" | "downloading" | "done"; progress: number; uri?: string }> = {};

      for (const [messageId, data] of entries) {
        if (!data?.uri) continue;
        const info = await FileSystemLegacy.getInfoAsync(data.uri);
        if (info.exists) {
          next[messageId] = { status: "done", progress: 1, uri: data.uri };
        }
      }

      downloadCacheRef.current = parsed || {};
      setDownloadStatus((prev) => ({ ...prev, ...next }));
    } catch (_) {
      // ignore corrupt cache
    }
  };

  const saveDownloadCache = async () => {
    if (!downloadsKey) return;
    try {
      await localstorage.set(downloadsKey, JSON.stringify(downloadCacheRef.current));
    } catch (_) {
      // ignore persistence errors
    }
  };

  const handleDownloadFile = async (item: any) => {
    console.log("handleDownloadFile: called", item?._id);
    const attachment = item?.attachments?.[0];
    if (!attachment?.url) {
      Alert.alert(t("chat.downloadFailed"), t("chat.missingFileUrl"));
      return null;
    }

    const url = toAbsoluteUrl(attachment.url);
    const key = item._id;
    const cachedUri = downloadStatus[key]?.uri || downloadCacheRef.current[key]?.uri;
    if (cachedUri) {
      try {
        const info = await FileSystemLegacy.getInfoAsync(cachedUri);
        if (info.exists) {
          setDownloadStatus((prev) => ({
            ...prev,
            [key]: { status: "done", progress: 1, uri: cachedUri },
          }));
          return cachedUri;
        }
      } catch (_) {
        // fall through to re-download
      }
    }

    setDownloadStatus((prev) => ({
      ...prev,
      [key]: { status: "downloading", progress: 0 },
    }));

    try {
      console.log("handleDownloadFile: start", url);
      const filename = makeSafeFilename(attachment.name) || `file-${Date.now()}`;
      const localUri = `${FileSystemLegacy.documentDirectory}${filename}`;
      console.log("handleDownloadFile: localUri", localUri);

      const downloadResumable = FileSystemLegacy.createDownloadResumable(
        url,
        localUri,
        {},
        (progress) => {
          const ratio =
            progress.totalBytesExpectedToWrite > 0
              ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite
              : 0;
          setDownloadStatus((prev) => ({
            ...prev,
            [key]: { status: "downloading", progress: ratio, uri: localUri },
          }));
        }
      );

      const result = await downloadResumable.downloadAsync();
      console.log("handleDownloadFile: result", result?.status, result?.uri);

      setDownloadStatus((prev) => ({
        ...prev,
        [key]: { status: "done", progress: 1, uri: localUri },
      }));
      downloadCacheRef.current[key] = { uri: localUri };
      console.log("File downloaded to:", localUri);
      await saveDownloadCache();
      return localUri;
    } catch (e: any) {
      console.log("handleDownloadFile: error", e?.message || e);
      setDownloadStatus((prev) => ({
        ...prev,
        [key]: { status: "idle", progress: 0 },
      }));
      Alert.alert(t("chat.downloadFailed"), e?.message || t("chat.couldNotDownloadFile"));
    }
    return null;
  };

  const onDownloadPress = (item: any) => {
    console.log("Download pressed", item?._id, item?.attachments?.[0]?.name);
    void handleDownloadFile(item);
  };

  const uploadFile = async (file: { uri: string; name: string; type: string }) =>
    new Promise<any>((resolve, reject) => {
      console.log("uploadFile: start", file?.name, file?.type);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${CHAT_SERVER_URL}/api/uploads`);

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log("uploadFile: success", data?.url);
            resolve({ ...data, url: toAbsoluteUrl(data.url) });
          } else {
            console.log("uploadFile: server error", xhr.status, data?.message);
            reject(new Error(data?.message || t("chat.uploadFailed")));
          }
        } catch (e) {
          console.log("uploadFile: parse error");
          reject(new Error(t("chat.uploadFailed")));
        }
      };

      xhr.onerror = () => {
        console.log("uploadFile: network error");
        reject(new Error(t("chat.uploadFailed")));
      };

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(event.loaded / event.total);
        }
      };

      const form = new FormData();
      form.append("file", file as any);
      xhr.send(form);
    });

  const openFilePreview = (item: any) => {
    const attachment = item?.attachments?.[0];
    if (!attachment?.url) return;
    const url = toAbsoluteUrl(attachment.url);
    console.log("openFilePreview", item?._id, url);
    setFilePreview({ item, url });
    setPreviewError(null);
    setPreviewLoading(true);
    setTimeout(() => {
      previewSheetRef.current?.expand();
    }, 0);
  };

  const closeFilePreview = () => {
    previewSheetRef.current?.close();
  };

  const shareFile = async (item: any) => {
    const attachment = item?.attachments?.[0];
    if (!attachment?.url) return;
    const key = item._id;
    const cachedUri = downloadStatus[key]?.uri || downloadCacheRef.current[key]?.uri;
    const localUri = cachedUri || (await handleDownloadFile(item)) || undefined;
    const shareUrl = localUri || toAbsoluteUrl(attachment.url);
    try {
      await Share.share({
        url: shareUrl,
        message: attachment.name || t("chat.file"),
      });
    } catch (_) {
      Alert.alert(t("chat.shareFailed"), t("chat.couldNotShareFile"));
    }
  };

  const addPendingAttachmentMessage = (
    tempId: string,
    type: "image" | "audio" | "file",
    attachment: any
  ) => {
    console.log("addPendingAttachmentMessage", type, tempId, attachment?.url);
    const pendingMessage = {
      _id: tempId,
      text: "",
      createdAt: new Date(),
      user: { _id: params.userId },
      pending: true,
      type,
      attachments: [attachment],
    };
    setMessages((prev) => [pendingMessage, ...prev]);
  };

  const updatePendingAttachmentMessage = (tempId: string, attachment: any) => {
    console.log("updatePendingAttachmentMessage", tempId, attachment?.url);
    setMessages((prev) =>
      prev.map((m) =>
        m._id === tempId
          ? { ...m, attachments: [attachment] }
          : m
      )
    );
  };

  const emitAttachmentMessage = (tempId: string, type: "image" | "audio" | "file", attachment: any) => {
    const activeChatId = chatId || pendingChatIdRef.current;
    if (!activeChatId || !socket.current?.connected) {
      console.log("emitAttachmentMessage queued", {
        type,
        tempId,
        hasChatId: !!activeChatId,
        socketConnected: !!socket.current?.connected,
      });
      pendingEmitQueueRef.current.push({ tempId, type, attachment });
      scheduleAttachmentFlush();
      return;
    }
    console.log("emitAttachmentMessage sending", type, tempId, attachment?.url);
    socket.current?.emit("sendMessage", {
      chatId: activeChatId,
      senderId: params.userId,
      receiverId: params.receiverId,
      text: "",
      type,
      attachments: [attachment],
      tempId,
      createdAt: new Date(),
    });
  };

  const stopPlayback = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
      } catch (_) { }
      try {
        await soundRef.current.unloadAsync();
      } catch (_) { }
      soundRef.current = null;
      setPlayingId(null);
      setPlaybackInfo({ id: null, position: 0, duration: 0, isPlaying: false });
    }
  };

  const playAudio = async (item: any) => {
    const rawUrl = item?.attachments?.[0]?.url;
    const url = toAbsoluteUrl(rawUrl);
    if (!url) return;
    const attachment = item?.attachments?.[0];

    if (playingId === item._id) {
      await stopPlayback();
      return;
    }

    await stopPlayback();
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true }
    );
    soundRef.current = sound;
    setPlayingId(item._id);
    setPlaybackInfo({ id: item._id, position: 0, duration: attachment?.duration || 0, isPlaying: true });

    const currentId = item._id;
    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status?.isLoaded) {
        setPlaybackInfo({
          id: currentId,
          position: status.positionMillis || 0,
          duration: status.durationMillis || attachment?.duration || 0,
          isPlaying: status.isPlaying || false,
        });
      }
      if (status?.didJustFinish) {
        stopPlayback();
      }
    });
  };

  useEffect(() => {
    return () => {
      stopPlayback();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => { });
        recordingRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (emitRetryTimerRef.current) {
        clearInterval(emitRetryTimerRef.current);
        emitRetryTimerRef.current = null;
      }
    };
  }, []);

  const handleImageAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    if (chatFrozen) {
      Alert.alert(t("common.error"), chatFrozenMessage);
      return;
    }

    if (!chatId) {
      await initChatIfNeeded();
    }
    const tempId = "local-" + Date.now();
    addPendingAttachmentMessage(tempId, "image", {
      url: asset.uri,
      name: asset.fileName || `photo-${Date.now()}.jpg`,
      mime: asset.mimeType || "image/jpeg",
      width: asset.width,
      height: asset.height,
    });
    try {
      setUploading(true);
      setUploadProgress(0);
      const name = asset.fileName || `photo-${Date.now()}.jpg`;
      const type = asset.mimeType || "image/jpeg";

      const uploaded = await uploadFile({
        uri: asset.uri,
        name,
        type,
      });

      const finalAttachment = {
        ...uploaded,
        width: asset.width,
        height: asset.height,
      };
      updatePendingAttachmentMessage(tempId, finalAttachment);
      emitAttachmentMessage(tempId, "image", finalAttachment);
    } catch (e: any) {
      Alert.alert(t("chat.uploadFailed"), e?.message || t("chat.couldNotUploadImage"));
    } finally {
      setUploading(false);
      setUploadProgress(null);
      setAttachmentMenuOpen(false);
      setRecordingCancel(false);
      recordingCancelRef.current = false;
    }
  };

  const pickImageFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("home.permissionRequired"), t("home.allowPhotoLibrary"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await handleImageAsset(result.assets[0]);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("home.permissionRequired"), t("chat.allowCamera"));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await handleImageAsset(result.assets[0]);
  };

  const pickDocument = async () => {
    if (chatFrozen) {
      Alert.alert(t("common.error"), chatFrozenMessage);
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];

    if (!chatId) {
      await initChatIfNeeded();
    }
    const tempId = "local-" + Date.now();
    const filename = makeSafeFilename(asset.name) || `file-${Date.now()}`;
    let localUri = asset.uri;
    try {
      const destination = `${FileSystemLegacy.documentDirectory}${filename}`;
      await FileSystemLegacy.copyAsync({ from: asset.uri, to: destination });
      localUri = destination;
    } catch (_) {
      // fallback to original uri
    }
    localUploadCacheRef.current[tempId] = localUri;
    downloadCacheRef.current[tempId] = { uri: localUri };
    setDownloadStatus((prev) => ({
      ...prev,
      [tempId]: { status: "done", progress: 1, uri: localUri },
    }));
    await saveDownloadCache();
    addPendingAttachmentMessage(tempId, "file", {
      url: asset.uri,
      name: asset.name || filename,
      mime: asset.mimeType || "application/octet-stream",
      size: asset.size,
    });

    try {
      setUploading(true);
      setUploadProgress(0);
      const uploaded = await uploadFile({
        uri: asset.uri,
        name: asset.name || `file-${Date.now()}`,
        type: asset.mimeType || "application/octet-stream",
      });

      updatePendingAttachmentMessage(tempId, uploaded);
      emitAttachmentMessage(tempId, "file", uploaded);
    } catch (e: any) {
      Alert.alert(t("chat.uploadFailed"), e?.message || t("chat.couldNotUploadDocument"));
    } finally {
      setUploading(false);
      setUploadProgress(null);
      setAttachmentMenuOpen(false);
    }
  };

  const startRecording = async () => {
    if (isRecording || uploading) return;
    if (chatFrozen) {
      Alert.alert(t("common.error"), chatFrozenMessage);
      return;
    }
    try {
      console.log("startRecording: requested");
      recordingActiveRef.current = true;
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t("home.permissionRequired"), t("chat.allowMicrophone"));
        recordingActiveRef.current = false;
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setAttachmentMenuOpen(false);
      setRecordingCancel(false);
      recordingCancelRef.current = false;
      setRecordSeconds(0);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      recordingTimerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (e: any) {
      Alert.alert(t("chat.recordingFailed"), e?.message || t("chat.couldNotStartRecording"));
      setIsRecording(false);
      recordingActiveRef.current = false;
    }
  };

  const stopRecordingAndSend = async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    try {
      console.log("stopRecordingAndSend: stopping");
      if (!chatId) {
        await initChatIfNeeded();
      }
      console.log("stopRecordingAndSend: chatId", chatId || pendingChatIdRef.current, "socketConnected", socket.current?.connected);
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const status: any = await recording.getStatusAsync();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      recordingRef.current = null;
      recordingActiveRef.current = false;
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (!uri) {
        console.log("stopRecordingAndSend: no uri");
        return;
      }

      const ext = uri.endsWith(".3gp") ? ".3gp" : uri.endsWith(".wav") ? ".wav" : ".m4a";
      const mime =
        ext === ".3gp" ? "audio/3gpp" : ext === ".wav" ? "audio/wav" : "audio/m4a";
      const name = `voice-${Date.now()}${ext}`;

      const tempId = "local-" + Date.now();
      addPendingAttachmentMessage(tempId, "audio", {
        url: uri,
        name,
        mime,
        duration: status?.durationMillis,
      });

      setUploading(true);
      setUploadProgress(0);
      const uploaded = await uploadFile({ uri, name, type: mime });

      const finalAttachment = {
        ...uploaded,
        duration: status?.durationMillis,
      };
      console.log("stopRecordingAndSend: uploaded", finalAttachment?.url);
      updatePendingAttachmentMessage(tempId, finalAttachment);
      emitAttachmentMessage(tempId, "audio", finalAttachment);
    } catch (e: any) {
      Alert.alert(t("chat.recordingFailed"), e?.message || t("chat.couldNotSendVoiceNote"));
    } finally {
      setUploading(false);
      setUploadProgress(null);
      setAttachmentMenuOpen(false);
      recordingActiveRef.current = false;
    }
  };

  const cancelRecording = async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
    } catch (_) { }

    recordingRef.current = null;
    recordingActiveRef.current = false;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setRecordingCancel(false);
    recordingCancelRef.current = false;
  };

  const clearRecordStartTimeout = () => {
    if (recordStartTimeoutRef.current) {
      clearTimeout(recordStartTimeoutRef.current);
      recordStartTimeoutRef.current = null;
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_evt, gesture) => {
        recordTouchActiveRef.current = true;
        clearRecordStartTimeout();
        recordStartTimeoutRef.current = setTimeout(() => {
          if (recordTouchActiveRef.current && !isRecording) {
            startRecording();
          }
        }, 300);
      },
      onPanResponderMove: (_evt, gesture) => {
        if (gesture.dx < -80) {
          setRecordingCancel(true);
          recordingCancelRef.current = true;
        } else {
          setRecordingCancel(false);
          recordingCancelRef.current = false;
        }
      },
      onPanResponderRelease: () => {
        recordTouchActiveRef.current = false;
        clearRecordStartTimeout();
        const isActuallyRecording = isRecording || recordingRef.current != null || recordingActiveRef.current;
        if (!isActuallyRecording) {
          setRecordingCancel(false);
          recordingCancelRef.current = false;
          return;
        }
        if (recordingCancelRef.current) {
          cancelRecording();
        } else {
          stopRecordingAndSend();
        }
      },
      onPanResponderTerminate: () => {
        recordTouchActiveRef.current = false;
        clearRecordStartTimeout();
        if (isRecording || recordingRef.current != null || recordingActiveRef.current) {
          cancelRecording();
        }
      },
    })
  ).current;

  const goToOffer = () => {
    if (negotiationOffer) {
      router.push({
        pathname: '/helpOfferDetails',
        params: {
          bidTab: true,
          data: negotiationOffer.id
        }
      });
    }
  }

  // -------------------------------------------------------
  // INIT CHAT
  // -------------------------------------------------------
  useEffect(() => {
    const initChat = async () => {
      try {
        setLoading(true);
        setChatId(null);
        pendingChatIdRef.current = null;
        setMessages([]);

        const res = await fetch(`${CHAT_SERVER_URL}/api/chats/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderId: params.userId,
            receiverId: params.receiverId,
            helpOfferId: threadHelpOfferId,
          }),
        });

        const data = await res.json();
        setChatId(data.chatId);
        console.log("Chat init complete, chatId:", data.chatId);
        markCurrentThreadRead(data.chatId);
        scheduleAttachmentFlush();

        const formatted = (data.messages || []).map((m: any) => ({
          _id: m._id,
          text: m.text,
          createdAt: new Date(m.createdAt),
          user: { _id: m.senderId },
          type: m.type || "text",
          attachments: m.attachments || [],
          metadata: m.metadata || null,
        }));

        setMessages(formatted);
      } catch (e) {
        console.log("Chat init error:", e);
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [params.userId, params.receiverId, threadHelpOfferId]);

  // -------------------------------------------------------
  // SOCKET CONNECTION
  // -------------------------------------------------------
  useEffect(() => {
    if (!chatId) return;

    socket.current = io(CHAT_SERVER_URL, { transports: ["websocket"] });
    socket.current.emit("join", chatId);

    socket.current.on("connect", () => {
      console.log("🟢 SOCKET CONNECTED", socket.current.id);
      flushAttachmentQueue();
      scheduleAttachmentFlush();
    });

    socket.current.on("connect_error", (err) => {
      console.log("❌ SOCKET ERROR", err.message);
    });

    socket.current.on("messageError", (error: any) => {
      if (error?.tempId) {
        setMessages((prev) => prev.filter((item) => item._id !== error.tempId));
      }
      Alert.alert(t("common.error"), error?.message || t("chat.failedSendRequest"));
      if (error?.code === "jobCompleted") {
        setThreadJobCompletedByEvent(true);
      } else if (error?.code === "offerClosed" || error?.code === "bidRejected") {
        setThreadClosedByAcceptedBid(true);
      } else if (error?.code === "jobReported" && threadHelpOfferId) {
        setJobReported(true);
      }
    });

    socket.current.on("chatFrozen", (event: any) => {
      if (event?.code === "jobCompleted") {
        setThreadJobCompletedByEvent(true);
      }
      if (event?.code === "offerClosed" || event?.code === "bidRejected") {
        setThreadClosedByAcceptedBid(true);
      }
      if (event?.code === "jobReported") {
        setJobReported(true);
      }
    });

    socket.current.on("newMessage", (msg: any) => {
      console.log("newMessage", msg?.type, msg?.tempId, msg?._id);
      if (msg?.type === "system" && msg?.metadata?.eventKey === "jobReportResolved") {
        setJobReported(false);
        setHasReportedJob(false);
      }
      if (String(msg.receiverId) === String(params.userId)) {
        markCurrentThreadRead(msg.chatId);
      }
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
              type: msg.type || "text",
              attachments: msg.attachments || [],
              metadata: msg.metadata || null,
            };
            return updated;
          }
        }

        // STEP 2 — Normal received message (not ours)
        if (prev.some((m) => String(m._id) === String(msg._id))) {
          return prev;
        }

        return [
          {
            _id: msg._id,
            text: msg.text,
            createdAt: new Date(msg.createdAt),
            user: { _id: msg.senderId },
            type: msg.type || "text",
            attachments: msg.attachments || [],
            metadata: msg.metadata || null,
          },
          ...prev,
        ];
      });
      if (msg.tempId && localUploadCacheRef.current[msg.tempId]) {
        const uri = localUploadCacheRef.current[msg.tempId];
        setDownloadStatus((prev) => {
          const next = { ...prev };
          delete next[msg.tempId];
          next[msg._id] = { status: "done", progress: 1, uri };
          return next;
        });
        downloadCacheRef.current[msg._id] = { uri };
        delete downloadCacheRef.current[msg.tempId];
        delete localUploadCacheRef.current[msg.tempId];
        void saveDownloadCache();
      }
    });


    return () => socket.current.disconnect();
  }, [chatId]);

  useEffect(() => {
    setDownloadStatus({});
    downloadCacheRef.current = {};
    if (chatId) {
      loadDownloadCache();
    }
  }, [chatId]);

  const flushAttachmentQueue = () => {
    if (!chatId || pendingEmitQueueRef.current.length === 0) return;
    if (!socket.current?.connected) return;
    const activeChatId = chatId || pendingChatIdRef.current;
    if (!activeChatId) return;
    const queued = [...pendingEmitQueueRef.current];
    pendingEmitQueueRef.current = [];
    console.log("Flushing attachment queue:", queued.length);
    queued.forEach(({ tempId, type, attachment }) => {
      socket.current?.emit("sendMessage", {
        chatId: activeChatId,
        senderId: params.userId,
        receiverId: params.receiverId,
        text: "",
        type,
        attachments: [attachment],
        tempId,
        createdAt: new Date(),
      });
    });
    if (pendingEmitQueueRef.current.length === 0 && emitRetryTimerRef.current) {
      clearInterval(emitRetryTimerRef.current);
      emitRetryTimerRef.current = null;
    }
  };

  useEffect(() => {
    flushAttachmentQueue();
  }, [chatId]);

  const scheduleAttachmentFlush = () => {
    if (emitRetryTimerRef.current) return;
    emitRetryTimerRef.current = setInterval(() => {
      if (chatId && socket.current?.connected && pendingEmitQueueRef.current.length > 0) {
        flushAttachmentQueue();
      }
    }, 800);
  };

  // -------------------------------------------------------
  // SEND MESSAGE
  // -------------------------------------------------------
  const sendMessage = () => {
    console.log('new message: ', input)
    if (!input.trim() || !chatId) return;
    if (chatFrozen) {
      Alert.alert(t("common.error"), chatFrozenMessage);
      return;
    }

    const localId = "local-" + Date.now();

    // 1️⃣ Add instant pending bubble
    const pendingMessage = {
      _id: localId,
      text: input,
      createdAt: new Date(),
      user: { _id: params.userId },
      pending: true, // ⬅ VERY IMPORTANT
      type: "text",
      attachments: [],
    };

    setMessages((prev) => [pendingMessage, ...prev]);

    // 2️⃣ Emit to server
    socket.current.emit("sendMessage", {
      chatId,
      senderId: params.userId,
      receiverId: params.receiverId,
      text: input,
      type: "text",
      attachments: [],
      tempId: localId,   // ⬅ Send tempId to server
      createdAt: new Date(),
    });

    setInput("");
  };

  const getCurrentUserDisplayName = async () => {
    try {
      const data = await getCurrentUser();
      const fullName = `${data?.firstname || ""} ${data?.lastname || ""}`.trim();
      return fullName || t("common.you");
    } catch (_) {
      return t("common.you");
    }
  };

  const addSystemMessageToState = (message: any) => {
    setMessages((prev) => {
      if (prev.some((item) => String(item._id) === String(message._id))) return prev;
      return [
        {
          _id: message._id,
          text: message.text,
          createdAt: new Date(message.createdAt),
          user: { _id: message.senderId },
          type: "system",
          attachments: [],
          metadata: message.metadata || null,
        },
        ...prev,
      ];
    });
  };

  const createSystemMessage = async (eventKey: string) => {
    if (!chatId) return;

    const actorName = await getCurrentUserDisplayName();
    const text = t("chat.systemJobReported", { name: actorName });

    const response = await fetch(`${CHAT_SERVER_URL}/api/chats/${chatId}/system`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderId: params.userId,
        receiverId: params.receiverId,
        text,
        metadata: {
          eventKey,
          actorName,
        },
      }),
    });

    if (!response.ok) throw new Error(t("chat.failedCreateSystemMessage"));

    const data = await response.json();
    if (data?.message) {
      addSystemMessageToState(data.message);
    }
  };


  // -------------------------------------------------------
  // RENDER BUBBLE
  // -------------------------------------------------------
  const renderMessageContent = (item: any, isMe: boolean) => {
    const type = item.type || "text";
    const attachment = item.attachments?.[0];

    if (type === "system") {
      const eventKey = item.metadata?.eventKey;
      const actorName = item.metadata?.actorName || item.text;
      const text = eventKey === "jobReported"
        ? t("chat.systemJobReported", { name: actorName })
        : eventKey === "jobReportResolved"
          ? t("chat.systemJobReportResolved")
        : eventKey === "bidAccepted"
          ? t("chat.systemBidAccepted", { name: actorName })
        : eventKey === "requestAccepted"
          ? t("chat.systemRequestAccepted", { name: actorName })
        : eventKey === "bidRejected"
          ? t("chat.systemBidRejected", { name: actorName })
        : eventKey === "requestRejected"
          ? t("chat.systemRequestRejected", { name: actorName })
        : item.text;

      return <Text style={styles.systemMessageText}>{text}</Text>;
    }

    if (type === "image" && attachment?.url) {
      const uri = toAbsoluteUrl(attachment.url);
      return (
        <View>
          <TouchableOpacity onPress={() => setPreviewImageUri(uri)} activeOpacity={0.9}>
            <Image
              source={{ uri }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
          {item.text ? (
            <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
              {item.text}
            </Text>
          ) : null}
        </View>
      );
    }

    if (type === "audio" && attachment?.url) {
      const durationLabel = formatDuration(attachment?.duration);
      const isActive = playbackInfo.id === item._id;
      const progress =
        isActive && playbackInfo.duration > 0
          ? playbackInfo.position / playbackInfo.duration
          : 0;
      const isPlayingNow = isActive && playbackInfo.isPlaying;
      const bars = [6, 10, 8, 14, 9, 12, 7, 15, 11, 8, 13, 7, 10, 14, 9, 12, 8, 11];
      return (
        <TouchableOpacity style={styles.audioBubble} onPress={() => playAudio(item)}>
          <View style={[styles.audioPlayCircle, isMe && styles.audioPlayCircleMe]}>
            <Ionicons
              name={isPlayingNow ? "pause" : "play"}
              size={16}
              color={isMe ? "#10b981" : "#111827"}
            />
          </View>
          <View style={styles.audioWaveWrapper}>
            <View style={styles.audioWaveTrack}>
              <View style={[styles.audioWaveProgress, { width: `${Math.min(100, Math.max(0, progress * 100))}%` }]} />
            </View>
            <View style={styles.audioWaveBars}>
              {bars.map((h, idx) => (
                <View
                  key={`bar-${idx}`}
                  style={[
                    styles.audioWaveBar,
                    { height: h, opacity: idx / bars.length <= progress ? 1 : 0.5 },
                    isMe && styles.audioWaveBarMe,
                  ]}
                />
              ))}
            </View>
          </View>
          <Text style={[styles.audioDuration, isMe && styles.audioDurationMe]}>
            {durationLabel}
          </Text>
        </TouchableOpacity>
      );
    }

    if (type === "file" && attachment?.url) {
      const download = downloadStatus[item._id] || { status: "idle", progress: 0 };
      const isDownloaded = download.status === "done";
      return (
        <View style={[styles.fileRow, { alignItems: "flex-start" }]}>
          <Ionicons
            name={isDownloaded ? "document-text-outline" : "download-outline"}
            size={18}
            color={isMe ? "#fff" : "#111827"}
          />
          <View style={{ paddingRight: 10 }}>
            <Text style={[styles.fileName, isMe && styles.messageTextMe]} numberOfLines={1}>
              {attachment.name || t("chat.document")}
            </Text>
            <Text style={[styles.fileMeta, isMe && styles.fileMetaMe]}>
              {getFileLabel(attachment.mime, attachment.name)}
              {attachment.size ? ` - ${formatBytes(attachment.size)}` : ""}
            </Text>
            <View style={styles.fileActionRow}>
              {!isDownloaded && (
                <TouchableOpacity
                  onPress={() => onDownloadPress(item)}
                  disabled={download.status === "downloading"}
                  style={styles.fileAction}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={[styles.fileActionText, isMe && styles.fileActionTextMe]}>
                    {download.status === "downloading" ? t("chat.downloading") : t("chat.download")}
                  </Text>
                  {download.status === "downloading" && (
                    <Text style={[styles.fileProgressText, isMe && styles.fileProgressTextMe]}>
                      {Math.round(download.progress * 100)}%
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              {isDownloaded && (
                <>
                  <TouchableOpacity onPress={() => openFilePreview(item)} style={styles.fileAction}>
                    <Text style={[styles.fileActionText, isMe && styles.fileActionTextMe]}>
                      {t("chat.preview")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => shareFile(item)} style={styles.fileAction}>
                    <Text style={[styles.fileActionText, isMe && styles.fileActionTextMe]}>
                      {t("chat.share")}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      );
    }

    return (
      <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
        {item.text}
      </Text>
    );
  };

  const closePreview = () => setPreviewImageUri(null);

  const previewPinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const nextScale = previewSavedScale.value * e.scale;
      previewScale.value = Math.min(4, Math.max(1, nextScale));
    })
    .onEnd(() => {
      const finalScale = Math.min(4, Math.max(1, previewScale.value));
      previewScale.value = withSpring(finalScale);
      previewSavedScale.value = finalScale;
      if (finalScale === 1) {
        previewTranslateX.value = withSpring(0);
        previewTranslateY.value = withSpring(0);
        previewSavedTranslateX.value = 0;
        previewSavedTranslateY.value = 0;
      }
    });

  const previewPanGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (previewScale.value > 1) {
        previewTranslateX.value = previewSavedTranslateX.value + e.translationX;
        previewTranslateY.value = previewSavedTranslateY.value + e.translationY;
      } else {
        previewTranslateY.value = e.translationY;
        previewOpacity.value = 1 - Math.min(0.6, Math.abs(e.translationY) / 300);
      }
    })
    .onEnd((e) => {
      if (previewScale.value <= 1) {
        const shouldClose = Math.abs(e.translationY) > 180 || Math.abs(e.velocityY) > 1000;
        if (shouldClose) {
          previewOpacity.value = withTiming(0, { duration: 120 });
          runOnJS(closePreview)();
          return;
        }
        previewTranslateY.value = withSpring(0);
        previewOpacity.value = withTiming(1, { duration: 150 });
        return;
      }

      previewSavedTranslateX.value = previewTranslateX.value;
      previewSavedTranslateY.value = previewTranslateY.value;
    });

  const previewDoubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const targetScale = previewScale.value > 1 ? 1 : 2;
      previewScale.value = withSpring(targetScale);
      previewSavedScale.value = targetScale;
      if (targetScale === 1) {
        previewTranslateX.value = withSpring(0);
        previewTranslateY.value = withSpring(0);
        previewSavedTranslateX.value = 0;
        previewSavedTranslateY.value = 0;
        previewOpacity.value = withTiming(1, { duration: 150 });
      }
    });

  const previewGesture = Gesture.Simultaneous(
    previewPinchGesture,
    previewPanGesture,
    previewDoubleTapGesture
  );

  const previewImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: previewTranslateX.value },
      { translateY: previewTranslateY.value },
      { scale: previewScale.value },
    ],
  }));

  const previewOverlayStyle = useAnimatedStyle(() => ({
    opacity: previewOpacity.value,
  }));
  const previewUrl = filePreview
    ? buildPreviewUrl(
      filePreview.url,
      filePreview.item?.attachments?.[0]?.mime,
      filePreview.item?.attachments?.[0]?.name
    )
    : "";
  const previewIsOffice = Boolean(
    filePreview &&
    (() => {
      const mime = filePreview.item?.attachments?.[0]?.mime;
      const name = filePreview.item?.attachments?.[0]?.name;
      const ext = getFileExtension(name);
      return (
        mime === "application/msword" ||
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mime === "application/vnd.ms-excel" ||
        mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        ext === "doc" ||
        ext === "docx" ||
        ext === "xls" ||
        ext === "xlsx"
      );
    })()
  );

  const isSameDay = (a?: Date | string, b?: Date | string) => {
    if (!a || !b) return false;
    const first = new Date(a);
    const second = new Date(b);
    return first.getFullYear() === second.getFullYear()
      && first.getMonth() === second.getMonth()
      && first.getDate() === second.getDate();
  };

  const formatDateSeparator = (value?: Date | string) => {
    const date = new Date(value || Date.now());
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(date, today)) return t("chat.today");
    if (isSameDay(date, yesterday)) return t("chat.yesterday");
    return date.toLocaleDateString();
  };

  const renderItem = ({ item, index }: any) => {
    const isSystem = item.type === "system";
    const isMe = item.user._id === params.userId;
    const olderMessage = messages[index + 1];
    const showDateSeparator = !olderMessage || !isSameDay(item.createdAt, olderMessage.createdAt);

    return (
      <>
        <View
          style={{
            paddingHorizontal: 16,
            marginVertical: 6,
            flexDirection: "row",
            justifyContent: isSystem ? "center" : isMe ? "flex-end" : "flex-start",
          }}
        >
          <View
            style={{
              maxWidth: isSystem ? "90%" : "80%",
              backgroundColor: isSystem
                ? colorScheme === "dark" ? "#1f2937" : "#e5e7eb"
                : isMe
                  ? "#10b981"
                  : colorScheme === "dark"
                    ? "#374151"
                    : "#e5e7eb",
              paddingHorizontal: isSystem ? 12 : 14,
              paddingVertical: isSystem ? 6 : 10,
              borderRadius: isSystem ? 14 : 18,
              opacity: item.pending ? 0.6 : 1,
            }}
          >
            {renderMessageContent(item, isMe)}

            {!isSystem && (
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
            )}
          </View>
        </View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>{formatDateSeparator(item.createdAt)}</Text>
          </View>
        )}
      </>
    );
  };

  const closeAllSheets = () => {

    sheetRef.current?.close();
  };

  const openMenu = async () => {
    Keyboard.dismiss();
    setSheetMode("menu");
    sheetRef.current?.expand();
  };

  const goToThreadDetails = () => {
    if (!threadHelpOfferId) {
      Alert.alert(t("common.error"), t("chat.noJobForThread"));
      return;
    }

    closeAllSheets();
    if (!hasAcceptedBid) {
      router.push({
        pathname: "/helpOfferDetails",
        params: { data: threadHelpOfferId },
      });
      return;
    }

    router.push({
      pathname: "/jobDetails",
      params: { offerId: threadHelpOfferId, bidId: threadAcceptedBid?._id },
    });
  };

  const openReportSheet = () => {
    if (!canReportJob) return;
    if (hasReportedJob) return;
    setSheetMode("report");
    // sheetRef.current?.snapToIndex(1);
  };

  const sendReportMessage = async () => {
    Keyboard.dismiss();
    const reason = reportReason.trim();
    if (!threadHelpOfferId) {
      Alert.alert(t("common.error"), t("chat.noJobForThread"));
      return;
    }
    if (!canReportJob) {
      Alert.alert(t("common.error"), t("chat.noJobForThread"));
      return;
    }

    if (!reason) {
      Alert.alert(t("chat.missingReason"), t("chat.describeIssueFirst"));
      return;
    }

    try {
      setReportSending(true);

      const reportRes = await fetchWithAuth(`/helpOffers/${threadHelpOfferId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reason, bidId: threadAcceptedBid?._id }),
      });

      if (!reportRes.ok) {
        const data = await reportRes.json();
        Alert.alert(t("common.error"), data?.message || t("chat.failedSendRequest"));
        return;
      }

      setReportReason("");
      setJobReported(true);
      setHasReportedJob(true);
      await createSystemMessage("jobReported");
      closeAllSheets();
      Alert.alert(t("chat.sent"), t("chat.requestSubmitted"));
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message || t("chat.failedSendRequest"));
    } finally {
      setReportSending(false);
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
          {t("chat.loadingChat")}
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
        <Modal
          visible={!!previewImageUri}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewImageUri(null)}
          statusBarTranslucent
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Animated.View style={[styles.previewOverlay, previewOverlayStyle]}>
              <Pressable style={styles.previewBackdrop} onPress={closePreview} />
              <GestureDetector gesture={previewGesture}>
                <Animated.Image
                  source={{ uri: previewImageUri || "" }}
                  style={[styles.previewImage, previewImageStyle]}
                  resizeMode="contain"
                />
              </GestureDetector>
              <TouchableOpacity
                onPress={closePreview}
                style={[styles.previewClose, { top: insets.top + 12 }]}
                accessibilityLabel={t("chat.closeImagePreview")}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          </GestureHandlerRootView>
        </Modal>
        <View style={styles.container}>
          <StatusBar style="light" />

          {/* HEADER */}
          {/* <View style={{ backgroundColor: colorScheme === "dark" ? "#2c3854" : "#e4e4e4"}}> */}
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

              <TouchableOpacity onPress={openMenu} style={styles.menuBtn} accessibilityLabel={t("chat.openChatActions")}>
                <View style={styles.menuDots}>
                  <View style={styles.menuDot} />
                  <View style={styles.menuDot} />
                  <View style={styles.menuDot} />
                </View>
              </TouchableOpacity>
            </View>
          {/* </View> */}

          {!!threadLabel && (
            <View style={styles.threadTitleBand}>
              <Text style={styles.threadTitleBandText} numberOfLines={1}>
                {threadLabel}
              </Text>
            </View>
          )}

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
            {chatFrozen && (
              <View style={styles.frozenNotice}>
                <Text style={styles.frozenNoticeText}>{chatFrozenMessage}</Text>
              </View>
            )}
            {negotiationInProgress && negotiationOffer && (
              <TouchableOpacity onPress={() => goToOffer()} style={styles.negotiation}>
                <Text style={styles.negotiationTitle}>
                  {t("chat.negotiationInProgress")}
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
                  {t("chat.negotiationHint", { name: String(params.name || "") })}
                </Text>
              </TouchableOpacity>
            )}
            {attachmentMenuOpen && !chatFrozen && (
              <View style={styles.attachMenu}>
                <TouchableOpacity style={styles.attachItem} onPress={takePhoto}>
                  <Ionicons name="camera" size={20} color="#10b981" />
                  <Text style={styles.attachLabel}>{t("chat.camera")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachItem} onPress={pickImageFromLibrary}>
                  <Ionicons name="image" size={20} color="#10b981" />
                  <Text style={styles.attachLabel}>{t("chat.gallery")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachItem} onPress={pickDocument}>
                  <Ionicons name="document" size={20} color="#10b981" />
                  <Text style={styles.attachLabel}>{t("chat.document")}</Text>
                </TouchableOpacity>
                {/* <TouchableOpacity style={styles.attachItem} onPress={() => { isRecording ? stopRecordingAndSend() : startRecording(); }}>
                  <Ionicons name={isRecording ? "stop-circle" : "mic"} size={20} color={isRecording ? "#ef4444" : "#10b981"} />
                  <Text style={[styles.attachLabel, isRecording && { color: "#ef4444" }]}>
                    {isRecording ? "Stop" : "Voice"}
                  </Text>
                </TouchableOpacity> */}
              </View>
            )}

            {!chatFrozen&&<View style={styles.inputBar}>
              <TouchableOpacity
                onPress={() => {
                  if (chatFrozen) return;
                  Keyboard.dismiss();
                  setAttachmentMenuOpen((prev) => !prev);
                }}
                style={[styles.attachBtn, chatFrozen && styles.inputDisabled]}
                disabled={chatFrozen}
              >
                <FontAwesome6 name="add" size={20} color="#fff" />
              </TouchableOpacity>

              {(uploading || isRecording) && (
                <View style={[styles.statusRow]}>
                  {uploading &&
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <ActivityIndicator size="small" color="#10b981" />
                      <Text style={styles.statusText}>{t("chat.uploading")}</Text>
                    </View>
                  }
                  {!uploading && isRecording && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View style={styles.recordDot} />
                      <Text style={[styles.statusText, recordingCancel && styles.statusTextCancel]}>
                        {t("chat.recordingStatus", { seconds: recordSeconds, action: recordingCancel ? t("chat.releaseToCancel") : t("chat.slideToCancel") })}
                      </Text>
                    </View>
                  )}
                  {uploading && uploadProgress !== null && (
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${Math.max(2, Math.floor(uploadProgress * 100))}%` }]} />
                    </View>
                  )}
                </View>
              )}

              {!isRecording && !uploading && <TextInput
                style={styles.input}
                placeholder={t("chat.typeMessage")}
                placeholderTextColor={colorScheme === "dark" ? "#aaa" : "#666"}
                value={input}
                onChangeText={setInput}
                editable={!chatFrozen}
              />}

              {input.trim() !== '' && !isRecording && <TouchableOpacity
                onPress={sendMessage}
                style={[styles.sendBtn, chatFrozen && styles.inputDisabled]}
                disabled={chatFrozen}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>}

              {input.trim() === '' && <View
                style={[styles.micBtn, isRecording && styles.micBtnRecording, chatFrozen && styles.inputDisabled]}
                {...(chatFrozen ? {} : panResponder.panHandlers)}
              >
                <Ionicons name="mic" size={20} color="#fff" />
              </View>}
            </View>}
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
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            backdropComponent={(props) => (
              <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
              />
            )}
          >
            <BottomSheetView style={[styles.sheetBody, { paddingBottom: keyboardOpen ? 10 : insets.bottom + 10 }]}>
              {sheetMode === "menu" && (
                <>
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>{t("chat.actions")}</Text>
                    <TouchableOpacity style={styles.sheetClose} onPress={closeAllSheets}>
                      <Ionicons name="close" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.sheetOption} onPress={goToThreadDetails}>
                    <Ionicons name="briefcase-outline" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                    <Text style={styles.sheetOptionText}>{detailsActionLabel}</Text>
                  </TouchableOpacity>

                  {canReportJob && (
                    <TouchableOpacity
                      style={[styles.sheetOption, hasReportedJob && styles.sheetOptionDisabled]}
                      onPress={openReportSheet}
                      disabled={hasReportedJob}
                    >
                      <Ionicons
                        name={hasReportedJob ? "checkmark-circle-outline" : "flag-outline"}
                        size={20}
                        color={colorScheme === "dark" ? "#fff" : "#000"}
                      />
                      <Text style={styles.sheetOptionText}>
                        {hasReportedJob ? t("chat.alreadyReportedJob") : t("chat.report")}
                      </Text>
                    </TouchableOpacity>
                  )}

                </>
              )}

              {sheetMode === "report" && (
                <>
                  <View style={styles.sheetHeader}>
                    <View style={styles.sheetHeaderRow}>
                      <TouchableOpacity style={styles.sheetBack} onPress={() => setSheetMode("menu")}>
                        <Ionicons name="chevron-back" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                      </TouchableOpacity>
                      <Text style={styles.sheetTitle}>{t("chat.reportUser")}</Text>
                    </View>
                    <TouchableOpacity style={styles.sheetClose} onPress={closeAllSheets}>
                      <Ionicons name="close" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                    </TouchableOpacity>
                  </View>

                  <BottomSheetTextInput
                    multiline
                    value={reportReason}
                    onChangeText={setReportReason}
                    placeholder={t("chat.reportPlaceholder")}
                    placeholderTextColor={colorScheme === "dark" ? "#9ca3af" : "#666"}
                    style={styles.sheetInput}
                  />

                  <TouchableOpacity
                    style={[styles.sheetSubmit, reportSending && styles.sheetSubmitDisabled]}
                    onPress={sendReportMessage}
                    disabled={reportSending}
                  >
                    {reportSending && <ActivityIndicator size="small" color="#fff" />}
                    <Text style={styles.sheetSubmitText}>{t("chat.submitReport")}</Text>
                  </TouchableOpacity>
                </>
              )}

            </BottomSheetView>
          </BottomSheet>

          <BottomSheet
            ref={previewSheetRef}
            snapPoints={["90%"]}
            index={-1}
            enablePanDownToClose
            enableContentPanningGesture={false}
            onChange={(index) => {
              if (index === -1) setFilePreview(null);
            }}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.sheetHandle}
            backdropComponent={(props) => (
              <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
              />
            )}
          >
            <BottomSheetView style={styles.previewSheetBody}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>
                  {filePreview?.item?.attachments?.[0]?.name || t("chat.preview")}
                </Text>
                <TouchableOpacity style={styles.previewCloseBtn} onPress={closeFilePreview}>
                  <Ionicons name="close" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                </TouchableOpacity>
              </View>

              {filePreview && previewUrl ? (
                <>
                  <WebView
                    source={{
                      uri: previewUrl,
                      headers: {
                        "Accept-Language": "en-US,en;q=0.9",
                      },
                    }}
                    style={[styles.previewWeb, previewLoading && { opacity: 0 }]}
                    originWhitelist={["*"]}
                    javaScriptEnabled
                    domStorageEnabled
                    pinchGestureEnabled
                    setBuiltInZoomControls
                    setDisplayZoomControls={true}
                    scalesPageToFit
                    allowsBackForwardNavigationGestures={false}
                    setSupportMultipleWindows={false}
                    mixedContentMode="always"
                    userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    startInLoadingState
                    onLoadStart={() => {
                      console.log("preview webview load start", previewUrl);
                      setPreviewLoading(true);
                    }}
                    onLoadEnd={() => {
                      console.log("preview webview load end");
                      setPreviewLoading(false);
                    }}
                    onError={(e) => {
                      setPreviewLoading(false);
                      setPreviewError(t("chat.failedLoadPreview"));
                      console.log("preview webview error", e?.nativeEvent);
                    }}
                    onHttpError={(e) => {
                      setPreviewLoading(false);
                      setPreviewError(t("chat.previewFailed", { status: e?.nativeEvent?.statusCode || "http" }));
                      console.log("preview webview http error", e?.nativeEvent);
                    }}
                  />
                  {/* {previewIsOffice && ( */}
                  <Text style={styles.previewZoomHint}>
                    {t("chat.pinchToZoom")}
                  </Text>
                  {/* )} */}

                  <TouchableOpacity
                    onPress={() => filePreview?.item && shareFile(filePreview.item)}
                    style={[styles.previewActionBtn, { flexDirection: 'row', justifyContent: 'center', marginTop: 20 }]}
                  >
                    <Text style={styles.previewActionText}>{t("chat.share")}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.previewEmpty}>
                  <Text style={styles.sheetHint}>
                    {t("chat.previewNotAvailable")}
                  </Text>
                  <View style={styles.previewActions}>
                    <TouchableOpacity
                      onPress={() => filePreview?.item && shareFile(filePreview.item)}
                      style={styles.previewActionBtn}
                    >
                      <Text style={styles.previewActionText}>{t("chat.share")}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {/* {previewLoading && (
                <View style={styles.previewLoading}>
                  <ActivityIndicator size="small" color="#10b981" />
                  <Text style={styles.sheetHint}>{t("chat.loadingPreview")}</Text>
                </View>
              )} */}
              {!!previewError && (
                <View style={styles.previewError}>
                  <Text style={styles.sheetHint}>{previewError}</Text>
                  <TouchableOpacity
                    onPress={() => filePreview?.item && shareFile(filePreview.item)}
                    style={styles.previewActionBtn}
                  >
                    <Text style={styles.previewActionText}>{t("chat.share")}</Text>
                  </TouchableOpacity>
                </View>
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
    threadTitleBand: {
      // backgroundColor: colorScheme === "dark" ? "#2c3854" : "#e4e4e4",
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === "dark" ? "#1f2937" : "#ddd",
      paddingHorizontal: 10,
      paddingVertical: 8,
      // borderBottomLeftRadius: Platform.OS === "ios" ? 60 : 30,
      // borderBottomRightRadius: Platform.OS === "ios" ? 60 : 30,
    },
    threadTitleBandText: {
      // alignSelf: "flex-start",
      // maxWidth: "100%",
      // borderRadius: 999,
      paddingHorizontal: 12,
      // paddingVertical: 7,
      // backgroundColor: "#10b981",
      color: "#fff",
      fontFamily: "Manrope_600SemiBold",
      fontSize: 14,
      // borderWidth:1,
      textAlign:'center'
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
      gap: 6,
    },
    attachMenu: {
      marginHorizontal: 10,
      marginBottom: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#fff",
      flexDirection: "row",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#2c3854" : "#e5e7eb",
    },
    attachItem: {
      alignItems: "center",
      gap: 6,
      width: 70,
    },
    attachLabel: {
      fontSize: 12,
      color: colorScheme === "dark" ? "#e5e7eb" : "#111827",
      fontFamily: "Manrope_600SemiBold",
    },
    attachBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colorScheme === "dark" ? "#111827" : "#fff",
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
    micBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#0f172a",
      justifyContent: "center",
      alignItems: "center",
    },
    micBtnRecording: {
      backgroundColor: "#ef4444",
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 10,
      flex: 1
    },
    statusText: {
      fontSize: 12,
      color: colorScheme === "dark" ? "#e5e7eb" : "#374151",
      fontFamily: "Manrope_500Medium",
    },
    statusTextCancel: {
      color: "#ef4444",
    },
    progressBar: {
      height: 5,
      marginHorizontal: 10,
      borderRadius: 999,
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#e5e7eb",
      overflow: "hidden",
      flex: 1
    },
    progressFill: {
      height: "100%",
      backgroundColor: "#10b981",
      borderRadius: 999,
    },
    recordDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#ef4444",
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
      flexDirection: 'row'
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
    frozenNotice: {
      marginHorizontal: 10,
      marginBottom: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#fff",
      flexDirection: "row",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#2c3854" : "#e5e7eb",
    },
    frozenNoticeText: {
      fontSize: 12,
      color: colorScheme === "dark" ? "#e5e7eb" : "#111827",
      fontFamily: "Manrope_600SemiBold",
      textAlign:'center',
      flex:1
    },
    inputDisabled: {
      opacity: 0.45,
    },
    dateSeparator: {
      alignItems: "center",
      marginVertical: 8,
    },
    dateSeparatorText: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#e5e7eb",
      color: colorScheme === "dark" ? "#d1d5db" : "#4b5563",
      fontSize: 12,
      fontFamily: "Manrope_600SemiBold",
    },
    systemMessageText: {
      color: colorScheme === "dark" ? "#d1d5db" : "#4b5563",
      fontSize: 12,
      lineHeight: 16,
      textAlign: "center",
      fontFamily: "Manrope_600SemiBold",
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
    sheetOptionDisabled: {
      opacity: 0.55,
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
    messageText: {
      color: colorScheme === "dark" ? "#fff" : "#000",
      fontSize: 16,
    },
    messageTextMe: {
      color: "#fff",
    },
    messageImage: {
      width: 220,
      height: 160,
      borderRadius: 12,
      marginBottom: 6,
      backgroundColor: colorScheme === "dark" ? "#111827" : "#e5e7eb",
    },
    previewOverlay: {
      flex: 1,
      backgroundColor: "#000",
      alignItems: "center",
      justifyContent: "center",
    },
    previewBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#000",
    },
    previewImage: {
      width: "100%",
      height: "100%",
    },
    previewClose: {
      position: "absolute",
      right: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(0,0,0,0.4)",
      alignItems: "center",
      justifyContent: "center",
    },
    audioRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    audioBubble: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    audioPlayCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
    },
    audioPlayCircleMe: {
      backgroundColor: "#e5e7eb",
    },
    audioWaveWrapper: {
      // flex: 1,
      justifyContent: "center",
    },
    audioWaveTrack: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 2,
      borderRadius: 999,
      backgroundColor: "#9ca3af",
      opacity: 0.5,
    },
    audioWaveProgress: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: "#10b981",
    },
    audioWaveBars: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingVertical: 4,
    },
    audioWaveBar: {
      width: 3,
      borderRadius: 2,
      backgroundColor: "#111827",
    },
    audioWaveBarMe: {
      backgroundColor: "#fff",
    },
    audioDuration: {
      fontSize: 12,
      color: colorScheme === "dark" ? "#e5e7eb" : "#111827",
      fontFamily: "Manrope_600SemiBold",
    },
    audioDurationMe: {
      color: "#fff",
    },
    audioText: {
      fontSize: 15,
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_600SemiBold",
    },
    fileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    fileName: {
      fontSize: 14,
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_600SemiBold",
    },
    fileMeta: {
      fontSize: 11,
      color: colorScheme === "dark" ? "#cbd5e1" : "#6b7280",
      fontFamily: "Manrope_500Medium",
      marginTop: 2,
    },
    fileMetaMe: {
      color: "#ffffffaa",
    },
    fileAction: {
      marginTop: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    fileActionRow: {
      marginTop: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    fileActionText: {
      fontSize: 12,
      color: "#10b981",
      fontFamily: "Manrope_700Bold",
    },
    fileActionTextMe: {
      color: "#a7f3d0",
    },
    fileProgressText: {
      fontSize: 12,
      color: colorScheme === "dark" ? "#e5e7eb" : "#374151",
      fontFamily: "Manrope_500Medium",
    },
    fileProgressTextMe: {
      color: "#ffffffaa",
    },
    previewSheetBody: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: insets.bottom + 10,
    },
    previewHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === "dark" ? "#1f2937" : "#e5e7eb",
      marginBottom: 10,
    },
    previewTitle: {
      flex: 1,
      marginRight: 12,
      fontSize: 15,
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_700Bold",
    },
    previewCloseBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#374151" : "#d1d5db",
      alignItems: "center",
      justifyContent: "center",
    },
    previewWeb: {
      flex: 1,
      height: 500,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colorScheme === "dark" ? "#111827" : "#fff",
    },
    previewEmpty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    previewActions: {
      flexDirection: "row",
      gap: 12,
    },
    previewActionBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: "#10b981",
    },
    previewActionText: {
      color: "#fff",
      fontFamily: "Manrope_700Bold",
      fontSize: 14,
    },
    previewZoomHint: {
      marginTop: 8,
      fontSize: 12,
      color: colorScheme === "dark" ? "#9ca3af" : "#6b7280",
      fontFamily: "Manrope_400Regular",
      textAlign: "center",
    },
    previewLoading: {
      // position: "absolute",
      // left: 0,
      // right: 0,
      // bottom: 20,
      alignItems: "center",
      gap: 8,
      flexDirection: "row",
      justifyContent: "center",
    },
    previewError: {
      position: "absolute",
      left: 16,
      right: 16,
      bottom: 20,
      alignItems: "center",
      gap: 8,
    },
  });
