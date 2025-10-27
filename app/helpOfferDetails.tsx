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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MD3LightTheme as DefaultTheme, Provider as PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Entypo from "@expo/vector-icons/Entypo";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as SecureStore from "expo-secure-store";
import { fetchWithAuth, fetchWithoutAuth, getCurrentUser } from "../src/api";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AntDesign from '@expo/vector-icons/AntDesign';
import BottomSheet, { BottomSheetTextInput, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from 'react-native-gesture-handler';


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
  const colorScheme = useColorScheme();
  const styles = styling(colorScheme);

  const [offer, setOffer] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [bidText, setBidText] = useState("");
  const [bidding, setBidding] = useState(false);
  const [bids, setBids] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('info');

  const [gettingRating, setGettingRating] = useState(false)
  const [ratingsData, setRatingsData] = useState([])
  const [bidMessage, setBidMessage] = useState("")

  const newBidRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%", "85%"], []);


  useFocusEffect(
    useCallback(() => {
      const getUserInfo = async () => {
        try {
          const data = await getCurrentUser();
          if (data.error) {
            console.error("Error", data.error);
          } else {
            await SecureStore.setItem('user', JSON.stringify(data))
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
          const parsed = JSON.parse(data);
          setOffer(parsed);

          // Fetch creator info
          const res = await fetchWithoutAuth(`/users/${parsed.userID}`);
          if (res.ok) {
            const creatorData = await res.json();
            setCreator(creatorData);
          }

          // Fetch bids
          const bidRes = await fetchWithoutAuth(`/helpOffers/${parsed._id}/bids`);
          if (bidRes.ok) {
            const bidData = await bidRes.json();
            setBids(bidData);
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

  const handleSubmitBid = async () => {
    if (!bidText.trim()) return Alert.alert("Missing info", "Please describe your skills and qualifications.");
    try {
      setBidding(true);
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetchWithAuth(`/helpOffers/${offer._id}/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: bidText,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to submit bid");

      Alert.alert("Success", "Your bid was submitted successfully!");
      setBidText("");
      setBids((prev) => [result, ...prev]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not submit bid");
    } finally {
      setBidding(false);
    }
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
    console.log('hiiiii')
    newBidRef.current?.snapToIndex(0);
  };

  const handleCloseModalPress = () => {
    newBidRef.current?.close();
  };

  const handleCreateBid = async () => {
    setBidding(true)
  };

  if (loading)
    return (
      <View style={[styles.appContainer, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#10b981" />
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

          <View style={styles.tabs}>
            <TouchableOpacity onPress={() => { setActiveTab('info') }} style={[styles.tab, activeTab == 'info' && styles.activeTab]}>
              <Text style={styles.tabText}>Info</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setActiveTab('bids') }} style={[styles.tab, activeTab == 'bids' && styles.activeTab]}>
              <Text style={styles.tabText}>Bids</Text>
            </TouchableOpacity>
          </View>
        </View>

        {offer && <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 100 }}>
          {activeTab == "info" && <View>{/* Offer Info */}
            <View style={styles.container}>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.offerDesc}>
                  {typeof offer?.description === "string"
                    ? offer.description
                    : "No description available."}
                </Text>

                <Text style={styles.sectionTitle}>Details</Text>

                <View style={styles.metaData}>
                  <Text style={styles.label}>Type</Text>
                  <Text style={[styles.metaText, { textTransform: 'capitalize' }]}>
                    {typeof offer?.helpType === "string" ? offer.helpType : "N/A"}
                  </Text>
                </View>

                <View style={styles.metaData}>
                  <Text style={styles.label}>Subject</Text>
                  <Text style={[styles.metaText, { textTransform: 'capitalize' }]}>
                    {typeof offer?.subject === "string" ? offer.subject : "N/A"}
                  </Text>
                </View>

                {offer?.type == "offer" && <View style={styles.metaData}>
                  <Text style={styles.label}>Price /hr</Text>
                  {offer?.price ? (
                    <Text style={styles.metaText}>₺{offer.price}</Text>
                  ) : '-'}
                </View>}

                {offer?.type == "seek" && <View style={styles.metaData}>
                  <Text style={styles.label}>Price range /hr</Text>
                  {offer?.priceMin ? (
                    <Text style={styles.metaText}>
                      ₺{offer.priceMin} - ₺{offer?.priceMax ?? 0}
                    </Text>
                  ) : '-'}
                </View>}

                <View style={styles.metaData}>
                  <Text style={styles.label}>Date</Text>
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
                <View style={[styles.row, { alignItems: 'center', gap: 20 }]}>
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: user.photo }} style={styles.avatar} />
                    {/* {uploadingPicture && <ActivityIndicator size="small" color={'#fff'} style={{position:'absolute',top:18,left:18}} />} */}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{user.firstname} {user.lastname}</Text>
                    <View style={[styles.row, { gap: 5 }]}>
                      <AntDesign
                        name="star"
                        size={12}
                        color={colorScheme === "dark" ? "#fbbf24" : "#facc15"}
                      />

                      <Text style={[styles.metaText, { textAlign: 'left' }]}>
                        {ratingsData.totalReviews == 0 ? 'No ratings yet' : ratingsData?.avgRating?.toFixed(1)}
                        ({ratingsData.totalReviews} review{ratingsData.totalReviews != 1 && 's'})
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>}

          {activeTab == "bids" && <View>
            {/* Bidding Section */}
            <View style={styles.container}>
              <Text style={styles.sectionTitle}>Submit Your Bid</Text>
              <View>
                <TouchableOpacity style={styles.submitBtn} onPress={() => { handleNewBid }} disabled={bidding}>
                  {bidding && <ActivityIndicator color="#fff" size="small" />}
                  <Text style={styles.submitBtnText}>{bidding ? "Submitting..." : "Submit Bid"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Existing Bids */}
            <View style={styles.container}>
              <Text style={styles.sectionTitle}>Current Bids</Text>
              {bids.length === 0 ? (
                <Text style={styles.hintText}>No bids yet.</Text>
              ) : (
                bids.map((bid, idx) => (
                  <View key={idx} style={styles.bidCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Image
                        source={
                          bid.user?.profileImage
                            ? { uri: bid.user.profileImage }
                            : require("../assets/images/avatar.jpg")
                        }
                        style={styles.bidUserImage}
                      />
                      <Text style={styles.bidUserName}>{bid.user?.fullName || "Anonymous"}</Text>
                    </View>
                    <Text style={styles.bidMessage}>{bid.message}</Text>

                    {offer?.userID === user?._id && (
                      <TouchableOpacity
                        style={styles.chooseBtn}
                        onPress={() => Alert.alert("Chosen", `${bid.user?.fullName} selected for this offer!`)}
                      >
                        <Text style={styles.chooseBtnText}>Choose This Candidate</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>}
        </ScrollView>}

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
              <Text style={styles.modalTitle}>Filters</Text>
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
                    Bid message
                  </Text>
                  <TextInput
                    style={styles.bidInput}
                    placeholder="Describe your skills, experience, or qualifications for this offer..."
                    placeholderTextColor="#aaa"
                    multiline
                    value={bidText}
                    onChangeText={setBidText}
                  />
                </View>

                <View>
                  <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                    Help Type
                  </Text>
                </View>

                <View>
                  <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                    Price Range
                  </Text>
                </View>

                <View>
                  <TouchableOpacity onPress={() => { handleCreateBid() }} style={styles.modalButton} disabled={bidding}>
                    <Text style={styles.modalButtonText}>Bid now</Text>
                    {bidding && <ActivityIndicator size='small' color={'#fff'} />}
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

const styling = (colorScheme: string) =>
  StyleSheet.create({
    appContainer: {
      flex: 1,
      backgroundColor: colorScheme === "dark" ? "#111827" : "#f4f3e9",
    },
    scrollArea: { flex: 1 },
    statusBar: { backgroundColor: "#10b981", height: Platform.OS === "ios" ? 60 : 25 },
    container: { paddingHorizontal: 20, marginBottom: 20 },
    header: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 0, marginBottom: 20 },
    greenHeader: { backgroundColor: "#10b981", borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
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
      flex: 1
    },

    creatorCard: { flexDirection: "row", alignItems: "center", gap: 15, paddingTop: 10 },
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
      backgroundColor: colorScheme === "dark" ? "#1e293b" : "#fff",
      padding: 15,
      borderRadius: 15,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#334155" : "#eee",
    },
    bidUserImage: { width: 40, height: 40, borderRadius: 50 },
    bidUserName: { color: colorScheme === "dark" ? "#fff" : "#000", fontFamily: "Manrope_600SemiBold" },
    bidMessage: {
      marginTop: 8,
      fontSize: 14,
      color: colorScheme === "dark" ? "#d1d5db" : "#333",
      lineHeight: 20,
    },
    chooseBtn: {
      backgroundColor: "#10b981",
      paddingVertical: 8,
      borderRadius: 15,
      marginTop: 10,
      alignItems: "center",
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
      textTransform: 'capitalize'
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
      backgroundColor: colorScheme === "dark" ? "#131d33" : "#f9f9f9",
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
  });
