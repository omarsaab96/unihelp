import React, { useState, useEffect } from "react";
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
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Offer Info */}
          <View style={styles.container}>
            <Text style={styles.sectionTitle}>📘 Offer Information</Text>
            <View style={styles.card}>
              <Text style={styles.offerTitle}>{offer.title}</Text>
              <Text style={styles.offerDesc}>{offer.description}</Text>

              <View style={styles.offerMeta}>
                <Text style={styles.metaText}>Type: {offer.helpType}</Text>
                {offer.price && <Text style={styles.metaText}>Rate: ₺{offer.price}/hr</Text>}
                {offer.priceMin && (
                  <Text style={styles.metaText}>
                    Rate Range: ₺{offer.priceMin} - ₺{offer.priceMax}/hr
                  </Text>
                )}
                <Text style={styles.metaText}>Subject: {offer.subject}</Text>
              </View>
            </View>
          </View>

          {/* Creator Info */}
          <View style={styles.container}>
            <Text style={styles.sectionTitle}>👤 Created By</Text>
            <View style={[styles.card, styles.creatorCard]}>
              <Image
                source={
                  creator?.profileImage
                    ? { uri: creator.profileImage }
                    : require("../assets/images/avatar.jpg")
                }
                style={styles.creatorImage}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.creatorName}>{creator?.fullName || "Unknown User"}</Text>
                <Text style={styles.creatorRole}>{creator?.email}</Text>
              </View>
            </View>
          </View>

          {/* Bidding Section */}
          <View style={styles.container}>
            <Text style={styles.sectionTitle}>📝 Submit Your Bid</Text>
            {offer?.userID === user?._id ? (
              <Text style={styles.hintText}>You are the creator of this offer. You can view bids below.</Text>
            ) : (
              <View>
                <TextInput
                  style={styles.bidInput}
                  placeholder="Describe your skills, experience, or qualifications for this offer..."
                  placeholderTextColor="#aaa"
                  multiline
                  value={bidText}
                  onChangeText={setBidText}
                />
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitBid} disabled={bidding}>
                  {bidding && <ActivityIndicator color="#fff" size="small" />}
                  <Text style={styles.submitBtnText}>{bidding ? "Submitting..." : "Submit Bid"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Existing Bids */}
          <View style={styles.container}>
            <Text style={styles.sectionTitle}>💬 Current Bids</Text>
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
        </ScrollView>

        {/* NAVBAR */}
        <View
          style={[
            styles.container,
            styles.SafeAreaPaddingBottom,
            {
              borderTopWidth: 1,
              paddingTop: 15,
              borderTopColor: colorScheme === "dark" ? "#4b4b4b" : "#ddd",
            },
          ]}
        >
          <View style={[styles.row, { justifyContent: "space-between", gap: 10 }]}>
            <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push("/")}>
              <View style={{ alignItems: "center", gap: 2 }}>
                <MaterialIcons name="dashboard" size={22} color="#000" />
                <Text style={styles.navBarCTAText}>Dashboard</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push("/offers")}>
              <View style={{ alignItems: "center", gap: 2 }}>
                <Entypo name="price-tag" size={22} color="#10b981" />
                <Text style={[styles.navBarCTAText, styles.activeText]}>Offers</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    header: { paddingHorizontal: 20, paddingVertical: 20 },
    greenHeader: { backgroundColor: "#10b981", borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    backBtn: { flexDirection: "row", alignItems: "center", gap: 10 },
    pageTitle: { fontSize: 22, color: "#fff", fontFamily: "Manrope_700Bold" },

    card: {
      backgroundColor: colorScheme === "dark" ? "#1e293b" : "#fff",
      padding: 20,
      borderRadius: 20,
      elevation: 3,
    },
    offerTitle: { fontSize: 20, fontFamily: "Manrope_700Bold", color: colorScheme === "dark" ? "#fff" : "#000" },
    offerDesc: {
      fontSize: 15,
      marginTop: 10,
      lineHeight: 22,
      color: colorScheme === "dark" ? "#d1d5db" : "#333",
    },
    offerMeta: { marginTop: 15, gap: 5 },
    metaText: { color: colorScheme === "dark" ? "#9ca3af" : "#555", fontFamily: "Manrope_500Medium" },

    sectionTitle: {
      fontSize: 18,
      fontFamily: "Manrope_700Bold",
      color: colorScheme === "dark" ? "#fff" : "#000",
      marginBottom: 10,
    },

    creatorCard: { flexDirection: "row", alignItems: "center", gap: 15 },
    creatorImage: { width: 60, height: 60, borderRadius: 50, backgroundColor: "#ddd" },
    creatorName: { fontSize: 16, fontFamily: "Manrope_600SemiBold", color: colorScheme === "dark" ? "#fff" : "#000" },
    creatorRole: { fontSize: 13, color: colorScheme === "dark" ? "#aaa" : "#555" },

    bidInput: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "#10b981",
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
  });
