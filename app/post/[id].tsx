import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Platform,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Video } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { fetchWithoutAuth } from "../../src/api";

const extra =
  (Constants?.expoConfig?.extra as any) ||
  (Constants as any)?.manifest?.extra ||
  {};

const API_URL =
  extra.API_URL_LIVE ||
  extra.API_URL_STAGE ||
  (Platform.OS === "android" ? extra.API_URL_LOCAL_ANDROID : extra.API_URL_LOCAL_IOS);

const API_ROOT = API_URL?.replace(/\/api\/?$/, "");

const toAbsoluteUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("file:")) return url;
  return `${API_ROOT}${url}`;
};

const formatName = (u: any) => {
  if (!u) return "User";
  if (u.name) return u.name;
  const first = u.firstname || u.firstName || "";
  const last = u.lastname || u.lastName || "";
  return `${first} ${last}`.trim() || "User";
};

export default function PostDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const styles = styling(colorScheme, insets);

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (!id || typeof id !== "string") return;
        try {
          setLoading(true);
          const res = await fetchWithoutAuth(`/posts/${id}`);
          const data = await res.json();
          if (res.ok) {
            setPost(data.post);
          } else {
            setPost(null);
          }
        } catch (err) {
          console.error("Post details error:", err);
          setPost(null);
        } finally {
          setLoading(false);
        }
      };

      load();
    }, [id])
  );

  const images = post?.media?.images || [];
  const videos = post?.media?.videos || [];
  const createdBy = post?.created_by;

  return (
    <View style={styles.appContainer}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <View style={styles.statusBar} />

      <View style={[styles.header, styles.container]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={colorScheme === "dark" ? "#fff" : "#111"} style={{ marginTop: 24 }} />
      ) : !post ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Post not found</Text>
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={styles.postCard}>
            <View style={[styles.row, styles.between]}>
              <View style={[styles.row, { gap: 10, flex: 1 }]}>
                <Image
                  source={{
                    uri:
                      createdBy?.photo ||
                      createdBy?.image ||
                      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
                  }}
                  style={styles.avatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.postName}>{formatName(createdBy)}</Text>
                  <Text style={styles.postDate}>
                    {post?.date ? new Date(post.date).toLocaleString() : "Just now"}
                  </Text>
                </View>
              </View>
            </View>

            {!!post?.content && <Text style={styles.postContent}>{post.content}</Text>}

            {(images.length > 0 || videos.length > 0) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                {images.map((img: string, idx: number) => (
                  <Image key={`img-${idx}`} source={{ uri: toAbsoluteUrl(img) }} style={styles.mediaImage} />
                ))}
                {videos.map((vid: string, idx: number) => (
                  <Video
                    key={`vid-${idx}`}
                    source={{ uri: toAbsoluteUrl(vid) }}
                    style={styles.mediaVideo}
                    useNativeControls
                    resizeMode="cover"
                    isLooping
                  />
                ))}
              </ScrollView>
            )}

            <View style={[styles.row, styles.postActions]}>
              <View style={styles.actionBtn}>
                <FontAwesome name="heart-o" size={18} color={colorScheme === "dark" ? "#fff" : "#111"} />
                <Text style={styles.actionText}>{post?.likes?.length || 0}</Text>
              </View>
              <View style={styles.actionBtn}>
                <FontAwesome6 name="message" size={18} color={colorScheme === "dark" ? "#fff" : "#111"} />
                <Text style={styles.actionText}>{post?.comments?.length || 0}</Text>
              </View>
              <View style={styles.actionBtn}>
                <Ionicons name="share-social" size={18} color={colorScheme === "dark" ? "#fff" : "#111"} />
                <Text style={styles.actionText}>{post?.shares || 0}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
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
      marginBottom: 20,
    },
    headerTitle: {
      color: "#fff",
      fontSize: 22,
      fontFamily: "Manrope_700Bold",
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
    between: {
      justifyContent: "space-between",
    },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    emptyText: {
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontSize: 16,
      fontFamily: "Manrope_600SemiBold",
    },
    postCard: {
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#fff",
      borderRadius: 18,
      padding: 14,
      marginBottom: 14,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "#e5e7eb",
    },
    postName: {
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontSize: 15,
      fontFamily: "Manrope_700Bold",
    },
    postDate: {
      color: colorScheme === "dark" ? "#9ca3af" : "#6b7280",
      fontSize: 12,
      marginTop: 2,
      fontFamily: "Manrope_500Medium",
    },
    postContent: {
      color: colorScheme === "dark" ? "#e5e7eb" : "#111827",
      fontSize: 14,
      lineHeight: 22,
      marginTop: 12,
      fontFamily: "Manrope_400Regular",
    },
    mediaImage: {
      width: 240,
      height: 240,
      borderRadius: 14,
      marginRight: 10,
      backgroundColor: "#d1d5db",
    },
    mediaVideo: {
      width: 240,
      height: 240,
      borderRadius: 14,
      marginRight: 10,
      backgroundColor: "#000",
    },
    postActions: {
      justifyContent: "space-around",
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colorScheme === "dark" ? "#374151" : "#e5e7eb",
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    actionText: {
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_600SemiBold",
      fontSize: 13,
    },
  });
