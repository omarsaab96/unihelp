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
import * as SecureStore from "expo-secure-store";
import { fetchWithAuth, fetchWithoutAuth, getCurrentUser } from "../src/api";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AntDesign from '@expo/vector-icons/AntDesign';
import BottomSheet, { BottomSheetTextInput, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

const { width } = Dimensions.get("window");

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#10b981",
  },
};

export default function JobDetailsScreen() {
  const { offerId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  let colorScheme = useColorScheme();
  const styles = styling(colorScheme, insets);

  const [offer, setOffer] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [gettingRating, setGettingRating] = useState(false)
  const [ratingsData, setRatingsData] = useState([])
  const [bidderRatingsData, setBidderRatingsData] = useState([])


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
    const getOffer = async () => {
      if (!offerId) return;
      // console.warn("offerId",offerId)
      try {
        const data = await fetchWithoutAuth(`/helpOffers/${offerId}`);
        const offer = await data.json();
        setOffer(offer);
        console.log("✅ Offer loaded:", offer);
        setLoading(false)
        setJob(user?.helpjobs.find(h => h.offer == offerId))

      } catch (err) {
        console.error("❌ Failed to load offer:", err);
      }
    };

    getOffer();
  }, [offerId]);

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

  const hanldeGoToProfile = (id: string) => {
    console.log(id)
  }

  if (loading)
    return (
      <View style={[styles.appContainer, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );

  return (
    <PaperProvider theme={theme}>
      <View style={styles.appContainer}>
        <StatusBar style="light" />
        <View style={styles.statusBar} />

        {/* HEADER */}
        <View style={[styles.header, styles.greenHeader]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
            <Text style={styles.pageTitle}>{offer?.title || "Offer Details"}</Text>
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

        {offer && <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 100 }}>
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
                <Text style={styles.label}>Status</Text>
                <Text style={[styles.metaText, { textTransform: 'capitalize' }]}>
                  <Text style={[styles.offerDesc, { marginBottom: 0, fontFamily: 'Manrope_600SemiBold' }, job?.completedAt == null && styles.open, offer?.completedAt != null && styles.closed]}>
                    {job?.completedAt == null ? 'On going' : 'Completed'}
                  </Text>
                </Text>
              </View>

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

              <View style={styles.metaData}>
                <Text style={styles.label}>Agreement Price /hr</Text>
                <Text style={styles.metaText}>₺{offer.acceptedBid.amount}</Text>
              </View>

              <View style={styles.metaData}>
                <Text style={styles.label}>Agreement Duration (weeks)</Text>
                <Text style={styles.metaText}>{offer.acceptedBid.duration}</Text>
              </View>

              <View style={styles.metaData}>
                <Text style={styles.label}>Started</Text>
                <Text style={styles.metaText}>{formatDateTime(job?.startedAt)}</Text>
              </View>
              <View style={styles.metaData}>
                <Text style={styles.label}>Finished</Text>
                <Text style={styles.metaText}>{job?.completedAt ? formatDateTime(job?.completedAt) : '-'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.container}>
            <Text style={styles.sectionTitle}>Posted By</Text>

            <View style={[styles.card, styles.creatorCard]}>
              <TouchableOpacity
                style={styles.chooseBtn}
                onPress={() => { hanldeGoToProfile(offer.user._id) }}
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
                        {ratingsData.totalReviews == 0 ? 'No ratings yet' : ratingsData?.avgRating?.toFixed(1)}
                        ({ratingsData.totalReviews} review{ratingsData.totalReviews != 1 && 's'})
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
              {/* <View> */}
              {/* <Text style={[styles.chooseBtnText, { padding: 8 }]}>Check profile</Text> */}
              {/* </TouchableOpacity> */}
              {/* </View> */}
            </View>
          </View>


          {/* ************************* */}
                  {/* get bidder ratings user  */}
                    {/* add buttons to close job */}
          {/* ************************* */}

          <View>
            <View style={styles.container}>
              <Text style={styles.sectionTitle}>Accepted Bidder</Text>
              <View style={[styles.bidCard]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Image
                    source={
                      offer.acceptedBid.user?.photo
                        ? { uri: offer.acceptedBid.user.photo }
                        : require("../assets/images/avatar.jpg")
                    }
                    style={styles.bidUserImage}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10 }}>
                      <Text style={styles.bidUserName}>{offer.acceptedBid.user?.firstname || "Anonymous"} {offer.acceptedBid.user?.lastname || "User"}</Text>
                    </View>

                    <View style={[styles.row, { gap: 5 }]}>
                      <AntDesign
                        name="star"
                        size={12}
                        color={colorScheme === "dark" ? "#fbbf24" : "#facc15"}
                      />

                      <Text style={[styles.metaText, { textAlign: 'left' }]}>
                        {bidderRatingsData.totalReviews == 0 ? 'No ratings yet' : bidderRatingsData?.avgRating?.toFixed(1)}
                        ({bidderRatingsData.totalReviews} review{bidderRatingsData.totalReviews != 1 && 's'})
                      </Text>
                    </View>
                  </View>

                </View>
                {/* <Text style={styles.bidMessage}>{offer.acceptedBid.message}</Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 10
                }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5
                  }}>
                    <Ionicons name="timer-outline" size={20} color="black" />
                    <Text style={styles.bidDuration}>{offer.acceptedBid.duration} week{offer.acceptedBid.duration == 1 ? '' : 's'}</Text>
                  </View>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5
                  }}>
                    <FontAwesome
                      name="money"
                      size={20}
                      color="black" />
                    <Text style={styles.bidAmount}>₺ {offer.acceptedBid.amount}</Text>
                  </View>
                  {offer.acceptedBid.acceptedAt != null && <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 5 }}>
                    <Feather name="check" size={24} color="#10b981" />
                    <Text style={{ fontFamily: 'Marope_600SedmiBold', fontSize: 16, color: '#10b981', textAlign: 'right' }}>Accepted</Text>
                  </View>}
                </View> */}
              </View>
            </View>
          </View>
        </ScrollView>}

      </View>
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
    open: {
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
      flex: 1
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
      marginBottom: 10,
      // borderBottomWidth: 1,
      // borderBottomColor: colorScheme === "dark" ? "#334155" : "#ddd",
      paddingVertical: 10
    },
    bidUserImage: { width: 40, height: 40, borderRadius: 50 },
    bidUserName: {
      fontSize: 16,
      fontFamily: 'Manrope_700Bold',
      lineHeight: 24,
      marginBottom: 5,
      textTransform: 'capitalize'
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
      width: 40,
      height: 40,
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
  });
