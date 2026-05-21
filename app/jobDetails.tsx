import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  useColorScheme,
  Dimensions,
  Alert,
  Keyboard,
  useWindowDimensions
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MD3LightTheme as DefaultTheme, Provider as PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Entypo from "@expo/vector-icons/Entypo";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { localstorage } from '../utils/localStorage';
import { fetchWithAuth, fetchWithoutAuth, getCurrentUser } from "../src/api";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AntDesign from '@expo/vector-icons/AntDesign';
import BottomSheet, { BottomSheetTextInput, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from "expo-constants";
import { useTranslation } from "../src/i18n";

const { width } = Dimensions.get("window");

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#10b981",
  },
};

export default function JobDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  let colorScheme = useColorScheme();
  const styles = styling(colorScheme, insets);
  const { height: windowHeight } = useWindowDimensions();
  const CHAT_SERVER_URL = Constants.expoConfig?.extra?.CHAT_SERVER_URL;
  const { t, language } = useTranslation();

  const [offer, setOffer] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [gettingRating, setGettingRating] = useState(false)
  const [closing, setClosing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [requestCloseSending, setRequestCloseSending] = useState(false)
  const [cooldownTick, setCooldownTick] = useState(0)
  const [reportThread, setReportThread] = useState<any>(null)
  const [reportInput, setReportInput] = useState("")
  const [reportLoading, setReportLoading] = useState(false)
  const [reportSending, setReportSending] = useState(false)
  const [reportSheetMode, setReportSheetMode] = useState<"menu" | "report">("menu")
  const closeConfirmationRef = useRef<BottomSheet>(null);
  const submitSurveyRef = useRef<BottomSheet>(null);
  const resolutionFeedbackRef = useRef<BottomSheet>(null);
  const reportRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["70%", "95%"], []);
  const snapPointsCloseConfirmation = useMemo(() => ["42%"], []);
  const reportSnapPoints = useMemo(() => ["70%", "95%"], []);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const [gotNeededHelp, setGotNeededHelp] = useState(true);
  const [workDelivered, setWorkDelivered] = useState(true);
  const [bidderRating, setBidderRating] = useState<Number | null>(null);
  const [ownerRating, setOwnerRating] = useState<Number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [resolutionRating, setResolutionRating] = useState<Number | null>(null);
  const [resolutionFeedback, setResolutionFeedback] = useState("");

  const resolvedOfferId = useMemo(() => {
    const raw = params.offerId ?? params.data ?? null;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params.offerId, params.data]);

  const REQUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

  const objectId = (value: any) => {
    if (!value) return null;
    if (typeof value === "string") return value;
    return value._id || value.id || null;
  };

  const sameId = (a: any, b: any) => {
    const left = objectId(a);
    const right = objectId(b);
    return Boolean(left && right && left.toString() === right.toString());
  };

  const findJobForOffer = (jobs: any[] | undefined, offerId: any) => {
    return jobs?.find((item) => sameId(item?.offer, offerId)) || null;
  };

  const resolveJobForOffer = (currentUser: any, loadedOffer: any, offerId: any) => {
    const currentUserJob = findJobForOffer(currentUser?.helpjobs, offerId);
    if (currentUserJob) return currentUserJob;

    const isOwner = sameId(currentUser?._id, loadedOffer?.user?._id);
    const isAcceptedBidder = sameId(currentUser?._id, loadedOffer?.acceptedBid?.user?._id);
    const isAdmin = currentUser?.role === "admin" || currentUser?.role === "sudo";

    if (isOwner) {
      const ownerJob = findJobForOffer(loadedOffer?.user?.helpjobs, offerId);
      if (ownerJob) return ownerJob;
    }

    if (isAcceptedBidder) {
      const bidderJob = findJobForOffer(loadedOffer?.acceptedBid?.user?.helpjobs, offerId);
      if (bidderJob) return bidderJob;
    }

    if ((isOwner || isAcceptedBidder || isAdmin) && loadedOffer?.acceptedBid) {
      return {
        _id: loadedOffer._id,
        offer: loadedOffer._id,
        completedAt: loadedOffer.completedAt || null,
        systemApproved: loadedOffer.systemApproved || null,
        systemRejected: loadedOffer.systemRejected || null,
        rejectReason: loadedOffer.rejectReason || null,
      };
    }

    return null;
  };

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

  useFocusEffect(
    useCallback(() => {
      const getUserInfo = async () => {
        try {
          const data = await getCurrentUser();
          if (data.error) {
            console.error("Error", data.error);
          } else {
            await localstorage.set('user', JSON.stringify(data))
            // console.log("User= ", data)
            setUser(data)

            if (!resolvedOfferId) {
              console.log("No offerId");
              return;
            };

            try {
              const offerData = await fetchWithoutAuth(`/helpOffers/${resolvedOfferId}`);
              if (!offerData.ok) {
                setOffer(null);
                setJob(null);
                setLoading(false);
                return;
              }

              const offer = await offerData.json();
              // console.warn(offer)
              setOffer(offer);
              // console.log("✅ Offer loaded:", JSON.stringify(offer, null, 2));
              setLoading(false)
              const matchedJob = resolveJobForOffer(data, offer, resolvedOfferId);

              setJob(matchedJob);
              await loadReport(resolvedOfferId as string);
            } catch (err) {
              console.error("❌ Failed to load offer:", err);
            }
          }
        } catch (err) {
          console.error("Error", err.message);
        }
      }
      getUserInfo()
    }, [resolvedOfferId])
  );

  const refreshJob = async () => {
    setLoading(true)
    try {
      const data = await getCurrentUser();
      if (data.error) {
        console.error("Error", data.error);
      } else {
        await localstorage.set('user', JSON.stringify(data))
        // console.log("User= ", data)
        setUser(data)

        if (!resolvedOfferId) {
          console.log("No offerId");
          return;
        };

        try {
          const offerData = await fetchWithoutAuth(`/helpOffers/${resolvedOfferId}`);
          if (!offerData.ok) {
            setOffer(null);
            setJob(null);
            setLoading(false);
            return;
          }

          const offer = await offerData.json();
          // console.warn(offer)
          setOffer(offer);
          // console.log("✅ Offer loaded:", JSON.stringify(offer, null, 2));
          setLoading(false)
          const matchedJob = resolveJobForOffer(data, offer, resolvedOfferId);

          setJob(matchedJob);
          await loadReport(resolvedOfferId as string);
        } catch (err) {
          console.error("❌ Failed to load offer:", err);
        }
      }
    } catch (err) {
      console.error("Error", err.message);
    }
  }

  useEffect(() => {
    if (!offer?.closeRequestAt) return;
    const interval = setInterval(() => {
      setCooldownTick((tick) => tick + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, [offer?.closeRequestAt]);

  const formatDateTime = (date: any) => {
    if (!date) return "";
    const d = new Date(date); // ✅ handle strings or Date objects
    if (isNaN(d.getTime())) return "Invalid date";

    return d.toLocaleString(language === "tr" ? "tr-TR" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const formatDate = (date: any) => {
    if (!date) return "";
    const d = new Date(date); // ✅ handle strings or Date objects
    if (isNaN(d.getTime())) return "Invalid date";

    return d.toLocaleString(language === "tr" ? "tr-TR" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getCloseRequestRemainingMs = () => {
    if (!offer?.closeRequestAt) return 0;
    const last = new Date(offer.closeRequestAt).getTime();
    if (isNaN(last)) return 0;
    const remaining = REQUEST_COOLDOWN_MS - (Date.now() - last);
    return remaining > 0 ? remaining : 0;
  };

  const formatRemainingTime = (ms: number) => {
    const totalMinutes = Math.ceil(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const loadReport = async (offerId: string) => {
    try {
      setReportLoading(true);
      const res = await fetchWithAuth(`/helpOffers/${offerId}/report`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setReportThread(data?.data || null);
      }
    } catch (err) {
      console.error("Failed to load report", err);
    } finally {
      setReportLoading(false);
    }
  };

  const hanldeGoToProfile = (id: string) => {
    // console.log(id)
    router.push({
      pathname: "/user/[id]",
      params: { id: id, user: typeof u === "object" ? JSON.stringify(u) : undefined },
    });
  }

  const handleCloseJob = async (offerId: string) => {
    if (jobReported) {
      Alert.alert(t("jobDetails.jobReported"), t("jobDetails.jobFrozen"));
      return;
    }
    closeConfirmationRef.current?.expand();
  };

  const handleSubmitSurvey = async (offerId: string) => {
    submitSurveyRef.current?.snapToIndex(0);
  };

  const closeRequestRemainingMs = useMemo(() => {
    return getCloseRequestRemainingMs();
  }, [offer?.closeRequestAt, cooldownTick]);

  const closeRequestDisabled = requestCloseSending || closeRequestRemainingMs > 0;
  const hasJobReport = Boolean(reportThread);
  const jobReported = Boolean(reportThread && !reportThread.resolvedAt);
  const reportResolved = Boolean(reportThread?.resolvedAt);
  const isAdminUser = user?.role === "admin" || user?.role === "sudo";
  const resolutionFeedbackItems = reportThread?.resolutionFeedback || [];
  const ownerResolutionFeedback = resolutionFeedbackItems.find((item: any) => sameId(item.user, offer?.user?._id));
  const bidderResolutionFeedback = resolutionFeedbackItems.find((item: any) => sameId(item.user, offer?.acceptedBid?.user?._id));
  const currentUserResolutionFeedback = resolutionFeedbackItems.find((item: any) => sameId(item.user, user?._id));
  const reportResolutionFeedbackComplete = Boolean(ownerResolutionFeedback && bidderResolutionFeedback);
  const closeRequestLabel = closeRequestRemainingMs > 0
    ? t("jobDetails.requestSentNext", { time: formatRemainingTime(closeRequestRemainingMs) })
    : requestCloseSending
      ? t("jobDetails.sendingRequest")
      : t("jobDetails.requestCloseJob");

  const handleRequestCloseJob = async () => {
    if (!offer?._id) return;
    if (jobReported) {
      Alert.alert(t("jobDetails.jobReported"), t("jobDetails.jobFrozen"));
      return;
    }

    try {
      setRequestCloseSending(true);

      const res = await fetchWithAuth(`/helpOffers/close-request/${offer?._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 && data?.retryAfterMs) {
          Alert.alert(
            t("jobDetails.pleaseWait"),
            t("jobDetails.requestAgainIn", { time: formatRemainingTime(data.retryAfterMs) })
          );
        } else {
          Alert.alert(t("common.error"), data?.message || t("jobDetails.couldNotRequestClosure"));
        }
        return;
      }

      setOffer((prev: any) => ({
        ...prev,
        closeRequestAt: data.requestedAt || new Date().toISOString(),
      }));

      Alert.alert(t("jobDetails.requestSent"), t("jobDetails.ownerNotified"));
    } catch (err: any) {
      Alert.alert(t("common.error"), err?.message || t("jobDetails.couldNotRequestClosure"));
    } finally {
      setRequestCloseSending(false);
    }
  };

  const handleConfirmCloseJob = async (offerId: string) => {
    handleCloseModalPress();
    try {
      setCompleting(true);

      if (jobReported) {
        Alert.alert(t("jobDetails.jobReported"), t("jobDetails.jobFrozen"));
        return;
      }

      const res = await fetchWithAuth(`/helpOffers/closeJob/${offerId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ Failed to close job:", errorData);
        Alert.alert(t("common.error"), errorData.message || t("jobDetails.couldNotCloseJob"));
        return;
      }

      const data = await res.json();
      console.log("✅ Job closed:", data);

      // Optionally refresh the screen or update local state
      setJob((prev: any) => ({
        ...prev,
        completedAt: new Date().toISOString(),
        status: "completed",
      }));
    } catch (err: any) {
      console.error("❌ Error closing job:", err);
      Alert.alert(t("common.error"), t("jobDetails.closeJobFailed"));
    } finally {
      setCompleting(false);
    }
  };

  const handleConfirmSubmitSurvey = async () => {
    handleCloseModalPress();
    try {
      setSubmitting(true);
      let survey = null;

      if (offer.user?._id == user?._id) {
        survey = JSON.stringify({
          gotNeededHelp,
          workDelivered,
          bidderRating,
          feedback
        });
      }
      if (offer.acceptedBid.user?._id == user?._id) {
        survey = JSON.stringify({
          gotNeededHelp,
          workDelivered,
          ownerRating,
          feedback
        });
      }

      const res = await fetchWithAuth(`/helpOffers/survey/${offer?._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: survey
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ Failed to Submit survey:", errorData);
        Alert.alert(t("common.error"), errorData.message || t("jobDetails.couldNotSubmitSurvey"));
        return;
      }

      const data = await res.json();
      console.log("✅ Survey submitted:", data);

      if (user?._id === offer.user?._id) {
        setOffer((prev: any) => {
          const updatedHelpjobs = prev.user.helpjobs.map((h: any) =>
            h.offer === offer?._id
              ? { ...h, survey: data.surveyDate }
              : h
          );

          return {
            ...prev,
            user: {
              ...prev.user,
              helpjobs: updatedHelpjobs,
            },
          };
        });
      }


      if (user?._id === offer.acceptedBid.user?._id) {
        setOffer((prev: any) => {
          // clone helpjobs array from the accepted user
          const updatedHelpjobs = prev.acceptedBid.user.helpjobs.map((h: any) =>
            h.offer === offer?._id
              ? { ...h, survey: data.surveyDate }
              : h
          );

          return {
            ...prev,
            acceptedBid: {
              ...prev.acceptedBid,
              user: {
                ...prev.acceptedBid.user,
                helpjobs: updatedHelpjobs, // ✅ updated helpjobs array
              },
            },
          };
        });
      }
    } catch (err: any) {
      console.error("❌ Error closing job:", err);
      Alert.alert(t("common.error"), t("jobDetails.submitSurveyFailed"));
    } finally {
      // setSubmitting(false);
    }
  };

  const handleSubmitResolutionFeedback = () => {
    if (currentUserResolutionFeedback || isAdminUser) return;
    setResolutionRating(null);
    setResolutionFeedback("");
    resolutionFeedbackRef.current?.snapToIndex(0);
  };

  const handleConfirmSubmitResolutionFeedback = async () => {
    if (!offer?._id || !resolutionRating) {
      Alert.alert(t("common.error"), t("jobDetails.selectResolutionRating"));
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetchWithAuth(`/helpOffers/${offer._id}/report/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: resolutionRating,
          feedback: resolutionFeedback.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        Alert.alert(t("common.error"), data?.message || t("jobDetails.couldNotSubmitResolutionFeedback"));
        return;
      }

      setReportThread((prev: any) => ({
        ...prev,
        resolutionFeedback: data?.data || prev?.resolutionFeedback || [],
      }));
      if (data?.completed) {
        setJob((prev: any) => prev ? { ...prev, status: "completed" } : prev);
      }
      setResolutionRating(null);
      setResolutionFeedback("");
      handleCloseModalPress();
    } catch (err: any) {
      Alert.alert(t("common.error"), err?.message || t("jobDetails.couldNotSubmitResolutionFeedback"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModalPress = () => {
    closeConfirmationRef.current?.close();
    submitSurveyRef.current?.close();
    resolutionFeedbackRef.current?.close();
    reportRef.current?.close();
    Keyboard.dismiss()
  };

  const getChatParticipants = () => {
    if (!offer?.acceptedBid?.user?._id || !offer?.user?._id || !user?._id) {
      return null;
    }

    const receiverId =
      user._id === offer.user._id
        ? offer.acceptedBid.user._id
        : offer.user._id;

    return {
      senderId: user._id,
      receiverId,
    };
  };

  const createReportSystemMessage = async () => {
    const participants = getChatParticipants();
    if (!participants || !offer?._id || !CHAT_SERVER_URL) return;

    const actorName = `${user?.firstname || ""} ${user?.lastname || ""}`.trim() || t("jobDetails.user");
    const text = t("chat.systemJobReported", { name: actorName });

    const initRes = await fetch(`${CHAT_SERVER_URL}/api/chats/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderId: participants.senderId,
        receiverId: participants.receiverId,
        helpOfferId: offer._id,
        createIfMissing: false,
      }),
    });

    const initData = await initRes.json();
    if (!initRes.ok) {
      throw new Error(initData?.error || t("jobDetails.couldNotInitializeChat"));
    }
    if (!initData?.chatId) return;

    const systemRes = await fetch(`${CHAT_SERVER_URL}/api/chats/${initData.chatId}/system`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderId: participants.senderId,
        receiverId: participants.receiverId,
        text,
        metadata: {
          eventKey: "jobReported",
          actorName,
        },
      }),
    });

    if (!systemRes.ok) {
      const data = await systemRes.json();
      throw new Error(data?.error || t("jobDetails.couldNotCreateAnnouncement"));
    }
  };

  const sendReportMessage = async () => {
    if (!offer?._id || !reportInput.trim()) return;
    if (isAdminUser) return;
    if (reportThread?.hasReported) {
      Alert.alert(t("jobDetails.alreadyReported"), t("jobDetails.alreadyReportedMessage"));
      return;
    }

    try {
      setReportSending(true);
      const res = await fetchWithAuth(`/helpOffers/${offer._id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reportInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        Alert.alert(t("common.error"), data?.message || t("jobDetails.couldNotSendReport"));
        return;
      }

      setReportThread(data?.data || null);
      try {
        await createReportSystemMessage();
      } catch (err) {
        console.error("Failed to create report system message:", err);
      }
      setReportInput("");
      Keyboard.dismiss();
      handleCloseModalPress();
    } catch (err: any) {
      Alert.alert(t("common.error"), err?.message || t("jobDetails.couldNotSendReport"));
    } finally {
      setReportSending(false);
    }
  };

  const getReporters = () => {
    const reports = reportThread?.reports || [];
    const legacyMessages = reportThread?.messages || [];
    const reporterMap = new Map<string, string>();

    [...reports, ...legacyMessages].forEach((item: any) => {
      const person = item.reporter || item.sender;
      const id = person?._id || person;
      if (!id) return;

      const name = typeof person === "object"
        ? `${person.firstname || ""} ${person.lastname || ""}`.trim()
        : "";

      reporterMap.set(String(id), name || t("jobDetails.unknownUser"));
    });

    return Array.from(reporterMap.values());
  };

  const reportDescription = () => {
    const reporters = getReporters();
    if (reporters.length === 0) return [t("jobDetails.thisJobReported")];
    return reporters.map((reporter) => t("jobDetails.reportedBy", { name: reporter }));
  };

  const getPersonName = (person: any, fallback: string) => {
    if (!person || typeof person !== "object") return fallback;
    return `${person.firstname || ""} ${person.lastname || ""}`.trim() || fallback;
  };

  const formatMoney = (amount: any) => `${Number(amount || 0)} TRY`;

  const settlementDescription = () => {
    const settlement = reportThread?.settlement;
    if (!settlement?.mode) return [];

    const payerName = getPersonName(settlement.payer, t("jobDetails.payer"));
    const beneficiaryName = getPersonName(settlement.beneficiary, t("jobDetails.receiver"));
    const total = formatMoney(settlement.totalAmount);
    const paid = formatMoney(settlement.beneficiaryAmount);
    const returned = formatMoney(settlement.payerAmount);

    if (settlement.mode === "noPayment") {
      return [
        t("jobDetails.reportResolvedNoPayment"),
        t("jobDetails.reportResolvedReturned", { name: payerName, amount: returned }),
      ];
    }

    if (settlement.mode === "split") {
      return [
        t("jobDetails.reportResolvedSplit", { total }),
        t("jobDetails.reportResolvedPaid", { name: beneficiaryName, amount: paid }),
        t("jobDetails.reportResolvedReturned", { name: payerName, amount: returned }),
      ];
    }

    return [
      t("jobDetails.reportResolvedNormal"),
      t("jobDetails.reportResolvedPaid", { name: beneficiaryName, amount: paid }),
      t("jobDetails.reportResolvedReturned", { name: payerName, amount: returned }),
    ];
  };

  const getReportTime = () => {
    const reportTimes = [
      ...(reportThread?.reports || []).map((item: any) => item.createdAt),
      ...(reportThread?.messages || []).map((item: any) => item.createdAt),
    ].filter(Boolean);

    if (reportTimes.length === 0) return reportThread?.createdAt || null;

    return reportTimes.reduce((latest: string, current: string) => {
      return new Date(current) > new Date(latest) ? current : latest;
    }, reportTimes[0]);
  };

  const openReportSheet = () => {
    if (offer?._id) {
      loadReport(offer._id);
    }
    setReportSheetMode("menu");
    reportRef.current?.expand();
  };

  const openReportThread = () => {
    if (isAdminUser || reportThread?.hasReported) return;
    if (offer?._id) {
      loadReport(offer._id);
    }
    setReportSheetMode("report");
  };

  const getLatest = (date1?: string | null, date2?: string | null): string | null => {
    if (!date1 && !date2) return null;
    if (!date1) return date2!;
    if (!date2) return date1!;

    const d1 = new Date(date1);
    const d2 = new Date(date2);

    return d1 > d2 ? date1 : date2;
  };

  const goToChat = () => {
    router.push({
      pathname: "/chat",
      params: user?._id == offer.user?._id ? {
        userId: offer.user?._id,
        receiverId: offer.acceptedBid.user?._id,
        name: offer.acceptedBid.user.firstname + " " + offer.acceptedBid.user.lastname,
        avatar: offer.acceptedBid.user.photo,
        helpOfferId: offer._id,
        negotiationOfferId: offer._id,
      } : {
        userId: user?._id,
        receiverId: offer.user?._id,
        name: offer.user.firstname + " " + offer.user.lastname,
        avatar: offer.user.photo,
        helpOfferId: offer._id,
        negotiationOfferId: offer._id,
      }
    })
  }

  if (loading)
    return (
      <View style={[styles.appContainer, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="small" color="#10b981" />
      </View>
    );

  if (!offer || !job) {
    return (
      <View style={[styles.appContainer, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#888" }}>{t("jobDetails.notFound")}</Text>
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <GestureHandlerRootView style={styles.appContainer}>
        <StatusBar style="light" />
        <View style={styles.statusBar} />

        {/* HEADER */}
        <View style={[styles.header, styles.greenHeader]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/"); // or your inbox / home screen
            }
          }}>
            <View style={[styles.row, styles.between, { marginBottom: 30 }]}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
              <Text style={styles.pageTitle}>{offer?.title || t("jobDetails.offerDetails")}</Text>
              <View style={[styles.row, { gap: 10 }]}>
                <TouchableOpacity style={styles.tinyCTA} onPress={() => { refreshJob() }}>
                  <Ionicons name="refresh" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={openReportSheet} style={styles.tinyCTA} accessibilityLabel={t("jobDetails.openActions")}>
                  <View style={styles.menuDots}>
                    <View style={styles.menuDot} />
                    <View style={styles.menuDot} />
                    <View style={styles.menuDot} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>

            {/* <View style={styles.tabs}>
              <TouchableOpacity onPress={() => { setActiveTab('info') }} style={[styles.tab, activeTab == 'info' && styles.activeTab]}>
                <Text style={styles.tabText}>Info</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setActiveTab('bids') }} style={[styles.tab, activeTab == 'bids' && styles.activeTab]}>
                <Text style={styles.tabText}>Bids</Text>
              </TouchableOpacity>
            </View> */}
          </View>

        </View>

        {offer && job && <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.container}>
            <View style={styles.card}>

              {jobReported && <View style={styles.frozenNotice}>
                <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 }]}>
                  <Ionicons
                    name={"flag-outline"}
                    size={16}
                    color={colorScheme === "dark" ? "#fff" : "#000"}
                  />
                  <Text style={[styles.historyItemName, { gap: 10 }]}>{t("jobDetails.jobReported")}</Text>
                </View>

                <Text style={styles.frozenNoticeText}>
                  {t("jobDetails.jobFrozen")}
                </Text>
              </View>}

              <Text style={styles.sectionTitle}>{t("jobDetails.description")}</Text>
              <Text style={styles.offerDesc}>
                {typeof offer?.description === "string"
                  ? offer.description
                  : t("jobDetails.noDescription")}
              </Text>

              <Text style={styles.sectionTitle}>{t("jobDetails.details")}</Text>

              <View style={styles.metaData}>
                <Text style={styles.label}>{t("jobDetails.status")}</Text>
                <Text style={[styles.metaText, { textTransform: 'capitalize' }]}>
                  <Text style={[styles.offerDesc, { marginBottom: 0, fontFamily: 'Manrope_600SemiBold' }, job?.completedAt == null ? styles.open : styles.completed, offer?.completedAt != null && styles.closed]}>
                    {reportResolved && !reportResolutionFeedbackComplete ? t("jobDetails.pending") : job?.completedAt == null ? t("jobDetails.ongoing") : t("jobDetails.completed")}
                  </Text>
                </Text>
              </View>

              <View style={styles.metaData}>
                <Text style={styles.label}>{t("jobDetails.type")}</Text>
                <Text style={[styles.metaText, { textTransform: 'capitalize' }]}>
                  {typeof offer?.helpType === "string" ? offer.helpType : t("jobDetails.na")}
                </Text>
              </View>

              <View style={styles.metaData}>
                <Text style={styles.label}>{t("jobDetails.subject")}</Text>
                <Text style={[styles.metaText, { textTransform: 'capitalize' }]}>
                  {typeof offer?.subject === "string" ? offer.subject : t("jobDetails.na")}
                </Text>
              </View>

              <View style={styles.metaData}>
                <Text style={styles.label}>{t("jobDetails.agreementPrice")}</Text>
                <Text style={styles.metaText}>₺{offer.acceptedBid.amount}</Text>
              </View>

              {/* <View style={styles.metaData}>
                  <Text style={styles.label}>Agreement Duration</Text>
                  <Text style={styles.metaText}>{offer.acceptedBid.duration} hour{offer.acceptedBid.duration == 1 ? '' : 's'}</Text>
                </View> */}
              <View style={styles.metaData}>
                <Text style={styles.label}>{t("jobDetails.agreementDeadline")}</Text>
                <Text style={styles.metaText}>{formatDate(offer.expectedSubmissionDate)}</Text>
              </View>

              <View style={styles.metaData}>
                <Text style={styles.label}>{t("jobDetails.started")}</Text>
                <Text style={styles.metaText}>{formatDateTime(job?.startedAt)}</Text>
              </View>
              <View style={styles.metaData}>
                <Text style={styles.label}>{t("jobDetails.finished")}</Text>
                <Text style={styles.metaText}>{job?.completedAt ? formatDateTime(job?.completedAt) : '-'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.container}>
            <Text style={styles.sectionTitle}>{t("jobDetails.postedBy")}</Text>

            <View style={[styles.card, styles.creatorCard]}>
              <TouchableOpacity
                style={styles.chooseBtn}
                onPress={() => { hanldeGoToProfile(offer.user?._id) }}
              >
                <View style={[styles.row, { alignItems: 'center', gap: 10 }]}>
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: offer.user.photo }} style={styles.avatar} />
                    {/* {uploadingPicture && <ActivityIndicator size="small" color={'#fff'} style={{position:'absolute',top:18,left:18}} />} */}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{offer.user.firstname} {offer.user.lastname}</Text>
                    <View style={[styles.row, { gap: 5 }]}>
                      <AntDesign
                        name="star"
                        size={12}
                        color={colorScheme === "dark" ? "#fbbf24" : "#facc15"}
                      />

                      <Text style={[styles.metaText, { textAlign: 'left' }]}>
                        {offer.user.reviews == 0 ? t("profile.noRatingsYet") : offer.user.rating?.toFixed(1) || 0}
                        ({offer.user.reviews} {offer.user.reviews == 1 ? t("profile.review") : t("profile.reviews")})
                      </Text>
                    </View>
                  </View>

                  {!jobReported && user?._id != offer.user?._id && <View>
                    <TouchableOpacity style={styles.chatCTA} onPress={() => { goToChat() }}>
                      <FontAwesome name="send" size={18} color='#fff' />
                    </TouchableOpacity>
                  </View>}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.container}>
            <Text style={styles.sectionTitle}>{t("jobDetails.acceptedBidder")}</Text>
            <View style={[styles.card, styles.creatorCard]}>
              <TouchableOpacity
                style={styles.chooseBtn}
                onPress={() => { hanldeGoToProfile(offer.acceptedBid.user?._id) }}
              >
                <View style={[styles.row, { alignItems: 'center', gap: 10 }]}>
                  <View style={{ position: 'relative' }}>
                    <Image source={
                      offer.acceptedBid.user?.photo
                        ? { uri: offer.acceptedBid.user.photo }
                        : require("../assets/images/avatar.jpg")
                    } style={styles.avatar} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{offer.acceptedBid.user?.firstname || t("jobDetails.anonymous")} {offer.acceptedBid.user?.lastname || t("jobDetails.user")}</Text>
                    <View style={[styles.row, { gap: 5 }]}>
                      <AntDesign
                        name="star"
                        size={12}
                        color={colorScheme === "dark" ? "#fbbf24" : "#facc15"}
                      />

                      <Text style={[styles.metaText, { textAlign: 'left' }]}>
                        {offer.acceptedBid.user.reviews == 0 ? t("profile.noRatingsYet") : offer.acceptedBid.user.rating?.toFixed(1) || 0}
                        ({offer.acceptedBid.user.reviews} {offer.acceptedBid.user.reviews == 1 ? t("profile.review") : t("profile.reviews")})
                      </Text>
                    </View>
                  </View>

                  {!jobReported && user?._id != offer.acceptedBid.user?._id && <View>
                    <TouchableOpacity style={styles.chatCTA} onPress={() => { goToChat() }}>
                      <FontAwesome name="send" size={18} color='#fff' />
                    </TouchableOpacity>
                  </View>}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.container}>
            <Text style={styles.sectionTitle}>{t("jobDetails.activityLog")}</Text>
            <View style={[styles.history]}>
              <View style={styles.historyItem}>
                <View style={styles.historyItemBullet}></View>
                <View style={styles.historyItemLine}></View>
                <Text style={styles.historyItemTitle}>
                  <Text style={styles.historyItemName}>{offer.user.firstname} {offer.user.lastname}</Text>
                  {' '}
                  <Text style={styles.historyItemText}>{offer.type == 'seek' ? t("jobDetails.seekedHelp") : t("jobDetails.offeredHelp")}</Text>
                  {' '}
                  <Text style={[styles.historyItemText, { fontSize: 12 }]}> - {formatDateTime(offer.createdAt)}</Text>
                </Text>
                <Text style={styles.historyItemDescription}>
                  <Text style={{ color: colorScheme === 'dark' ? '#ddd' : '#000', fontFamily: 'Manrope_600SemiBold', textTransform: 'capitalize' }}>{offer.helpType} - {offer.title}</Text>{'\n'}
                  <Text style={{ fontFamily: 'Manrope_600SemiBold' }}>{offer.description}</Text>{'\n\n'}
                  <Text style={{ fontFamily: 'Manrope_600SemiBold', textTransform: 'capitalize' }}>{t("jobDetails.subject")}: {offer.subject}</Text>{'\n'}
                  <Text style={{ fontFamily: 'Manrope_600SemiBold' }}>{offer.type == 'seek' ? t("jobDetails.initialPriceRange") : t("jobDetails.initialPrice")}: {offer.type == 'seek' ? offer.priceMin + '-' + offer.priceMax : offer.price} ₺</Text>
                </Text>
              </View>

              <View style={styles.historyItem}>
                <View style={styles.historyItemBullet}></View>
                <View style={styles.historyItemLine}></View>
                <Text style={styles.historyItemTitle}>
                  <Text style={styles.historyItemName}>{offer.user.firstname} {offer.user.lastname}</Text>
                  {' '}
                  <Text style={styles.historyItemText}>{offer.type == 'seek' ? t("jobDetails.acceptedBidOf") : t("jobDetails.acceptedRequestOf")}</Text>
                  {' '}
                  <Text style={styles.historyItemName}>{offer.acceptedBid.user.firstname} {offer.acceptedBid.user.lastname}</Text>
                  {' '}
                  <Text style={[styles.historyItemText, { fontSize: 12 }]}> - {formatDateTime(offer.acceptedBid.acceptedAt)}</Text>

                </Text>
                <Text style={styles.historyItemDescription}>
                  <Text style={{ color: colorScheme === 'dark' ? '#ddd' : '#000', fontFamily: 'Manrope_600SemiBold', textTransform: 'capitalize' }}>{t("jobDetails.bidNumber")} {offer.acceptedBid?._id}</Text>{'\n'}
                  <Text style={{ fontFamily: 'Manrope_600SemiBold' }}>{offer.acceptedBid.message}</Text>{'\n\n'}
                  <Text style={{ fontFamily: 'Manrope_600SemiBold', textTransform: 'capitalize' }}>{t("jobDetails.duration")}: {offer.acceptedBid.duration} {offer.acceptedBid.duration == 1 ? t("jobDetails.hour") : t("jobDetails.hours")}</Text>{'\n'}
                  <Text style={{ fontFamily: 'Manrope_600SemiBold' }}>{t("jobDetails.price")}: {offer.acceptedBid.amount} ₺</Text>
                </Text>
              </View>

              {offer.type == 'seek' && <View style={styles.historyItem}>
                <View style={styles.historyItemBullet}></View>
                <View style={styles.historyItemLine}></View>
                <Text style={styles.historyItemTitle}>
                  <Text style={styles.historyItemName}>{offer.title}</Text>
                  {' '}
                  <Text style={[styles.historyItemText]}>
                    {t("jobDetails.offerClosed")}
                  </Text>
                  {' '}
                  <Text style={[styles.historyItemText,{fontSize:12}]}>
                    - {formatDateTime(offer.acceptedBid.acceptedAt)}
                  </Text>
                </Text>
                <Text style={[styles.historyItemDescription, { backgroundColor: 'transparent', padding: 0 }]}>
                  <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme === 'dark' ? '#888' : '#555', }}>
                    {t("jobDetails.reason")}: {t("jobDetails.oneBidAccepted")}
                  </Text>
                </Text>
              </View>}

              <View style={styles.historyItem}>
                <View style={styles.historyItemBullet}></View>
                {!hasJobReport && <View style={styles.historyItemLine}></View>}
                {hasJobReport && <View style={styles.historyItemLineDashed}>
                  {Array.from({ length: 100 }).map((_, index) => (
                    <View key={index} style={[styles.dash, styles.red]} />
                  ))}
                </View>}
                <Text style={styles.historyItemTitle}>
                  <Text style={styles.historyItemName}>{t("jobDetails.jobStarted")}</Text>
                  {' '}
                  <Text style={[styles.historyItemText, { fontSize: 12 }]}> - {formatDateTime(offer.acceptedBid.acceptedAt)}</Text>
                </Text>
                <Text style={[styles.historyItemDescription, { backgroundColor: 'transparent', padding: 0 }]}>
                  <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme === 'dark' ? '#888' : '#555' }}>
                    {t("jobDetails.usersWorkingTogether")}
                  </Text>
                </Text>
              </View>

              {hasJobReport && <View style={styles.historyItem}>
                <View style={[styles.historyItemBullet, styles.red]}></View>
                {reportResolved && <View style={styles.historyItemLine}></View>}
                <Text style={styles.historyItemTitle}>
                  <Text style={styles.historyItemName}>
                    <Text style={[styles.historyItemName, { color: colorScheme === 'dark' ? '#d44646' : 'red', }]}>
                      {t("jobDetails.jobReported")}{` `}
                    </Text>
                    {getReportTime() && (
                      <Text style={[styles.historyItemText, { fontSize: 12 }]}> - {formatDateTime(getReportTime())}</Text>
                    )}
                  </Text>
                </Text>

                <View style={[styles.historyItemDescription, { backgroundColor: 'transparent', padding: 0 }]}>
                  {reportDescription().map((line, index) => (
                    <View key={`${line}-${index}`} style={styles.reportDescriptionLine}>
                      <Ionicons name={"flag-outline"} size={16} color={colorScheme === 'dark' ? '#d44646' : 'red'} />
                      {/* <MaterialIcons name="report-problem" size={15} color={colorScheme === 'dark' ? '#d44646' : 'red'} /> */}
                      <Text style={styles.reportDescriptionText}>{line}</Text>
                    </View>
                  ))}
                  {jobReported && <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                    <Entypo name="dots-three-horizontal" size={14} color="#555" />
                    <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme === 'dark' ? '#888' : '#555', paddingRight: 20 }}>
                      {t("jobDetails.unihelpReviewingJob")}{`\n`}
                    </Text>
                  </View>}
                </View>

              </View>}

              {reportResolved && <View style={styles.historyItem}>
                <View style={styles.historyItemBullet}></View>
                <View style={styles.historyItemLine}></View>
                <Text style={styles.historyItemTitle}>
                  <Text style={styles.historyItemName}>{t("jobDetails.reportResolvedByAdmin")}</Text>
                  {' '}
                  <Text style={[styles.historyItemText]}>
                    {t("jobDetails.reportResolvedByAdmin2")}
                  </Text>
                  {' '}
                  {reportThread?.resolvedAt && (
                    <Text style={[styles.historyItemText, { fontSize: 12 }]}>
                      - {formatDateTime(reportThread.resolvedAt)}
                    </Text>
                  )}

                </Text>
                <View style={[styles.historyItemDescription, { backgroundColor: 'transparent', padding: 0 }]}>
                  {settlementDescription().map((line, index) => (
                    <View key={`${line}-${index}`} style={[styles.reportDescriptionLine, { alignItems: 'baseline' }]}>
                      <Ionicons name={index === 0 ? "shield-checkmark-outline" : "cash-outline"} size={16} color="#10b981" />
                      <Text style={styles.reportDescriptionText}>{line}</Text>
                    </View>
                  ))}
                  {reportThread?.resolutionNote ? (
                    <View style={styles.reportDescriptionLine}>
                      <Ionicons name="document-text-outline" size={16} color="#10b981" />
                      <Text style={[styles.reportDescriptionText, { fontSize: 12 }]}>
                        {t("jobDetails.resolutionNote")}: {reportThread.resolutionNote}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>}

              {reportResolved && <View style={styles.historyItem}>
                <View style={styles.historyItemBullet}></View>
                <View style={styles.historyItemLine}></View>
                <Text style={styles.historyItemTitle}>
                  <Text style={styles.historyItemName}>{t("jobDetails.adminClosedJobOffer")}</Text>
                  {' '}
                  <Text style={[styles.historyItemText]}>
                    {t("jobDetails.adminClosedJobOffer2")}
                  </Text>
                  {' '}
                  <Text style={[styles.historyItemText, { fontSize: 12 }]}>
                    - {formatDateTime(job?.completedAt || reportThread?.resolvedAt)}
                  </Text>
                </Text>
              </View>}

              {reportResolved && <View style={styles.historyItem}>
                <View style={styles.historyItemBullet}></View>
                <View style={styles.historyItemLine}></View>
                <Text style={styles.historyItemTitle}>
                  <Text style={styles.historyItemName}>{t("jobDetails.rewardsCollected")}</Text>
                  {' '}
                  <Text style={[styles.historyItemText, { fontSize: 12 }]}> - {formatDateTime(reportThread?.resolvedAt)}</Text>
                </Text>
              </View>}

              {reportResolved && <View style={styles.historyItem}>
                <View style={[
                  styles.historyItemBullet,
                  (!ownerResolutionFeedback || !bidderResolutionFeedback) && styles.gray
                ]}></View>
                <Text style={styles.historyItemTitle}>
                  <Text style={styles.historyItemName}>{t("jobDetails.resolutionFeedbackEvaluations")}</Text>
                  {' '}
                  <Text style={[styles.historyItemText, { fontSize: 12 }]}> - {formatDateTime(reportThread?.resolvedAt)}</Text>
                </Text>
                <View style={[styles.historyItemDescription, { backgroundColor: 'transparent', padding: 0, paddingRight: 10 }]}>
                  {!ownerResolutionFeedback ? (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                      <Entypo name="dots-three-horizontal" size={14} color={colorScheme === 'dark' ? '#888' : '#555'} />
                      <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme === 'dark' ? '#888' : '#555' }}>
                        {t("jobDetails.waitingFor")}
                        <Text style={{ textTransform: 'capitalize' }}>
                          {' '} {offer.user.firstname} {offer.user.lastname}
                        </Text>
                        {' '}{t("jobDetails.toEvaluateResolution")}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                      <Feather name="check" size={16} color="#10b981" />
                      <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme === 'dark' ? '#888' : '#555' }}>
                        <Text style={{ textTransform: 'capitalize' }}>{offer.user.firstname} {offer.user.lastname}</Text> {t("jobDetails.submittedResolutionFeedback")}
                      </Text>
                    </View>
                  )}

                  {!bidderResolutionFeedback ? (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                      <Entypo name="dots-three-horizontal" size={14} color={colorScheme === 'dark' ? '#888' : '#555'} />
                      <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme === 'dark' ? '#888' : '#555' }}>
                        {t("jobDetails.waitingFor")}
                        <Text style={{ textTransform: 'capitalize' }}>
                          {' '} {offer.acceptedBid.user.firstname} {offer.acceptedBid.user.lastname}
                        </Text>
                        {' '}{t("jobDetails.toEvaluateResolution")}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                      <Feather name="check" size={16} color="#10b981" />
                      <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme === 'dark' ? '#888' : '#555' }}>
                        <Text style={{ textTransform: 'capitalize' }}>{offer.acceptedBid.user.firstname} {offer.acceptedBid.user.lastname}</Text> {t("jobDetails.submittedResolutionFeedback")}
                      </Text>
                    </View>
                  )}
                </View>

                {!isAdminUser && (user?._id == offer.user?._id || user?._id == offer.acceptedBid.user?._id) && !currentUserResolutionFeedback &&
                  <TouchableOpacity onPress={handleSubmitResolutionFeedback} style={[styles.historyItemPrimaryCTA, { paddingLeft: 15, marginTop: 5 }]} disabled={submitting}>
                    {submitting && <ActivityIndicator size="small" color="#10b981" />}
                    {!submitting && <Feather name="arrow-right-circle" size={18} color="#10b981" />}
                    <Text style={styles.historyItemPrimaryCTAText}>{t("jobDetails.evaluateResolution")}</Text>
                  </TouchableOpacity>
                }
              </View>}

              {!jobReported && job.completedAt == null && <View style={styles.historyItem}>
                <View style={[styles.historyItemBullet, job.completedAt == null && styles.gray]}></View>
                {job.completedAt != null && <View style={styles.historyItemLine}></View>}
                <Text style={styles.historyItemTitle}>
                  <Text style={styles.historyItemName}>{t("jobDetails.jobStillOngoing")}</Text>
                </Text>
                {offer.user?._id == user?._id && job.completedAt == null && <View style={styles.historyItemCTAs}>
                  <TouchableOpacity
                    onPress={() => { handleCloseJob(job?._id) }}
                    style={[styles.historyItemPrimaryCTA, jobReported && styles.disabledCTA]}
                    disabled={completing || jobReported}
                  >
                    {completing && <ActivityIndicator size="small" color="#10b981" />}
                    {!completing && <FontAwesome6 name="circle-check" size={18} color="#10b981" />}
                    <Text style={styles.historyItemPrimaryCTAText}>{t("jobDetails.markCompleted")}</Text>
                  </TouchableOpacity>
                </View>}
                {offer.user?._id != user?._id && job.completedAt == null &&
                  <View>
                    <Text style={[styles.historyItemText, { fontSize: 12, marginBottom: 5 }]}>
                      {t("jobDetails.bidderCloseHintPrefix")} <Text style={{ textTransform: 'capitalize' }}>{offer.user.firstname} {offer.user.lastname}</Text> {t("jobDetails.bidderCloseHintSuffix")}</Text>

                    {offer.acceptedBid?.user?._id == user?._id && (
                      <View style={styles.historyItemCTAs}>
                        <TouchableOpacity
                          onPress={handleRequestCloseJob}
                          style={[
                            styles.historyItemPrimaryCTA,
                            (closeRequestDisabled || jobReported) && styles.disabledCTA,
                          ]}
                          disabled={closeRequestDisabled || jobReported}
                        >
                          {requestCloseSending && <ActivityIndicator size="small" color="#10b981" />}
                          {!requestCloseSending && <MaterialIcons name="notification-important" size={18} color="#10b981" />}
                          <Text style={styles.historyItemPrimaryCTAText}>
                            {closeRequestLabel}
                          </Text>
                        </TouchableOpacity>
                        {/* <Text style={styles.historyItemSubText}>This sends a reminder notification to the job owner.</Text> */}
                      </View>
                    )}
                  </View>
                }
              </View>}

              {job.completedAt != null && !reportResolved && <View style={styles.historyItem}>
                <View style={styles.historyItemBullet}></View>
                <View style={styles.historyItemLine}></View>
                <Text style={styles.historyItemTitle}>
                  <Text style={styles.historyItemName}>{offer.user.firstname} {offer.user.lastname}</Text>
                  {' '}
                  <Text style={styles.historyItemText}>{t("jobDetails.markedCompleted")}</Text>
                  <Text style={[styles.historyItemText, { fontSize: 12 }]}> - {formatDateTime(job.completedAt)}</Text>
                </Text>
              </View>}

              {job.completedAt != null && !reportResolved && <View style={styles.historyItem}>
                <View style={[
                  styles.historyItemBullet,
                  (offer.user?.helpjobs?.find(h => h.offer === offer?._id)?.survey == null || offer.acceptedBid?.user?.helpjobs?.find(h => h.offer === offer?._id)?.survey == null) && styles.gray
                ]}></View>
                {offer.user?.helpjobs?.find(h => h.offer === offer?._id)?.survey != null && offer.acceptedBid?.user?.helpjobs?.find(h => h.offer === offer?._id)?.survey != null &&
                  <View style={styles.historyItemLine}></View>
                }
                <Text style={styles.historyItemTitle}>
                  <Text style={styles.historyItemName}>{t("jobDetails.feedbackEvaluations")}</Text>
                  {' '}
                  <Text style={[styles.historyItemText, { fontSize: 12 }]}> - {formatDateTime(job.completedAt)}</Text>
                </Text>
                <View style={[styles.historyItemDescription, { backgroundColor: 'transparent', padding: 0, paddingRight: 10 }]}>
                  {offer.user?.helpjobs?.find(h => h.offer === offer?._id)?.survey == null ? (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                      <Entypo name="dots-three-horizontal" size={14} color={colorScheme === 'dark' ? '#888' : '#555'} />
                      <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme === 'dark' ? '#888' : '#555' }}>
                        {t("jobDetails.waitingFor")}
                        <Text style={{ textTransform: 'capitalize' }}>
                          {' '} {offer.user.firstname} {offer.user.lastname}
                        </Text>
                        {' '}{t("jobDetails.toGiveFeedback")}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                      <Feather name="check" size={16} color="#10b981" />
                      <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme === 'dark' ? '#888' : '#555' }}>
                        <Text style={{ textTransform: 'capitalize' }}>{offer.user.firstname} {offer.user.lastname}</Text> {t("jobDetails.submittedFeedback")}
                      </Text>
                    </View>
                  )}

                  {offer.acceptedBid?.user?.helpjobs?.find(h => h.offer === offer?._id)?.survey == null ? (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                      <Entypo name="dots-three-horizontal" size={14} color={colorScheme === 'dark' ? '#888' : '#555'} />
                      <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme === 'dark' ? '#888' : '#555' }}>
                        {t("jobDetails.waitingFor")}
                        <Text style={{ textTransform: 'capitalize' }}>
                          {' '} {offer.acceptedBid.user.firstname} {offer.acceptedBid.user.lastname}
                        </Text>
                        {' '}{t("jobDetails.toGiveFeedback")}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ fontFamily: 'Manrope_600SemiBold' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                        <Feather name="check" size={16} color="#10b981" />

                        <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme === 'dark' ? '#888' : '#555' }}>
                          <Text style={{ textTransform: 'capitalize' }}>{offer.acceptedBid.user.firstname} {offer.acceptedBid.user.lastname}</Text> {t("jobDetails.submittedFeedback")}
                        </Text>

                      </View>
                    </Text>
                  )}
                </View>

                {user?._id == offer.user?._id && offer.user?.helpjobs?.find(h => h.offer === offer?._id)?.survey == null &&
                  <TouchableOpacity onPress={() => { handleSubmitSurvey(job?._id) }} style={[styles.historyItemPrimaryCTA, { paddingLeft: 15, marginTop: 5 }]} disabled={submitting}>
                    {submitting && <ActivityIndicator size="small" color="#10b981" />}
                    {!submitting && <Feather name="arrow-right-circle" size={18} color="#10b981" />}
                    <Text style={styles.historyItemPrimaryCTAText}>{t("jobDetails.submitFeedback")}</Text>
                  </TouchableOpacity>
                }

                {user?._id == offer.acceptedBid.user?._id && offer.acceptedBid?.user?.helpjobs?.find(h => h.offer === offer?._id)?.survey == null &&
                  <TouchableOpacity onPress={() => { handleSubmitSurvey(job?._id) }} style={[styles.historyItemPrimaryCTA, { paddingLeft: 15, marginTop: 5 }]} disabled={submitting}>
                    {submitting && <ActivityIndicator size="small" color="#10b981" />}
                    {!submitting && <Feather name="arrow-right-circle" size={18} color="#10b981" />}
                    <Text style={styles.historyItemPrimaryCTAText}>{t("jobDetails.submitFeedback")}</Text>
                  </TouchableOpacity>
                }
              </View>}

              {/* if offer type is seek systemAccepted/systemRejected */}
              {job.completedAt != null && !reportResolved && offer.type == 'seek' &&
                (
                  offer.user?.helpjobs?.find(h => h.offer === offer?._id)?.survey != null
                  && offer.acceptedBid?.user?.helpjobs?.find(h => h.offer === offer?._id)?.survey != null
                ) &&

                <View style={styles.historyItem}>
                  <View style={[styles.historyItemBullet, (offer.systemApproved == null && offer.systemRejected == null) && styles.gray]}></View>
                  {(offer.systemApproved != null) && <View style={styles.historyItemLine}></View>}
                  <Text style={styles.historyItemTitle}>
                    <Text style={styles.historyItemName}>{t("jobDetails.systemValidation")}</Text>
                    {' '}
                    <Text style={[styles.historyItemText, { fontSize: 12 }]}> - {formatDateTime(offer.systemApproved || offer.systemRejected)}</Text>
                  </Text>
                  <Text style={[styles.historyItemDescription, { backgroundColor: 'transparent', padding: 0 }]}>
                    {(offer.systemApproved == null && offer.systemRejected == null) ? (
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                        <Entypo name="dots-three-horizontal" size={14} color="#555" />
                        <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme === 'dark' ? '#888' : '#555', paddingRight: 20 }}>
                          {t("jobDetails.unihelpValidatingJob")}{`\n`}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ fontFamily: 'Manrope_600SemiBold' }}>
                        {offer.systemApproved != null && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Feather name="check" size={16} color="#10b981" />
                          <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme === 'dark' ? '#888' : '#555' }}>
                            {t("jobDetails.approved")}
                          </Text>
                        </View>}
                        {offer.systemApproved == null && offer.systemRejected != null && <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
                          <Feather name="x" size={16} color="#f85151" style={{ marginTop: 2 }} />
                          <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme === 'dark' ? '#888' : '#555' }}>
                            {t("jobDetails.rejected")}{`\n`}{t("jobDetails.reason")}: {offer.rejectReason}{`\n`}{t("jobDetails.requiredAction")}: {t("jobDetails.contactSupport")}
                          </Text>

                        </View>}
                      </Text>
                    )}
                  </Text>

                </View>
              }

              {/* if offer type is offer systemAccepted/systemRejected */}
              {job.completedAt != null && !reportResolved && offer.type == 'offer' &&
                (
                  offer.user?.helpjobs?.find(h => h.offer === offer?._id)?.survey != null
                  && offer.acceptedBid?.user?.helpjobs?.find(h => h.offer === offer?._id)?.survey != null
                ) &&

                <View style={styles.historyItem}>
                  <View style={[styles.historyItemBullet, (job.systemApproved == null && job.systemRejected == null) && styles.gray]}></View>
                  {(job.systemApproved != null) && <View style={styles.historyItemLine}></View>}
                  <Text style={styles.historyItemTitle}>
                    <Text style={styles.historyItemName}>{t("jobDetails.systemValidation")}</Text>
                    {' '}
                    <Text style={[styles.historyItemText, { fontSize: 12 }]}> - {formatDateTime(job.systemApproved || job.systemRejected)}</Text>
                  </Text>
                  <Text style={[styles.historyItemDescription, { backgroundColor: 'transparent', padding: 0 }]}>
                    {(job.systemApproved == null && job.systemRejected == null) ? (
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                        <Entypo name="dots-three-horizontal" size={14} color="#555" />
                        <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme === 'dark' ? '#888' : '#555', paddingRight: 20 }}>
                          {t("jobDetails.unihelpValidatingJob")}{`\n`}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ fontFamily: 'Manrope_600SemiBold' }}>
                        {job.systemApproved != null && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Feather name="check" size={16} color="#10b981" />
                          <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme === 'dark' ? '#888' : '#555' }}>
                            {t("jobDetails.approved")}
                          </Text>
                        </View>}
                        {job.systemApproved == null && job.systemRejected != null && <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
                          <Feather name="x" size={16} color="#f85151" style={{ marginTop: 2 }} />
                          <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme === 'dark' ? '#888' : '#555' }}>
                            {t("jobDetails.rejected")}{`\n`}{t("jobDetails.reason")}: {job.rejectReason}{`\n`}{t("jobDetails.requiredAction")}: {t("jobDetails.contactSupport")}
                          </Text>
                        </View>}
                      </Text>
                    )}
                  </Text>

                </View>
              }

              {/* if 'seek' and accepted -> show rewards collected with 'seek' accepted date */}
              {job.completedAt != null && !reportResolved && offer.type == 'seek' &&
                (
                  offer.user?.helpjobs?.find(h => h.offer === offer?._id)?.survey != null
                  && offer.acceptedBid?.user?.helpjobs?.find(h => h.offer === offer?._id)?.survey != null
                ) &&
                offer.systemApproved != null &&
                <View style={styles.historyItem}>
                  <View style={styles.historyItemBullet}></View>
                  {/* <View style={styles.historyItemLine}></View> */}
                  <Text style={styles.historyItemTitle}>
                    <Text style={styles.historyItemName}>{t("jobDetails.rewardsCollected")}</Text>
                    {' '}
                    <Text style={[styles.historyItemText, { fontSize: 12 }]}> - {formatDateTime(offer.systemApproved)}</Text>
                  </Text>
                </View>}

              {/* if 'offer' and accepted -> show rewards collected with 'offer' accepted date */}
              {job.completedAt != null && !reportResolved && offer.type == 'offer' &&
                (
                  offer.user?.helpjobs?.find(h => h.offer === offer?._id)?.survey != null
                  && offer.acceptedBid?.user?.helpjobs?.find(h => h.offer === offer?._id)?.survey != null
                ) &&
                job.systemApproved != null &&
                <View style={styles.historyItem}>
                  <View style={styles.historyItemBullet}></View>
                  {/* <View style={styles.historyItemLine}></View> */}
                  <Text style={styles.historyItemTitle}>
                    <Text style={styles.historyItemName}>{t("jobDetails.rewardsCollected")}</Text>
                    {' '}
                    <Text style={[styles.historyItemText, { fontSize: 12 }]}> - {formatDateTime(job.systemApproved)}</Text>
                  </Text>
                </View>}
            </View>

          </View>
        </ScrollView>}

        {/* <View style={{ paddingBottom: insets.bottom, paddingHorizontal: 20 }}>
          {offer.user?._id == user?._id && job?.completedAt == null &&
            <TouchableOpacity style={styles.submitBtn} onPress={() => { handleCloseJob(job_id) }} disabled={closing}>
              <AntDesign name="close-circle" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Mark job as completed</Text>
            </TouchableOpacity>}
        </View> */}

        <BottomSheet
          ref={reportRef}
          index={-1}
          // snapPoints={reportSnapPoints}
          enableDynamicSizing={true}
          enablePanDownToClose={true}
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={styles.sheetHandle}
          backdropComponent={props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
        >
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: keyboardOpen ? 10 : insets.bottom + 20,
            }}
            showsVerticalScrollIndicator={false}
          >
            {reportSheetMode === "menu" && (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>{t("jobDetails.report")}</Text>
                  <TouchableOpacity style={styles.sheetClose} onPress={handleCloseModalPress}>
                    <Ionicons name="close" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                  </TouchableOpacity>
                </View>

                {!isAdminUser && !reportThread?.hasReported && (
                  <TouchableOpacity style={styles.sheetOption} onPress={openReportThread}>
                    <Ionicons name={"flag-outline"} size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                    <Text style={styles.sheetOptionText}>{t("jobDetails.reportThisJob")}</Text>
                  </TouchableOpacity>
                )}

                {!isAdminUser && reportThread?.hasReported && (
                  <View style={[styles.sheetOption, { opacity: 0.6 }]}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                    <Text style={styles.sheetOptionText}>{t("jobDetails.alreadyReportedMessage")}</Text>
                  </View>
                )}

              </>
            )}

            {reportSheetMode === "report" && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetHeaderRow}>
                    <TouchableOpacity style={styles.sheetBack} onPress={() => setReportSheetMode("menu")}>
                      <Ionicons name="chevron-back" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                    </TouchableOpacity>
                    <Text style={styles.sheetTitle}>{t("jobDetails.reportJob")}</Text>
                  </View>
                  <TouchableOpacity style={styles.sheetClose} onPress={handleCloseModalPress}>
                    <Ionicons name="close" size={20} color={colorScheme === "dark" ? "#fff" : "#000"} />
                  </TouchableOpacity>
                </View>
                <View style={{ paddingHorizontal: 10 }}>
                  <BottomSheetTextInput
                    multiline
                    placeholder={t("jobDetails.describeIssue")}
                    placeholderTextColor="#aaa"
                    style={[styles.sheetInput, { minHeight: 120 }]}
                    value={reportInput}
                    onChangeText={setReportInput}
                    selectionColor='#10b981'
                  />

                  <TouchableOpacity
                    onPress={sendReportMessage}
                    style={[styles.sheetSubmit, { marginTop: 10 }]}
                    disabled={reportSending}
                  >
                    <Text style={styles.sheetSubmitText}>{t("jobDetails.submitReport")}</Text>
                    {reportSending && <ActivityIndicator size="small" color="#fff" />}
                  </TouchableOpacity>
                </View>
              </>
            )}

          </BottomSheetScrollView>
        </BottomSheet>

        <BottomSheet
          ref={closeConfirmationRef}
          index={-1}
          // snapPoints={snapPointsCloseConfirmation}
          enableDynamicSizing={true}
          enablePanDownToClose={true}
          backgroundStyle={styles.modal}
          handleIndicatorStyle={styles.modalHandle}
          backdropComponent={props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
          keyboardBehavior="extend"
          keyboardBlurBehavior="restore"
        >
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("jobDetails.markCompletedQuestion")}</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => { handleCloseModalPress() }} >
                <Ionicons name="close" size={24} color={colorScheme === 'dark' ? '#374567' : '#888'} />
              </TouchableOpacity>
            </View>


            {/* <View style={{ gap: 15 }}> */}
            <View>
              <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                {t("jobDetails.markCompletedExplanation")}
              </Text>

            </View>

            <View>
              <TouchableOpacity onPress={() => { handleCloseModalPress() }} style={[styles.modalButton, styles.gray]} disabled={completing}>
                <Text style={styles.modalButtonText}>{t("common.cancel")}</Text>
                {completing && <ActivityIndicator size='small' color={'#fff'} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { handleConfirmCloseJob(resolvedOfferId) }} style={styles.modalButton} disabled={completing}>
                <Text style={styles.modalButtonText}>{t("jobDetails.confirmMarkCompleted")}</Text>
                {completing && <ActivityIndicator size='small' color={'#fff'} />}
              </TouchableOpacity>
            </View>
            {/* </View> */}
          </BottomSheetScrollView>
          {/* </BottomSheetView> */}
        </BottomSheet>

        <BottomSheet
          ref={resolutionFeedbackRef}
          index={-1}
          snapPoints={snapPoints}
          enableDynamicSizing={false}
          enablePanDownToClose={true}
          backgroundStyle={styles.modal}
          handleIndicatorStyle={styles.modalHandle}
          backdropComponent={props => (
            <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
          )}
          keyboardBehavior="extend"
          keyboardBlurBehavior="restore"
        >
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.modalScrollView]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("jobDetails.resolutionFeedbackTitle")}</Text>
              <TouchableOpacity style={styles.modalClose} onPress={handleCloseModalPress}>
                <Ionicons name="close" size={24} color={colorScheme === 'dark' ? '#374567' : '#888'} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.historyItemText, { marginBottom: 10 }]}>
              {t("jobDetails.rateUnihelpResolution")}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5].map(num => (
                <TouchableOpacity key={num} onPress={() => setResolutionRating(num)}>
                  <AntDesign
                    name="star"
                    size={22}
                    color={(resolutionRating && resolutionRating >= num) ? "#facc15" : "#888"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.historyItemText, { marginBottom: 10 }]}>
              {t("jobDetails.resolutionFeedbackOptional")}
            </Text>
            <BottomSheetTextInput
              multiline
              placeholder={t("jobDetails.resolutionFeedbackPlaceholder")}
              placeholderTextColor="#aaa"
              style={[styles.filterInput, { minHeight: 80, textAlignVertical: "top", width: '100%' }]}
              value={resolutionFeedback}
              onChangeText={setResolutionFeedback}
              selectionColor='#10b981'
            />

            <TouchableOpacity
              onPress={handleConfirmSubmitResolutionFeedback}
              style={[styles.modalButton, { marginTop: 25 }]}
              disabled={submitting}
            >
              <Text style={styles.modalButtonText}>{t("jobDetails.submitSurvey")}</Text>
              {submitting && <ActivityIndicator size="small" color="#fff" />}
            </TouchableOpacity>
          </BottomSheetScrollView>
        </BottomSheet>

        <BottomSheet
          ref={submitSurveyRef}
          index={-1}
          snapPoints={snapPoints}
          enableDynamicSizing={false}
          // maxDynamicContentSize={windowHeight * 0.6}
          enablePanDownToClose={true}
          backgroundStyle={styles.modal}
          handleIndicatorStyle={styles.modalHandle}
          backdropComponent={props => (
            <BottomSheetBackdrop
              {...props}
              disappearsOnIndex={-1}
              appearsOnIndex={0}
            />
          )}
          keyboardBehavior="extend"
          keyboardBlurBehavior="restore"
        >
          {offer.user?._id == user?._id && <BottomSheetView style={{ flex: 1 }}>
            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.modalScrollView]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("jobDetails.jobFeedback")}</Text>
                <TouchableOpacity style={styles.modalClose} onPress={handleCloseModalPress}>
                  <Ionicons name="close" size={24} color={colorScheme === 'dark' ? '#374567' : '#888'} />
                </TouchableOpacity>
              </View>

              <View>
                <Text style={[styles.historyItemText, { marginBottom: 5 }]}>{t("jobDetails.gotNeededHelpQuestion")}</Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                  <TouchableOpacity
                    style={[styles.typeCTA, gotNeededHelp && styles.selectedTypeCTA]}
                    onPress={() => { setGotNeededHelp(true) }
                    }>
                    <Text style={[
                      styles.typeCTAText,
                      gotNeededHelp && styles.selectedTypeCTAText
                    ]}>{t("jobDetails.yes")}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.typeCTA, !gotNeededHelp && styles.selectedTypeCTA]}
                    onPress={() => { setGotNeededHelp(false) }
                    }>
                    <Text style={[
                      styles.typeCTAText,
                      !gotNeededHelp && styles.selectedTypeCTAText
                    ]}>{t("jobDetails.no")}</Text>
                  </TouchableOpacity>

                </View>
              </View>

              <View>
                <Text style={[styles.historyItemText, { marginBottom: 10 }]}>{t("jobDetails.didDeliverPrefix")} <Text style={{ fontFamily: 'Manrope_700Bold', color: colorScheme == 'dark' ? '#fff' : '#000', textTransform: 'capitalize' }}>{offer.acceptedBid.user.firstname} {offer.acceptedBid.user.lastname}</Text> {t("jobDetails.didDeliverSuffix")}</Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                  <TouchableOpacity
                    style={[styles.typeCTA, workDelivered && styles.selectedTypeCTA]}
                    onPress={() => { setWorkDelivered(true) }
                    }>
                    <Text style={[
                      styles.typeCTAText,
                      workDelivered && styles.selectedTypeCTAText
                    ]}>{t("jobDetails.yes")}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.typeCTA, !workDelivered && styles.selectedTypeCTA]}
                    onPress={() => { setWorkDelivered(false) }
                    }>
                    <Text style={[
                      styles.typeCTAText,
                      !workDelivered && styles.selectedTypeCTAText
                    ]}>{t("jobDetails.no")}</Text>
                  </TouchableOpacity>

                </View>
              </View>

              <View>
                <Text style={[styles.historyItemText, { marginBottom: 10 }]}>{t("jobDetails.ratePrefix")} <Text style={{ fontFamily: 'Manrope_700Bold', color: colorScheme == 'dark' ? '#fff' : '#000', textTransform: 'capitalize' }}>{offer.acceptedBid.user.firstname} {offer.acceptedBid.user.lastname}</Text> {t("jobDetails.rateSuffix")}</Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5].map(num => (
                    <TouchableOpacity
                      key={num}
                      onPress={() => setBidderRating(num)}
                    >
                      <AntDesign
                        name="star"
                        size={20}
                        color={(bidderRating && bidderRating >= num) ? "#facc15" : "#888"}
                      />
                      {/* <Text style={{ color: bidderRating === num ? "#fff" : "#000" }}>{num}</Text> */}
                    </TouchableOpacity>
                  ))}
                  {/* <Text>{bidderRating}</Text> */}
                </View>
              </View>

              <View>
                <Text style={[styles.historyItemText, { marginBottom: 10 }]}>{t("jobDetails.describeIssuesOptional")}</Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 5 }}>
                  <BottomSheetTextInput
                    multiline
                    placeholder={t("jobDetails.experiencePlaceholder", { name: offer.acceptedBid.user.firstname })}
                    placeholderTextColor="#aaa"
                    style={[styles.filterInput, { minHeight: 80, textAlignVertical: "top", width: '100%' }]}
                    value={feedback}
                    onChangeText={setFeedback}
                    selectionColor='#10b981'
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={() => { handleConfirmSubmitSurvey() }}
                style={[styles.modalButton, { marginTop: 25 }]}
                disabled={submitting}
              >
                <Text style={styles.modalButtonText}>{t("jobDetails.submitSurvey")}</Text>
                {submitting && <ActivityIndicator size="small" color="#fff" />}
              </TouchableOpacity>
            </BottomSheetScrollView>
          </BottomSheetView>}

          {offer.acceptedBid.user?._id == user?._id && <BottomSheetView style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("jobDetails.jobFeedback")}</Text>
              <TouchableOpacity style={styles.modalClose} onPress={handleCloseModalPress}>
                <Ionicons name="close" size={24} color={colorScheme === 'dark' ? '#374567' : '#888'} />
              </TouchableOpacity>
            </View>

            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.modalScrollView]}
              showsVerticalScrollIndicator={false}
            >
              <View>
                <Text style={[styles.historyItemText, { marginBottom: 5 }]}>{t("jobDetails.offeredHelpQuestion")}</Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                  <TouchableOpacity
                    style={[styles.typeCTA, gotNeededHelp && styles.selectedTypeCTA]}
                    onPress={() => { setGotNeededHelp(true) }
                    }>
                    <Text style={[
                      styles.typeCTAText,
                      gotNeededHelp && styles.selectedTypeCTAText
                    ]}>{t("jobDetails.yes")}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.typeCTA, !gotNeededHelp && styles.selectedTypeCTA]}
                    onPress={() => { setGotNeededHelp(false) }
                    }>
                    <Text style={[
                      styles.typeCTAText,
                      !gotNeededHelp && styles.selectedTypeCTAText
                    ]}>{t("jobDetails.no")}</Text>
                  </TouchableOpacity>

                </View>
              </View>

              <View>
                <Text style={[styles.historyItemText, { marginBottom: 10 }]}>{t("jobDetails.submittedWorkPrefix")} <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colorScheme == 'dark' ? '#fff' : '#000', textTransform: 'capitalize' }}>{offer.user.firstname}</Text>?</Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                  <TouchableOpacity
                    style={[styles.typeCTA, workDelivered && styles.selectedTypeCTA]}
                    onPress={() => { setWorkDelivered(true) }
                    }>
                    <Text style={[
                      styles.typeCTAText,
                      workDelivered && styles.selectedTypeCTAText
                    ]}>{t("jobDetails.yes")}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.typeCTA, !workDelivered && styles.selectedTypeCTA]}
                    onPress={() => { setWorkDelivered(false) }
                    }>
                    <Text style={[
                      styles.typeCTAText,
                      !workDelivered && styles.selectedTypeCTAText
                    ]}>{t("jobDetails.no")}</Text>
                  </TouchableOpacity>

                </View>
              </View>

              <View>
                <Text style={[styles.historyItemText, { marginBottom: 10 }]}>{t("jobDetails.ratePrefix")} <Text style={{ fontFamily: 'Manrope_700Bold', color: colorScheme === 'dark' ? '#ddd' : '#000', textTransform: 'capitalize' }}>{offer.user.firstname} {offer.user.lastname}</Text> {t("jobDetails.rateSuffix")}</Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5].map(num => (
                    <TouchableOpacity
                      key={num}
                      onPress={() => setOwnerRating(num)}
                    >
                      <AntDesign
                        name="star"
                        size={20}
                        color={(ownerRating && ownerRating >= num) ? "#facc15" : "#888"}
                      />
                      {/* <Text style={{ color: bidderRating === num ? "#fff" : "#000" }}>{num}</Text> */}
                    </TouchableOpacity>
                  ))}
                  {/* <Text>{bidderRating}</Text> */}
                </View>
              </View>

              <View>
                <Text style={[styles.historyItemText, { marginBottom: 10 }]}>{t("jobDetails.describeIssuesOptional")}</Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 5 }}>
                  <BottomSheetTextInput
                    multiline
                    placeholder={t("jobDetails.experiencePlaceholder", { name: offer.acceptedBid.user.firstname })}
                    placeholderTextColor="#aaa"
                    style={[styles.filterInput, { minHeight: 80, textAlignVertical: "top", width: '100%' }]}
                    value={feedback}
                    onChangeText={setFeedback}
                    selectionColor='#10b981'
                  />
                </View>
              </View>

              {/* Submit */}
              <TouchableOpacity
                onPress={() => { handleConfirmSubmitSurvey() }}
                style={[styles.modalButton, { marginTop: 25 }]}
                disabled={submitting}
              >
                <Text style={styles.modalButtonText}>{t("jobDetails.submitSurvey")}</Text>
                {submitting && <ActivityIndicator size="small" color="#fff" />}
              </TouchableOpacity>

            </BottomSheetScrollView>
          </BottomSheetView>}
        </BottomSheet>

      </GestureHandlerRootView>
    </PaperProvider>
  );
}

const styling = (colorScheme: string, insets: any) =>
  StyleSheet.create({
    appContainer: {
      flex: 1,
      backgroundColor: colorScheme === "dark" ? "#111827" : "#f4f3e9",
    },
    scrollArea: { flex: 1 },
    statusBar: { backgroundColor: "#10b981", height: Platform.OS === "ios" ? 60 : 25 },
    container: { paddingHorizontal: 20, marginBottom: 20 },
    header: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 0, marginBottom: 20 },
    greenHeader: { backgroundColor: "#10b981", borderBottomLeftRadius: Platform.OS == 'ios' ? 60 : 30, borderBottomRightRadius: Platform.OS == 'ios' ? 60 : 30 },
    backBtn: { flexDirection: "row", alignItems: "baseline", gap: 10 },
    pageTitle: { fontSize: 22, lineHeight: 26, color: "#fff", fontFamily: "Manrope_700Bold", textTransform: 'capitalize', flex: 1 },

    card: {
    },
    offerTitle: { fontSize: 20, fontFamily: "Manrope_700Bold", color: colorScheme === "dark" ? "#fff" : "#000" },
    offerDesc: {
      fontSize: 15,
      lineHeight: 22,
      color: colorScheme === "dark" ? "#d1d5db" : "#333",
      marginBottom: 20
    },
    open: {
      color: '#ff9d00',
      borderWidth: 1,
      borderColor: '#ff9d00',
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 30
    },
    completed: {
      color: '#10b981',
      borderWidth: 1,
      borderColor: '#10b981',
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 30
    },
    closed: {
      color: '#fa2727',
      borderWidth: 1,
      borderColor: '#fa2727',
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 30
    },
    offerMeta: { marginTop: 15, gap: 5 },
    metaText: {
      color: colorScheme === "dark" ? "#9ca3af" : "#555",
      fontFamily: "Manrope_500Medium",
      flex: 1,
      textAlign: 'right'
    },

    sectionTitle: {
      fontSize: 16,
      fontFamily: "Manrope_700Bold",
      color: colorScheme === "dark" ? "#fff" : "#000",
      marginBottom: 5,
    },

    metaData: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: '#ddd',
      paddingVertical: 5
    },
    label: {
      fontSize: 14,
      flex: 1,
      color: colorScheme === 'dark' ? '#fff' : '#000'
    },

    creatorCard: { gap: 15, paddingTop: 10 },
    creatorImage: { width: 40, height: 40, borderRadius: 50, backgroundColor: "#ddd" },
    creatorName: { fontSize: 16, fontFamily: "Manrope_600SemiBold", color: colorScheme === "dark" ? "#fff" : "#000" },
    creatorRole: { fontSize: 13, color: colorScheme === "dark" ? "#aaa" : "#555" },

    bidInput: {
      borderRadius: 10,
      padding: 12,
      fontFamily: "Manrope_500Medium",
      color: colorScheme === "dark" ? "#fff" : "#000",
      marginBottom: 10,
      minHeight: 80,
      textAlignVertical: "top",
      backgroundColor: colorScheme === "dark" ? "#1e293b" : "#fff",
    },
    submitBtn: {
      backgroundColor: "#10b981",
      paddingVertical: 12,
      borderRadius: 25,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    submitBtnText: { color: "#fff", fontFamily: "Manrope_700Bold" },

    bidCard: {
      // marginBottom: 10,
      // borderBottomWidth: 1,
      // borderBottomColor: colorScheme === "dark" ? "#334155" : "#ddd",
      paddingVertical: 10
    },
    bidUserImage: { width: 50, height: 50, borderRadius: 50 },
    bidUserName: {
      fontSize: 16,
      fontFamily: 'Manrope_700Bold',
      lineHeight: 24,
      marginBottom: 5,
      textTransform: 'capitalize',
      color: colorScheme === 'dark' ? '#fff' : '#000'
    },
    bidDate: { color: '#888', fontFamily: "Manrope_400Regular", fontSize: 12 },
    bidMessage: {
      marginTop: 8,
      fontSize: 14,
      color: colorScheme === "dark" ? "#d1d5db" : "#333",
      lineHeight: 20,
    },
    bidDuration: {
      fontSize: 14,
      color: colorScheme === "dark" ? "#d1d5db" : "#333",
      lineHeight: 20,
    },
    bidAmount: {
      fontSize: 14,
      color: colorScheme === "dark" ? "#d1d5db" : "#333",
      lineHeight: 20,
    },
    chooseBtn: {
      // backgroundColor: "#10b981",
      // paddingVertical: 8,
      // paddingHorizontal: 10,
      // borderRadius: 30,
      // marginTop: 10,
      alignItems: "center",
      flex: 1
    },
    chooseBtnText: { color: "#fff", fontFamily: "Manrope_600SemiBold" },

    hintText: { color: colorScheme === "dark" ? "#aaa" : "#666", fontStyle: "italic" },

    row: { flexDirection: "row", alignItems: "center" },
    navbarCTA: { flex: 1 },
    navBarCTAText: { fontSize: 10, color: colorScheme === "dark" ? "#fff" : "#000" },
    activeText: { color: "#10b981" },
    SafeAreaPaddingBottom: { paddingBottom: Platform.OS === "ios" ? 40 : 55 },
    tabs: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center'
    },
    tab: {
      paddingVertical: 5,
      paddingHorizontal: 15,
      borderBottomWidth: 5,
      borderBottomColor: "#10b981",
      opacity: 0.5
    },
    activeTab: {
      borderBottomColor: "#ffffff",
      opacity: 1
    },
    tabText: {
      color: "#fff", fontFamily: "Manrope_600SemiBold",
      fontSize: 18
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 50,
    },
    name: {
      fontSize: 16,
      fontFamily: 'Manrope_700Bold',
      lineHeight: 24,
      marginBottom: 5,
      textTransform: 'capitalize',
      color: colorScheme === 'dark' ? '#fff' : '#000'
    },
    modal: {
      backgroundColor: colorScheme === 'dark' ? '#111827' : '#f4f3e9',
    },
    modalHandle: {
      width: 50,
      backgroundColor: colorScheme === 'dark' ? '#2c3854' : '#aaa',
    },
    sheetBackground: {
      backgroundColor: colorScheme === 'dark' ? '#111827' : '#f4f3e9',
    },
    sheetHandle: {
      backgroundColor: colorScheme === 'dark' ? '#2c3854' : '#b0b0b0',
    },
    sheetBody: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 6,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#1f2937' : '#e5e7eb',
      marginBottom: 12,
      paddingHorizontal: 10
    },
    sheetHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sheetBack: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#374151' : '#d1d5db',
    },
    sheetTitle: {
      fontSize: 16,
      fontFamily: 'Manrope_700Bold',
      color: colorScheme === 'dark' ? '#fff' : '#000',
    },
    sheetClose: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#374151' : '#d1d5db',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 10
    },
    sheetOptionText: {
      fontSize: 15,
      color: colorScheme === 'dark' ? '#fff' : '#111827',
      fontFamily: 'Manrope_600SemiBold',
    },
    sheetScroll: {
      paddingBottom: 30,
    },
    sheetInput: {
      minHeight: 120,
      borderRadius: 14,
      padding: 12,
      textAlignVertical: 'top',
      backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#fff',
      color: colorScheme === 'dark' ? '#fff' : '#111827',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#2c3854' : '#e5e7eb',
      fontFamily: 'Manrope_400Regular',
      marginBottom: 10
    },
    sheetSubmit: {
      backgroundColor: '#10b981',
      borderRadius: 24,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    sheetSubmitDisabled: {
      opacity: 0.7,
    },
    sheetSubmitText: {
      color: '#fff',
      fontFamily: 'Manrope_700Bold',
      fontSize: 15,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      // paddingHorizontal: 15,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderColor: colorScheme === 'dark' ? '#1a253d' : '#e4e4e4',
      color: colorScheme === 'dark' ? '#fff' : '#eee',
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: 'Manrope_700Bold',
      color: colorScheme === 'dark' ? '#fff' : '#000',
      borderBottomWidth: 3,
      borderBottomColor: 'transparent'
    },
    modalTabTitle: {
      fontSize: 18,
      fontFamily: 'Manrope_700Bold',
      color: colorScheme === 'dark' ? '#58595a' : '#888',
      borderBottomWidth: 3,
      borderBottomColor: 'transparent'
    },
    modalClose: {
      padding: 5,
      borderWidth: 1,
      borderRadius: 20,
      borderColor: colorScheme === 'dark' ? '#2c3854' : '#000',
    },
    modalScrollView: {
      paddingHorizontal: 15,
      paddingVertical: 10,
      paddingBottom: insets.bottom + 20
    },
    modalButton: {
      backgroundColor: '#10b981',
      paddingVertical: 15,
      borderRadius: 60,
      alignItems: 'center',
      marginTop: 10,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 15
    },
    modalButtonText: {
      fontFamily: 'Manrope_700Bold',
      fontSize: 16,
      color: '#fff'
    },
    filterInput: {
      backgroundColor: colorScheme === "dark" ? "#1e293b" : "#fff",
      borderRadius: 10,
      paddingVertical: 10,
      paddingLeft: 20,
      paddingRight: 50,
      color: colorScheme === 'dark' ? '#fff' : '#000',
      fontFamily: 'Manrope_500Medium',
      marginBottom: 10
    },
    filterInputWithPrefix: {
      backgroundColor: colorScheme === "dark" ? "#131d33" : "#f9f9f9",
      borderRadius: 10,
    },
    filterInputWithPrefixText: {
      color: colorScheme === 'dark' ? '#fff' : '#000',
      fontFamily: 'Manrope_400Regular',
      fontSize: 18
    },
    history: {
    },
    reportSection: {
      marginTop: 20,
    },
    reportHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 15,
    },
    reportCTA: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#10b981',
    },
    reportCTAText: {
      color: '#10b981',
      fontFamily: 'Manrope_600SemiBold',
      fontSize: 12,
    },
    reportLoading: {
      alignItems: 'center',
      gap: 6,
      flexDirection: 'row',
      justifyContent: 'center',
    },
    reportHint: {
      color: colorScheme === 'dark' ? '#888' : '#555',
      fontFamily: 'Manrope_400Regular',
      fontSize: 13,
      textAlign: 'center',
    },
    reportMessages: {
      gap: 10,
    },
    reportRow: {
      flexDirection: 'row',
    },
    reportBubble: {
      maxWidth: '80%',
      backgroundColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
    },
    reportBubbleMine: {
      backgroundColor: '#10b981',
    },
    reportBubbleText: {
      fontSize: 14,
      fontFamily: 'Manrope_400Regular',
    },
    reportBubbleTime: {
      fontSize: 11,
      marginTop: 4,
      textAlign: 'right',
      color: '#ffffff99',
      fontFamily: 'Manrope_400Regular',
    },
    historyItem: {
      position: 'relative',
      paddingLeft: 20,
      marginBottom: 20
    },
    historyItemBullet: {
      position: 'absolute',
      top: 6,
      left: 0,
      height: 10,
      width: 10,
      borderRadius: 20,
      backgroundColor: '#10b981',
      zIndex: 1
    },
    gray: {
      backgroundColor: '#aaa'
    },
    red: {
      backgroundColor: colorScheme === 'dark' ? '#d44646' : 'red'
    },
    green: {
      backgroundColor: colorScheme === 'dark' ? '#10b981' : '#10b981'
    },
    historyItemLine: {
      position: 'absolute',
      top: 6,
      left: 4,
      bottom: -26,
      width: 2,
      backgroundColor: '#10b981'
    },
    historyItemLineDashed: {
      position: 'absolute',
      top: 6,
      left: 4,
      bottom: -26,
      width: 2,
      gap: 6,
      overflow: 'hidden',
    },
    dash: {
      width: 2,
      height: 5,
    },
    historyItemTitle: {
      marginBottom: 5,
    },
    historyItemName: {
      fontFamily: 'Manrope_600SemiBold',
      fontSize: 14,
      color: colorScheme === 'dark' ? '#fff' : '#000',
      textTransform: 'capitalize',
    },
    frozenNotice: {
      marginBottom: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#fff",
      // flexDirection: "row",
      // justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#2c3854" : "#e5e7eb",
    },
    frozenNoticeText: {
      fontSize: 12,
      color: colorScheme === "dark" ? "#e5e7eb" : "#111827",
      opacity: 0.5,
      fontFamily: "Manrope_600SemiBold",
      // textAlign:'center',
      // flex:1
    },
    historyItemText: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 14,
      color: colorScheme === 'dark' ? '#888' : '#555'
    },
    historyItemDescription: {
      marginLeft: 15,
      padding: 10,
      borderRadius: 10,
      fontFamily: 'Manrope_500Medium',
      fontSize: 14,
      color: colorScheme === 'dark' ? '#aaa' : '#555',
      backgroundColor: colorScheme === 'dark' ? '#152446' : '#dedede'
    },
    reportDescriptionLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    reportDescriptionText: {
      flex: 1,
      fontFamily: 'Manrope_600SemiBold',
      color: colorScheme === 'dark' ? '#888' : '#555',
    },
    historyItemCTAs: {

    },
    disabledCTA: {
      opacity: 0.5,
    },
    historyItemPrimaryCTA: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5
    },
    historyItemPrimaryCTAText: {
      color: "#10b981",
      fontFamily: 'Manrope_600SemiBold'
    },
    historyItemSubText: {
      marginTop: 6,
      fontSize: 12,
      color: colorScheme === 'dark' ? '#888' : '#555',
      fontFamily: 'Manrope_400Regular'
    },
    typeCTA: {
      borderRadius: 25,
      alignItems: 'center',
      paddingVertical: 5,
      paddingHorizontal: 10,
      justifyContent: 'center',
      backgroundColor: colorScheme === "dark" ? "#131d33" : "#f9f9f9",
    },
    selectedTypeCTA: {
      backgroundColor: colorScheme === "dark" ? "#10b981" : "#10b981",
    },
    typeCTAText: {
      color: '#10b981',
      fontFamily: 'Manrope_600SemiBold'
    },
    selectedTypeCTAText: {
      color: '#fff',
    },
    between: {
      justifyContent: 'space-between'
    },
    tinyCTA: {
      width: 50,
      height: 50,
      borderWidth: 1,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colorScheme === 'dark' ? '#fff' : '#fff',
    },
    chatCTA: {
      width: 35,
      height: 35,
      borderRadius: 20,
      flexDirection: 'row',
      backgroundColor: "#10b981",
      alignItems: 'center',
      justifyContent: 'center',
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
  });
