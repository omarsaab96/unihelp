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
  PanResponder
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
import * as FileSystemLegacy from "expo-file-system/legacy";
import { localstorage } from '../utils/localStorage';
import { setActiveChat } from "../src/state/activeChat";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput, BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { fetchWithAuth, fetchWithoutAuth, getCurrentUser } from "../src/api";
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

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
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordingCancel, setRecordingCancel] = useState(false);
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

  const toAbsoluteUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("file:")) return url;
    return `${CHAT_SERVER_URL}${url}`;
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
    if (!mime) return name || "File";
    if (mime === "application/pdf") return "PDF Document";
    if (mime === "application/msword") return "Word Document";
    if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return "Word Document";
    }
    if (mime === "application/vnd.ms-excel") return "Spreadsheet";
    if (mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      return "Spreadsheet";
    }
    return name || "File";
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
    const attachment = item?.attachments?.[0];
    if (!attachment?.url) return;

    const url = toAbsoluteUrl(attachment.url);
    const key = item._id;

    setDownloadStatus((prev) => ({
      ...prev,
      [key]: { status: "downloading", progress: 0 },
    }));

    try {
      const filename = makeSafeFilename(attachment.name) || `file-${Date.now()}`;
      const localUri = `${FileSystemLegacy.documentDirectory}${filename}`;

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

      await downloadResumable.downloadAsync();

      setDownloadStatus((prev) => ({
        ...prev,
        [key]: { status: "done", progress: 1, uri: localUri },
      }));
      downloadCacheRef.current[key] = { uri: localUri };
      console.log("File downloaded to:", localUri);
      await saveDownloadCache();
    } catch (_) {
      setDownloadStatus((prev) => ({
        ...prev,
        [key]: { status: "idle", progress: 0 },
      }));
      Alert.alert("Download failed", "Could not download this file.");
    }
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
            reject(new Error(data?.message || "Upload failed"));
          }
        } catch (e) {
          console.log("uploadFile: parse error");
          reject(new Error("Upload failed"));
        }
      };

      xhr.onerror = () => {
        console.log("uploadFile: network error");
        reject(new Error("Upload failed"));
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
      Alert.alert("Upload failed", e?.message || "Could not upload image.");
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
      Alert.alert("Permission required", "Please allow photo library access.");
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
      Alert.alert("Permission required", "Please allow camera access.");
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
    addPendingAttachmentMessage(tempId, "file", {
      url: asset.uri,
      name: asset.name || `file-${Date.now()}`,
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
      Alert.alert("Upload failed", e?.message || "Could not upload document.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      setAttachmentMenuOpen(false);
    }
  };

  const startRecording = async () => {
    if (isRecording || uploading) return;
    try {
      console.log("startRecording: requested");
      recordingActiveRef.current = true;
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow microphone access.");
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
      Alert.alert("Recording failed", e?.message || "Could not start recording.");
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
      Alert.alert("Recording failed", e?.message || "Could not send voice note.");
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
        console.log("Chat init complete, chatId:", data.chatId);
        scheduleAttachmentFlush();

        const formatted = (data.messages || []).map((m: any) => ({
          _id: m._id,
          text: m.text,
          createdAt: new Date(m.createdAt),
          user: { _id: m.senderId },
          type: m.type || "text",
          attachments: m.attachments || [],
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
      flushAttachmentQueue();
      scheduleAttachmentFlush();
    });

    socket.current.on("connect_error", (err) => {
      console.log("❌ SOCKET ERROR", err.message);
    });

    socket.current.on("newMessage", (msg: any) => {
      console.log("newMessage", msg?.type, msg?.tempId, msg?._id);
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
            type: msg.type || "text",
            attachments: msg.attachments || [],
          },
          ...prev,
        ];
      });
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


  // -------------------------------------------------------
  // RENDER BUBBLE
  // -------------------------------------------------------
  const renderMessageContent = (item: any, isMe: boolean) => {
    const type = item.type || "text";
    const attachment = item.attachments?.[0];

    if (type === "image" && attachment?.url) {
      const uri = toAbsoluteUrl(attachment.url);
      return (
        <View>
          <Image
            source={{ uri }}
            style={styles.messageImage}
            resizeMode="cover"
          />
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
        <TouchableOpacity
          style={[styles.fileRow, { alignItems: "flex-start" }]}
          onPress={() => { }}
        >
          <Ionicons
            name={isDownloaded ? "document-text-outline" : "download-outline"}
            size={18}
            color={isMe ? "#fff" : "#111827"}
          />
          <View style={{ paddingRight: 10 }}>
            <Text style={[styles.fileName, isMe && styles.messageTextMe]} numberOfLines={1}>
              {attachment.name || "Document"}
            </Text>
            <Text style={[styles.fileMeta, isMe && styles.fileMetaMe]}>
              {getFileLabel(attachment.mime, attachment.name)}
              {attachment.size ? ` - ${formatBytes(attachment.size)}` : ""}
            </Text>
            {!isDownloaded && (
              <TouchableOpacity
                onPress={() => handleDownloadFile(item)}
                disabled={download.status === "downloading"}
                style={styles.fileAction}
              >
                <Text style={[styles.fileActionText, isMe && styles.fileActionTextMe]}>
                  {download.status === "downloading" ? "Downloading..." : "Download"}
                </Text>
                {download.status === "downloading" && (
                  <Text style={[styles.fileProgressText, isMe && styles.fileProgressTextMe]}>
                    {Math.round(download.progress * 100)}%
                  </Text>
                )}
              </TouchableOpacity>
            )}
            {isDownloaded && (
              <TouchableOpacity onPress={() => { }} style={styles.fileAction}>
                <Text style={[styles.fileActionText, isMe && styles.fileActionTextMe]}>
                  Open
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
        {item.text}
      </Text>
    );
  };

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
            opacity: item.pending ? 0.6 : 1,
          }}
        >
          {renderMessageContent(item, isMe)}

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
            {attachmentMenuOpen && (
              <View style={styles.attachMenu}>
                <TouchableOpacity style={styles.attachItem} onPress={takePhoto}>
                  <Ionicons name="camera" size={20} color="#10b981" />
                  <Text style={styles.attachLabel}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachItem} onPress={pickImageFromLibrary}>
                  <Ionicons name="image" size={20} color="#10b981" />
                  <Text style={styles.attachLabel}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachItem} onPress={pickDocument}>
                  <Ionicons name="document" size={20} color="#10b981" />
                  <Text style={styles.attachLabel}>Document</Text>
                </TouchableOpacity>
                {/* <TouchableOpacity style={styles.attachItem} onPress={() => { isRecording ? stopRecordingAndSend() : startRecording(); }}>
                  <Ionicons name={isRecording ? "stop-circle" : "mic"} size={20} color={isRecording ? "#ef4444" : "#10b981"} />
                  <Text style={[styles.attachLabel, isRecording && { color: "#ef4444" }]}>
                    {isRecording ? "Stop" : "Voice"}
                  </Text>
                </TouchableOpacity> */}
              </View>
            )}

            <View style={styles.inputBar}>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setAttachmentMenuOpen((prev) => !prev);
                }}
                style={styles.attachBtn}
              >
                <FontAwesome6 name="add" size={20} color="#fff" />
              </TouchableOpacity>

              {(uploading || isRecording) && (
                <View style={[styles.statusRow]}>
                  {uploading &&
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <ActivityIndicator size="small" color="#10b981" />
                      <Text style={styles.statusText}>Uploading...</Text>
                    </View>
                  }
                  {!uploading && isRecording && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View style={styles.recordDot} />
                      <Text style={[styles.statusText, recordingCancel && styles.statusTextCancel]}>
                        Recording {recordSeconds}s • {recordingCancel ? "Release to cancel" : "Slide to cancel"}
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
                placeholder="Type a message..."
                placeholderTextColor={colorScheme === "dark" ? "#aaa" : "#666"}
                value={input}
                onChangeText={setInput}
              />}

              {input.trim() !== '' && !isRecording && <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>}

              {input.trim() === '' && <View
                style={[styles.micBtn, isRecording && styles.micBtnRecording]}
                {...panResponder.panHandlers}
              >
                <Ionicons name="mic" size={20} color="#fff" />
              </View>}
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
            <BottomSheetView style={[styles.sheetBody, { paddingBottom: keyboardOpen ? 10 : insets.bottom+10 }]}>
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
      flex: 1,
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
  });
