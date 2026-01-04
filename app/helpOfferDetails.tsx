import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
  useColorScheme,
  Dimensions,
  Alert,
  Keyboard
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
import {
  addNegotiation,
  removeBidderFromNegotiation,
  removeOfferNegotiation
} from "../utils/negotiations";

const { width } = Dimensions.get("window");

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#10b981",
  },
};

export default function HelpOfferDetailsScreen() {
  const { data } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  let colorScheme = useColorScheme();
  const styles = styling(colorScheme, insets);

  const [offer, setOffer] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [bidText, setBidText] = useState("");
  const [bidDuration, setBidDuration] = useState<Number | null>(null);
  const [bidAmount, setBidAmount] = useState<Number | null>(null);
  const [bidding, setBidding] = useState(false);
  const [bids, setBids] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('info');
  const [closing, setClosing] = useState(false)

  const [gettingRating, setGettingRating] = useState(false)
  const [ratingsData, setRatingsData] = useState([])
  const [bidMessage, setBidMessage] = useState("")

  const newBidRef = useRef<BottomSheet>(null);
  const closeOfferRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["60%", "85%"], []);
  const closeOfferSnapPoints = useMemo(() => ["35%"], []);

  useFocusEffect(
    useCallback(() => {
      const getUserInfo = async () => {
        try {
          const data = await getCurrentUser();
          if (data.error) {
            console.error("Error", data.error);
          } else {
            await localstorage.set('user', JSON.stringify(data))
            setUser(data)
          }

          getUserRating(data._id)
        } catch (err) {
          console.error("Error", err.message);
        }
      }
      getUserInfo()
    }, [])
  );

  const getUserRating = async (id) => {
    setGettingRating(true);
    try {
      const res = await fetchWithoutAuth(`/tutors/ratings/${id}`);

      if (res.ok) {
        const data = await res.json();
        setRatingsData(data.data);
      }


    } catch (err) {
      console.error(err);
    } finally {
      setGettingRating(false);

    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const me = await getCurrentUser();
        setUser(me);

        if (data) {
          const resp = await fetchWithoutAuth(`/helpOffers/${data}`);
          if (resp.ok) {
            const offerResp = await resp.json();
            setOffer(offerResp);

            // Fetch bids
            const bidRes = await fetchWithoutAuth(`/helpOffers/${data}/bids`);
            if (bidRes.ok) {
              const bidData = await bidRes.json();
              setBids(bidData);
            }
          }
        }
      } catch (err) {
        console.error("Error loading offer details:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [data]);

  const formatDate = (date: any) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Invalid date";

    return d.toLocaleString("en-US", {
      // weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (date: any) => {
    if (!date) return "";
    const d = new Date(date); // ✅ handle strings or Date objects
    if (isNaN(d.getTime())) return "Invalid date";

    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleNewBid = () => {
    newBidRef.current?.snapToIndex(0);
  };

  const handleCloseOffer = () => {
    closeOfferRef.current?.snapToIndex(0);
  };

  const handleCloseModalPress = () => {
    newBidRef.current?.close();
    closeOfferRef.current?.close();
    Keyboard.dismiss();
  };

  const handleConfirmCloseOffer = async () => {
    setClosing(true)
    try {
      const token = await localstorage.get("accessToken");
      const res = await fetchWithAuth(`/helpOffers/${offer?._id}/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }
      });

      const result = await res.json();

      if (res.ok) {
        newBidRef.current?.close();
        closeOfferRef.current?.close();
        Keyboard.dismiss();
        setOffer(result.data);
        await removeOfferNegotiation(offer._id);

      } else {
        console.error("Failed to close offer:", result);
        Alert.alert("Error", result.error || "Failed to close offer");
      }

    } catch (error) {
      console.error("Error closing offer:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setClosing(false)
    }
  };

  const handleCreateBid = async () => {
    if (offer?.type == 'seek' && (!bidText.trim() || !bidAmount)) {
      return Alert.alert("Missing info", "Please fill all fields.");
    }

    if (offer?.type == 'offer' && (!bidText.trim())) {
      return Alert.alert("Missing info", "Please fill all fields.");
    }

    try {
      setBidding(true);
      const token = await localstorage.get("accessToken");
      const res = await fetchWithAuth(`/helpOffers/${offer?._id}/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: bidText,
          // duration: bidDuration,
          amount: offer?.type == 'seek' ? bidAmount : offer?.price
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to submit bid");

      setBidText("");
      setBidDuration(null);
      setBidAmount(null);
      Keyboard.dismiss();
      handleCloseModalPress();
      setBids((prev) => [result, ...prev]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not submit bid");
    } finally {
      setBidding(false);
    }
  };

  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.substring(1, str.length);
  }

  const handleGoToChat = async (bid: any) => {
    try {
      if (offer?.user._id === user?._id) {
        await addNegotiation(offer._id, bid.user._id);
      }

      router.push({
        pathname: "/chat",
        params: {
          userId: user?._id,
          receiverId: bid.user._id,
          name: `${bid.user.firstname} ${bid.user.lastname}`,
          avatar: bid.user.photo,
        },
      });
    } catch (err) {
      console.error("Failed to save negotiation", err);
    }
  }

  const handleChoose = async (bidId: string) => {
    if (offer?.type == 'seek') {
      Alert.alert("Confirm", "Are you sure you want to choose this candidate?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              const token = await localstorage.get("accessToken");
              const res = await fetchWithAuth(`/helpOffers/${offer?._id}/bids/${bidId}/accept`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              });

              const result = await res.json();
              if (!res.ok) throw new Error(result.message || "Failed to choose candidate");

              // Alert.alert("Success", "Candidate has been chosen!");
              setOffer((prev) => ({ ...prev, closedAt: result.closedoffer?.closedAt }));
              setBids((prev) =>
                prev.map((b) =>
                  b._id === bidId ? { ...b, acceptedAt: result.acceptedBid.acceptedAt } : b
                )
              );
              await removeOfferNegotiation(offer._id);
              // router.push({
              //   pathname: "/chat",
              //   params: {
              //     userId: user?._id,
              //     receiverId: result.acceptedBid.user._id,
              //     name: result.acceptedBid.user.firstname + " " + result.acceptedBid.user.lastname,
              //     avatar: result.acceptedBid.user.photo
              //   },
              // });
              router.push("/")
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]);
      
    }

    if (offer?.type == 'offer') {
      Alert.alert("Confirm", "Are you sure you want to accept this request?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              const token = await localstorage.get("accessToken");
              const res = await fetchWithAuth(`/helpOffers/${offer?._id}/bids/${bidId}/accept`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              });

              const result = await res.json();
              if (!res.ok) throw new Error(result.message || "Failed to accept request");

              // Alert.alert("Success", "Request has been accepted!");
              setBids((prev) =>
                prev.map((b) =>
                  b._id === bidId ? { ...b, acceptedAt: result.acceptedBid.acceptedAt } : b
                )
              );
              router.push({
                pathname: "/chat",
                params: {
                  userId: user?._id,
                  receiverId: result.acceptedBid.user._id,
                  name: result.acceptedBid.user.firstname + " " + result.acceptedBid.user.lastname,
                  avatar: result.acceptedBid.user.photo
                },
              });
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]);
    }
  };

  const handleReject = async (bidId: string) => {
    if (offer?.type == 'offer') {
      Alert.alert("Confirm", "Are you sure you want to reject this request?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              const token = await localstorage.get("accessToken");
              const res = await fetchWithAuth(`/helpOffers/${offer?._id}/bids/${bidId}/reject`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              });

              const result = await res.json();
              if (!res.ok) throw new Error(result.message || "Failed to reject request");

              // Alert.alert("Success", "Request has been accepted!");
              setBids((prev) =>
                prev.map((b) =>
                  b._id === bidId ? { ...b, rejectedAt: result.rejectedBid.rejectedAt } : b
                )
              );
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]);
    }

    if (offer?.type == 'seek') {
      Alert.alert("Confirm", "Are you sure you want to reject this bid?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              const token = await localstorage.get("accessToken");
              const res = await fetchWithAuth(`/helpOffers/${offer?._id}/bids/${bidId}/reject`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              });

              const result = await res.json();
              if (!res.ok) throw new Error(result.message || "Failed to reject request");

              // Alert.alert("Success", "Request has been accepted!");
              setBids((prev) =>
                prev.map((b) =>
                  b._id === bidId ? { ...b, rejectedAt: result.rejectedBid.rejectedAt } : b
                )
              );

              await removeBidderFromNegotiation(
                offer._id,
                result.rejectedBid.user._id
              );
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]);

    }
  };

  const hanldeGoToProfile = (id: string) => {
    console.log(id)
  }

  if (loading || !offer)
    return (
      <View style={[styles.appContainer, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="small" color="#10b981" />
      </View>
    );

  return (
    <PaperProvider theme={theme}>
      <GestureHandlerRootView style={styles.appContainer}>
        <StatusBar style="light" />
        <View style={styles.statusBar} />

        {/* HEADER */}
        <View style={[styles.header, styles.greenHeader]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
            <Text style={styles.pageTitle}>{offer?.title || "Offer Details"}</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <View style={styles.tabs}>
              <TouchableOpacity onPress={() => { setActiveTab('info') }} style={[styles.tab, activeTab == 'info' && styles.activeTab]}>
                <Text style={styles.tabText}>Info</Text>
              </TouchableOpacity>

              {offer?.type == 'seek' && <TouchableOpacity onPress={() => { setActiveTab('bids') }} style={[styles.tab, activeTab == 'bids' && styles.activeTab]}>
                <Text style={styles.tabText}>Bids</Text>
              </TouchableOpacity>}

              {offer?.type == 'offer' && <TouchableOpacity onPress={() => { setActiveTab('requests') }} style={[styles.tab, activeTab == 'requests' && styles.activeTab]}>
                <Text style={styles.tabText}>Requests</Text>
              </TouchableOpacity>}
            </View>
          </View>

        </View>

        {offer && <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 100 }}>
          {activeTab == "info" && <View>{/* Offer Info */}
            <View style={styles.container}>
              <View style={styles.card}>

                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.offerDesc}>
                  {typeof offer?.description === "string"
                    ? offer?.description
                    : "No description available."}
                </Text>

                <Text style={styles.sectionTitle}>Details</Text>

                <View style={styles.metaData}>
                  <Text style={styles.label}>Type</Text>
                  <Text style={[styles.metaText, { textTransform: 'capitalize' }]}>
                    {typeof offer?.helpType === "string" ? offer?.helpType : "N/A"}
                  </Text>
                </View>

                <View style={styles.metaData}>
                  <Text style={styles.label}>Subject</Text>
                  <Text style={[styles.metaText, { textTransform: 'capitalize' }]}>
                    {typeof offer?.subject === "string" ? offer?.subject : "N/A"}
                  </Text>
                </View>

                {offer?.type == "offer" && <View style={styles.metaData}>
                  <Text style={styles.label}>Price</Text>
                  {offer?.price ? (
                    <Text style={styles.metaText}>₺{offer?.price}</Text>
                  ) : '-'}
                </View>}

                {offer?.type == "seek" && <View style={styles.metaData}>
                  <Text style={styles.label}>Expected duration</Text>
                  <Text style={styles.metaText}>
                    {offer?.duration} hours
                  </Text>
                </View>}

                {offer?.type == "seek" && <View style={styles.metaData}>
                  <Text style={styles.label}>Expected Deadline</Text>
                  <Text style={styles.metaText}>
                    {formatDate(offer?.expectedSubmissionDate)}
                  </Text>
                </View>}

                {offer?.type == "seek" && <View style={styles.metaData}>
                  <Text style={styles.label}>Budget range</Text>
                  {offer?.priceMin ? (
                    <Text style={styles.metaText}>
                      {offer?.priceMin} - {offer?.priceMax ?? 0} ₺/hr
                    </Text>
                  ) : '-'}
                </View>}

                <View style={styles.metaData}>
                  <Text style={styles.label}>Posted</Text>
                  <Text style={styles.metaText}>{formatDateTime(offer?.createdAt)}</Text>
                </View>
                <View style={styles.metaData}>
                  <Text style={styles.label}>Last updated</Text>
                  <Text style={styles.metaText}>{formatDateTime(offer?.updatedAt)}</Text>
                </View>
              </View>
            </View>

            {/* Creator Info */}
            <View style={styles.container}>
              <Text style={styles.sectionTitle}>Posted By</Text>
              <View style={[styles.card, styles.creatorCard]}>
                <TouchableOpacity
                  onPress={() => { hanldeGoToProfile(offer?.user._id) }}
                >
                  <View style={[styles.row, { alignItems: 'center', gap: 20 }]}>
                    <>
                      <View style={{ position: 'relative' }}>
                        <Image source={{ uri: offer?.user.photo }} style={styles.avatar} />
                        {/* {uploadingPicture && <ActivityIndicator size="small" color={'#fff'} style={{position:'absolute',top:18,left:18}} />} */}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{offer?.user.firstname} {offer?.user.lastname}</Text>
                        <View style={[styles.row, { gap: 5 }]}>
                          <AntDesign
                            name="star"
                            size={12}
                            color={colorScheme === "dark" ? "#fbbf24" : "#facc15"}
                          />

                          <Text style={[styles.metaText, { textAlign: 'left' }]}>
                            {offer?.user.reviews == 0 ? 'No ratings yet' : offer?.user.rating?.toFixed(1)}
                            ({offer?.user.reviews} review{offer?.user.review != 1 && 's'})
                          </Text>
                        </View>
                      </View>
                    </>
                    <View>
                      <Feather name="arrow-right-circle" size={24} color="#10b981" />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>}

          {(activeTab == "bids" && offer?.type == 'seek') && <View>
            <View style={styles.container}>
              <Text style={styles.sectionTitle}>Current Bids ({bids.length})</Text>
              {bids.length === 0 ? (
                <Text style={styles.hintText}>No bids yet.</Text>
              ) : (
                bids.map((bid, idx) => (
                  <View key={idx} style={[styles.bidCard]}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                      <Image
                        source={
                          bid.user?.photo
                            ? { uri: bid.user.photo }
                            : require("../assets/images/avatar.jpg")
                        }
                        style={styles.bidUserImage}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10 }}>
                          <Text style={styles.bidUserName}>{bid.user?.firstname || "Anonymous"} {bid.user?.lastname || "User"}</Text>
                          <Text style={[styles.bidDate, { textAlign: 'right' }]}>{formatDateTime(bid.createdAt)}</Text>
                        </View>

                        <View style={[styles.row, { gap: 5 }]}>
                          <AntDesign
                            name="star"
                            size={14}
                            color={colorScheme === "dark" ? "#fbbf24" : "#facc15"}
                          />
                          <Text style={[styles.metaText, { flex: 0 }]}>
                            {bid.user.reviews == 0 ? "No ratings yet" : bid.user.rating.toFixed(1)}
                          </Text>
                          <Text style={[styles.metaText, { flex: 0 }]}>
                            ({bid.user.reviews} review{bid.user.reviews == 1 ? '' : 's'})
                          </Text>
                        </View>
                      </View>

                    </View>
                    <Text style={styles.bidMessage}>{bid.message}</Text>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 10
                    }}>
                      {/* <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 5
                      }}>
                        <Ionicons name="timer-outline" size={20} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                        <Text style={styles.bidDuration}>{bid.duration} hour{bid.duration == 1 ? '' : 's'}</Text>
                      </View> */}
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 5
                      }}>
                        <FontAwesome
                          name="money"
                          size={20}
                          color={colorScheme === 'dark' ? '#fff' : '#000'} />
                        <Text style={styles.bidAmount}>₺ {bid.amount}</Text>
                      </View>
                      {bid.acceptedAt != null && <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 5 }}>
                        <Feather name="check" size={24} color="#10b981" />
                        <Text style={{ fontFamily: 'Marope_600SedmiBold', fontSize: 16, color: '#10b981', textAlign: 'right' }}>Accepted</Text>
                      </View>}
                      {bid.rejectedAt != null && <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 5 }}>
                        <Feather name="x" size={24} color="#f85151" />
                        <Text style={{ fontFamily: 'Marope_600SedmiBold', fontSize: 16, color: '#f85151', textAlign: 'right' }}>Rejected</Text>
                      </View>}
                    </View>
                    {offer?.user._id === user?._id && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        {offer?.closedAt == null && bid.acceptedAt == null && bid.rejectedAt == null && <TouchableOpacity
                          style={styles.chooseBtn}
                          onPress={() => handleGoToChat(bid)}
                        >
                          <Text style={styles.chooseBtnText}>Chat</Text>
                        </TouchableOpacity>}

                        {offer?.closedAt == null && bid.acceptedAt == null && bid.rejectedAt == null && <TouchableOpacity
                          style={styles.chooseBtn}
                          onPress={() => handleReject(bid._id)}
                        >
                          <Text style={styles.chooseBtnText}>Reject</Text>
                        </TouchableOpacity>}

                        {offer?.closedAt == null && bid.acceptedAt == null && bid.rejectedAt == null && <TouchableOpacity
                          style={styles.chooseBtn}
                          onPress={() => { handleChoose(bid._id) }}
                        >
                          <Text style={styles.chooseBtnText}>Choose</Text>
                        </TouchableOpacity>}
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>}

          {(activeTab == "requests" && offer?.type == 'offer') && <View>
            <View style={styles.container}>
              <Text style={styles.sectionTitle}>Current Requests ({bids.length})</Text>
              {bids.length === 0 ? (
                <Text style={styles.hintText}>No requests yet.</Text>
              ) : (
                bids.map((bid, idx) => (
                  <View key={idx} style={[styles.bidCard]}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                      <Image
                        source={
                          bid.user?.photo
                            ? { uri: bid.user.photo }
                            : require("../assets/images/avatar.jpg")
                        }
                        style={styles.bidUserImage}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10 }}>
                          <Text style={styles.bidUserName}>{bid.user?.firstname || "Anonymous"} {bid.user?.lastname || "User"}</Text>
                          <Text style={[styles.bidDate, { textAlign: 'right' }]}>{formatDateTime(bid.createdAt)}</Text>
                        </View>

                        <View style={[styles.row, { gap: 5 }]}>
                          <AntDesign
                            name="star"
                            size={14}
                            color={colorScheme === "dark" ? "#fbbf24" : "#facc15"}
                          />
                          <Text style={[styles.metaText, { flex: 0 }]}>
                            {bid.user.reviews == 0 ? "No ratings yet" : bid.user.rating.toFixed(1)}
                          </Text>
                          <Text style={[styles.metaText, { flex: 0 }]}>
                            ({bid.user.reviews} review{bid.user.reviews == 1 ? '' : 's'})
                          </Text>
                        </View>
                      </View>

                    </View>
                    <Text style={styles.bidMessage}>{bid.message}</Text>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 10
                    }}>
                      {/* <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 5
                      }}>
                        <Ionicons name="timer-outline" size={20} color={colorScheme == 'dark' ? '#fff' : '#000'} />
                        <Text style={styles.bidDuration}>{bid.duration} hour{bid.duration == 1 ? '' : 's'}</Text>
                      </View> */}
                      {/* <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 5
                      }}>
                        <FontAwesome
                          name="money"
                          size={20}
                          color="black" />
                        <Text style={styles.bidAmount}>₺ {bid.amount}</Text>
                      </View> */}
                      {bid.acceptedAt != null && <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 5 }}>
                        <Feather name="check" size={24} color="#10b981" />
                        <Text style={{ fontFamily: 'Marope_600SedmiBold', fontSize: 16, color: '#10b981', textAlign: 'right' }}>Accepted</Text>
                      </View>}
                      {bid.rejectedAt != null && <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 5 }}>
                        <Feather name="x" size={24} color="#f85151" />
                        <Text style={{ fontFamily: 'Marope_600SedmiBold', fontSize: 16, color: '#f85151', textAlign: 'right' }}>Rejected</Text>
                      </View>}
                    </View>
                    {offer?.user._id === user?._id && bid.acceptedAt == null && bid.rejectedAt == null && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 }}>
                        {/* <TouchableOpacity
                          style={styles.chooseBtn}
                          onPress={() => hanldeGoToProfile(bid.user._id)}
                        >
                          <Text style={styles.chooseBtnText}>More about {capitalize(bid.user.firstname)}</Text>
                        </TouchableOpacity> */}
                        {offer?.closedAt == null && <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => { handleReject(bid._id) }}
                        >
                          <Text style={styles.chooseBtnText}>Reject this Request</Text>
                        </TouchableOpacity>}
                        {offer?.closedAt == null && <TouchableOpacity
                          style={styles.chooseBtn}
                          onPress={() => { handleChoose(bid._id) }}
                        >
                          <Text style={styles.chooseBtnText}>Accept this Request</Text>
                        </TouchableOpacity>}

                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>}
        </ScrollView>}

        {offer && <View style={styles.container}>
          <View style={{ paddingBottom: insets.bottom }}>
            {user._id !== offer?.user._id &&
              !offer?.closedAt &&
              !bids.some(b => b.user?._id === user._id) &&
              <TouchableOpacity style={styles.submitBtn} onPress={() => { handleNewBid() }} disabled={bidding}>
                <MaterialIcons name="how-to-vote" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>
                  {offer?.type == 'seek' ? 'Place your bid on offer' : 'Ask for help'}
                </Text>
                {bidding && <ActivityIndicator color="#fff" size="small" />}
              </TouchableOpacity>}

            {user._id !== offer?.user._id &&
              !offer?.closedAt &&
              bids.some(b => b.user?._id === user._id) &&
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#888' }]} onPress={() => { }} disabled={true}>
                <Text style={styles.submitBtnText}>
                  {offer?.type == 'seek' ? 'You have already placed a bid on this offer' : 'You have already sent a request on this offer'}
                </Text>
                {bidding && <ActivityIndicator color="#fff" size="small" />}
              </TouchableOpacity>}

            {user._id == offer?.user._id && offer?.closedAt == null &&
              <TouchableOpacity style={styles.submitBtn} onPress={() => { handleCloseOffer() }} disabled={bidding}>
                <AntDesign name="close-circle" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Close offer</Text>
              </TouchableOpacity>}
          </View>
        </View>}

        <BottomSheet
          ref={newBidRef}
          index={-1}
          snapPoints={snapPoints}
          enableDynamicSizing={false}
          enablePanDownToClose={true}
          backgroundStyle={styles.modal}
          handleIndicatorStyle={styles.modalHandle}
          backdropComponent={props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
        >
          <BottomSheetView>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{offer?.type == 'seek' ? 'New Bid' : 'New Help Request'}</Text>
              <TouchableOpacity style={styles.modalClose} onPress={handleCloseModalPress} >
                <Ionicons name="close" size={24} color={colorScheme === 'dark' ? '#374567' : '#888'} />
              </TouchableOpacity>
            </View>

            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ gap: 15 }}>
                <View>
                  <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                    {offer?.type == 'seek' ? 'Bid message' : 'Request message'}
                  </Text>
                  <BottomSheetTextInput
                    style={styles.bidInput}
                    placeholder={offer?.type == 'seek' ?
                      'Describe your skills, experience, or qualifications for this offer?...' :
                      'Describe how would you benefit from this help offer'}
                    placeholderTextColor="#aaa"
                    multiline
                    selectionColor='#10b981'
                    value={bidText}
                    onChangeText={setBidText}
                  />
                </View>

                {/* <View>
                  <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                    {offer?.type == 'seek' ? 'Bid Duration (in hours)' : 'Request duration'}
                  </Text>
                  <View style={[styles.filterInputWithPrefix, { flex: 1, flexDirection: 'row', gap: 15, alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }]}>
                    <BottomSheetTextInput
                      placeholder="4"
                      placeholderTextColor="#aaa"
                      style={[styles.bidInput, { minHeight: 0, flex: 1, marginBottom: 0 }]}
                      value={bidDuration}
                      onChangeText={setBidDuration}
                      selectionColor='#10b981'
                      keyboardType="numeric"
                    />
                    <Text style={styles.filterInputWithSuffixText}>Hour{parseInt(bidDuration) == 1 ? '' : 's'}</Text>
                  </View>
                </View> */}

                {offer?.type == 'seek' && <View>
                  <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                    Bidding price
                  </Text>
                  <View style={[styles.filterInputWithPrefix, { paddingLeft: 20, flexDirection: 'row', gap: 15, alignItems: 'center' }]}>
                    <Text style={styles.filterInputWithPrefixText}>₺</Text>
                    <BottomSheetTextInput
                      placeholder="1000"
                      placeholderTextColor="#aaa"
                      style={[styles.filterInput, { flex: 1, paddingLeft: 0, minHeight: 40, textAlignVertical: "top", marginBottom: 0 }]}
                      value={bidAmount}
                      onChangeText={setBidAmount}
                      selectionColor='#10b981'
                      keyboardType="numeric"
                    />
                  </View>
                </View>}

                <View>
                  <TouchableOpacity onPress={() => { handleCreateBid() }} style={styles.modalButton} disabled={bidding}>
                    <Text style={styles.modalButtonText}>
                      {offer?.type == 'seek' ? (
                        bidding ? 'Bidding' : 'Bid now'
                      ) : (
                        bidding ? 'Sending' : 'Send request'
                      )}
                    </Text>
                    {bidding && <ActivityIndicator size='small' color={'#fff'} />}
                  </TouchableOpacity>
                </View>
              </View>
            </BottomSheetScrollView>
          </BottomSheetView>
        </BottomSheet>

        <BottomSheet
          ref={closeOfferRef}
          index={-1}
          snapPoints={closeOfferSnapPoints}
          enableDynamicSizing={false}
          enablePanDownToClose={true}
          backgroundStyle={styles.modal}
          handleIndicatorStyle={styles.modalHandle}
          backdropComponent={props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
        >
          <BottomSheetView>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Close offer</Text>
              <TouchableOpacity style={styles.modalClose} onPress={handleCloseModalPress} >
                <Ionicons name="close" size={24} color={colorScheme === 'dark' ? '#374567' : '#888'} />
              </TouchableOpacity>
            </View>

            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ gap: 15 }}>
                <View>
                  <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                    Are you sure you want to close this offer?
                  </Text>

                </View>

                <View>
                  <TouchableOpacity onPress={() => { handleCloseModalPress() }} style={[styles.modalButton, styles.gray]}>
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { handleConfirmCloseOffer() }} style={styles.modalButton} disabled={closing}>
                    <Text style={styles.modalButtonText}>Yes, mark this offer as closed</Text>
                    {closing && <ActivityIndicator size='small' color={'#fff'} />}
                  </TouchableOpacity>
                </View>
              </View>
            </BottomSheetScrollView>
          </BottomSheetView>
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
    backBtn: { flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 20 },
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
      color: '#71f7ca',
      borderWidth: 1,
      borderColor: '#71f7ca',
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
    creatorImage: { width: 60, height: 60, borderRadius: 50, backgroundColor: "#ddd" },
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
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === "dark" ? "#334155" : "#ddd",
      paddingVertical: 10
    },
    bidUserImage: { width: 40, height: 40, borderRadius: 50 },
    bidUserName: { color: colorScheme === "dark" ? "#fff" : "#000", fontFamily: "Manrope_600SemiBold", textTransform: 'capitalize' },
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
      backgroundColor: "#10b981",
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 30,
      marginTop: 10,
      alignItems: "center",
      flex: 1
    },
    rejectBtn: {
      backgroundColor: "#888",
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 30,
      marginTop: 10,
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
      width: 60,
      height: 60,
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
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 15,
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
      paddingVertical: 10
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
      backgroundColor: colorScheme === "dark" ? "#1e293b" : "#fff",
      borderRadius: 10,
    },
    filterInputWithPrefixText: {
      color: colorScheme === 'dark' ? '#fff' : '#000',
      fontFamily: 'Manrope_400Regular',
      fontSize: 18
    },
    filterInputWithSuffixText: {
      color: colorScheme === 'dark' ? '#fff' : '#000',
      fontFamily: 'Manrope_400Regular',
      fontSize: 14,
      paddingRight: 20
    },
    gray: {
      backgroundColor: '#aaa'
    },
  });
