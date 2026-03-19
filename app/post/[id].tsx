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
  TextInput,
  Alert,
  KeyboardAvoidingView,
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
import { fetchWithoutAuth, fetchWithAuth, getCurrentUser } from "../../src/api";

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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentInput, setCommentInput] = useState("");
  const [commentSending, setCommentSending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (!id || typeof id !== "string") return;
        try {
          setLoading(true);
          const currentUser = await getCurrentUser();
          if (currentUser && !currentUser.error) {
            setUser(currentUser);
          }
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
  const comments = post?.comments || [];

  const addComment = async () => {
    if (!id || typeof id !== "string" || !commentInput.trim()) return;
    setCommentSending(true);
    try {
      const res = await fetchWithAuth(`/posts/comments/${id}`, {
        method: "POST",
        body: JSON.stringify({ content: commentInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to add comment");
      }
      setPost((prev: any) => ({ ...prev, comments: data.comments || [] }));
      setCommentInput("");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to add comment");
    } finally {
      setCommentSending(false);
    }
  };

  return (
    <View style={styles.appContainer}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <View style={styles.statusBar} />

      <View style={[styles.header, styles.container]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/home')}>
            <MaterialIcons name="arrow-back" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
            <Text style={styles.headerTitle}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={colorScheme === "dark" ? "#fff" : "#111"} style={{ marginTop: 24 }} />
      ) : !post ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Post not found</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
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

            <View style={styles.commentsCard}>
              <Text style={styles.sectionTitle}>{post?.comments?.length} Comment{post?.comments?.length == 1 ? '' : 's'}</Text>

              <View style={styles.commentInputWrap}>
                <Image
                  source={{
                    uri:
                      user?.photo ||
                      user?.image ||
                      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
                  }}
                  style={[styles.commentAvatar, { width: 44, height: 44 }]}
                />
                <View style={styles.newCommentWrapper}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Write a comment..."
                    placeholderTextColor={colorScheme === "dark" ? "#9ca3af" : "#6b7280"}
                    value={commentInput}
                    onChangeText={setCommentInput}
                    onSubmitEditing={addComment}
                    returnKeyType="send"
                    multiline
                  />
                </View>

                <TouchableOpacity style={styles.commentSend} onPress={addComment} disabled={commentSending}>
                  {commentSending ? (
                    <ActivityIndicator size="small" color={colorScheme === "dark" ? "#fff" : "#111"} />
                  ) : (
                    <Ionicons name="send" size={20} color={colorScheme === "dark" ? "#fff" : "#111"} />
                  )}
                </TouchableOpacity>
              </View>

              {comments.length === 0 ? (
                <Text style={styles.commentEmptyText}>No comments yet</Text>
              ) : (
                comments.map((item: any, index: number) => (
                  <View key={`comment-${item?._id || index}`} style={styles.commentItem}>
                    <Image
                      source={{
                        uri:
                          item?.user?.photo ||
                          item?.user?.image ||
                          "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
                      }}
                      style={styles.commentAvatar}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.commentName}>{formatName(item?.user)}</Text>
                        <Text style={styles.commentDate}>
                          {item?.date ? new Date(item.date).toLocaleString() : "Just now"}
                        </Text>
                      </View>

                      <Text style={styles.commentText}>{item?.content}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>


          </ScrollView>
        </KeyboardAvoidingView>
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
      backgroundColor: colorScheme === "dark" ? "#111827" : "#f4f3e9",
      height: Platform.OS === "ios" ? 60 : 25,
    },
    container: {
      paddingHorizontal: 20,
    },
    header: {
      // paddingHorizontal: 20,
      marginBottom: 20,
      paddingTop: 10,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    headerTitle: {
      fontSize: 26,
      fontFamily: "Manrope_700Bold",
      color: colorScheme === "dark" ? "#fff" : "#111827",
    },
    backBtn: {
      alignItems: "center",
      flexDirection:'row',
      gap:10
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
    commentsCard: {
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#fff",
      borderRadius: 18,
      padding: 14,
      marginBottom: 14,
    },
    sectionTitle: {
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontSize: 16,
      marginBottom: 12,
      fontFamily: "Manrope_700Bold",
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
    commentItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 14,
    },
    commentAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#d1d5db",
    },
    commentName: {
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_700Bold",
      marginBottom: 4,
    },
    commentText: {
      color: colorScheme === "dark" ? "#e5e7eb" : "#111827",
      fontFamily: "Manrope_400Regular",
      lineHeight: 20,
    },
    commentDate: {
      color: colorScheme === "dark" ? "#9ca3af" : "#6b7280",
      fontFamily: "Manrope_500Medium",
      fontSize: 12,
      marginBottom: 4,
    },
    commentEmptyText: {
      color: colorScheme === "dark" ? "#9ca3af" : "#6b7280",
      fontFamily: "Manrope_500Medium",
    },
    commentInputWrap: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 20,
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#fff",
      marginBottom: 10,
      paddingBottom:10,
      borderBottomWidth: 1,
      borderBottomColor:colorScheme === "dark" ? "#111827" : "#f4f3e9",
    },
    newCommentWrapper: {
      flex: 1,
      // borderWidth: 1,
      paddingTop:5
    },
    commentInput: {
      maxHeight: 120,
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_400Regular",
    },
    commentSend: {
      // borderWidth: 1,
      // padding: 8,
      flexDirection:'row',
      justifyContent:'flex-end',
      width:30,
      height:30,
      marginTop:8
    }
  });
