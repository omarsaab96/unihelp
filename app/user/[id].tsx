import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Platform, useColorScheme } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchWithAuth, fetchWithoutAuth } from "../../src/api";

export default function PublicUserProfileScreen() {
  const router = useRouter();
  const { id, user: userParam } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const styles = styling(colorScheme, insets);

  const [user, setUser] = useState<any>(() => {
    if (typeof userParam === "string") {
      try {
        return JSON.parse(userParam);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [ratingsData, setRatingsData] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (!id || typeof id !== "string") return;
        try {
          const res = await fetchWithAuth(`/users/${id}`);
          if (res.ok) {
            const data = await res.json();
            setUser(data);
          }
        } catch (err) {
          console.error(err);
        }
        try {
          const res = await fetchWithoutAuth(`/tutors/ratings/${id}`);
          if (res.ok) {
            const data = await res.json();
            setRatingsData(data.data || null);
          }
        } catch (err) {
          console.error(err);
        }
      };
      load();
    }, [id])
  );

  return (
    <View style={styles.appContainer}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <View style={styles.statusBar} />

      <View style={[styles.header, styles.container]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        {user && (
          <View style={[styles.row, { alignItems: "center", gap: 16 }]}>
            <Image
              source={{
                uri:
                  user.photo ||
                  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
              }}
              style={styles.avatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user.firstname} {user.lastname}</Text>
              <View style={[styles.row, { gap: 6 }]}>
                <AntDesign name="star" size={12} color="#facc15" />
                <Text style={styles.metaText}>
                  {ratingsData?.totalReviews
                    ? `${ratingsData.avgRating.toFixed(1)} (${ratingsData.totalReviews} review${ratingsData.totalReviews !== 1 ? "s" : ""})`
                    : "No ratings yet"}
                </Text>
              </View>
              {user.university?.name && <Text style={styles.hint}>{user.university?.name}</Text>}
            </View>
          </View>
        )}
      </View>

      <ScrollView style={styles.container}>
        {user?.bio && (
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.sectionTitle}>About {user.firstname}</Text>
            <Text style={[styles.infoValue, styles.fullInfoValue]}>{user.bio}</Text>
          </View>
        )}

        <View style={{ marginBottom: 20 }}>
          <Text style={styles.sectionTitle}>University Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>University</Text>
            <Text style={styles.infoValue}>{user?.university?.name || "-"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Major</Text>
            <Text style={styles.infoValue}>{user?.major || "-"}</Text>
          </View>
          {user?.minor && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Minor</Text>
              <Text style={styles.infoValue}>{user?.minor || "-"}</Text>
            </View>
          )}
          {user?.gpa && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>GPA</Text>
              <Text style={styles.infoValue}>{user?.gpa || "-"}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styling = (colorScheme: string, insets: any) =>
  StyleSheet.create({
    appContainer: {
      flex: 1,
      backgroundColor: colorScheme === "dark" ? "#111827" : "#f4f3e9",
    },
    statusBar: {
      backgroundColor: "#2563EB",
      height: Platform.OS === "ios" ? 60 : 25,
    },
    container: {
      paddingHorizontal: 20,
    },
    header: {
      backgroundColor: "#2563EB",
      borderBottomLeftRadius: Platform.OS === "ios" ? 60 : 30,
      borderBottomRightRadius: Platform.OS === "ios" ? 60 : 30,
      paddingBottom: 20,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
      marginBottom: 10,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatar: {
      width: 70,
      height: 70,
      borderRadius: 35,
      borderWidth: 2,
      borderColor: "#fff",
      backgroundColor: "#e5e7eb",
    },
    name: {
      fontSize: 20,
      color: "#fff",
      fontFamily: "Manrope_700Bold",
    },
    metaText: {
      color: "#e5e7eb",
      fontSize: 12,
      fontFamily: "Manrope_500Medium",
    },
    hint: {
      color: "#dbeafe",
      fontSize: 12,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 18,
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_700Bold",
      marginBottom: 10,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#fff",
      padding: 12,
      borderRadius: 12,
      marginBottom: 10,
    },
    infoLabel: {
      color: colorScheme === "dark" ? "#9ca3af" : "#6b7280",
      fontFamily: "Manrope_500Medium",
    },
    infoValue: {
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_600SemiBold",
    },
    fullInfoValue: {
      color: colorScheme === "dark" ? "#e5e7eb" : "#111827",
      fontFamily: "Manrope_400Regular",
      lineHeight: 20,
    },
  });
