
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
  Platform,
  Modal,
  Alert,
  ScrollView,
  Share,
  useColorScheme,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { Video } from "expo-av";
import Constants from "expo-constants";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Entypo from "@expo/vector-icons/Entypo";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCurrentUser, fetchWithAuth, fetchWithoutAuth } from "../src/api";


type MediaItem = {
  uri: string;
  type: "image" | "video";
  mime: string;
  name: string;
  isRemote?: boolean;
};

const extra =
  (Constants?.expoConfig?.extra as any) ||
  (Constants as any)?.manifest?.extra ||
  {};

const API_URL =
  extra.API_URL_LIVE ||
  extra.API_URL_STAGE ||
  (Platform.OS === "android" ? extra.API_URL_LOCAL_ANDROID : extra.API_URL_LOCAL_IOS);

const API_ROOT = API_URL?.replace(/\/api\/?$/, "");

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const styles = styling(colorScheme, insets);

  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [content, setContent] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [posting, setPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentPost, setCommentPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSending, setCommentSending] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPost, setEditPost] = useState<any>(null);
  const [editContent, setEditContent] = useState("");
  const [editMedia, setEditMedia] = useState<MediaItem[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const data = await getCurrentUser();
        setUser(data);
        await loadPosts();
      };
      init();
    }, [])
  );

  const toAbsoluteUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("file:")) return url;
    return `${API_ROOT}${url}`;
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const res = await fetchWithoutAuth(`/posts?page=1&limit=20`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setPosts(data);
      } else {
        console.log("Failed to fetch posts", data);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshPosts = async () => {
    try {
      setRefreshing(true);
      const res = await fetchWithoutAuth(`/posts?page=1&limit=20`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setPosts(data);
      }
    } catch (err) {
      console.error("Error refreshing posts:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const uploadFile = async (file: { uri: string; name: string; type: string }) =>
    new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_ROOT}/api/uploads`);

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ ...data, url: toAbsoluteUrl(data.url) });
          } else {
            reject(new Error(data?.message || "Upload failed"));
          }
        } catch (e) {
          reject(new Error("Upload failed"));
        }
      };

      xhr.onerror = () => reject(new Error("Upload failed"));

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(event.loaded / event.total);
        }
      };

      const form = new FormData();
      form.append("file", file as any);
      xhr.send(form);
    });

  const pickImage = async () => {
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
    const asset = result.assets[0];
    setMedia((prev) => [
      ...prev,
      {
        uri: asset.uri,
        type: "image",
        mime: asset.mimeType || "image/jpeg",
        name: asset.fileName || `photo-${Date.now()}.jpg`,
      },
    ]);
  };

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow media access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setMedia((prev) => [
      ...prev,
      {
        uri: asset.uri,
        type: "video",
        mime: asset.mimeType || "video/mp4",
        name: asset.fileName || `video-${Date.now()}.mp4`,
      },
    ]);
  };

  const pickEditImage = async () => {
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
    const asset = result.assets[0];
    setEditMedia((prev) => [
      ...prev,
      {
        uri: asset.uri,
        type: "image",
        mime: asset.mimeType || "image/jpeg",
        name: asset.fileName || `photo-${Date.now()}.jpg`,
      },
    ]);
  };

  const pickEditVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow media access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setEditMedia((prev) => [
      ...prev,
      {
        uri: asset.uri,
        type: "video",
        mime: asset.mimeType || "video/mp4",
        name: asset.fileName || `video-${Date.now()}.mp4`,
      },
    ]);
  };

  const removeMedia = (index: number, listSetter: (items: MediaItem[]) => void, list: MediaItem[]) => {
    const next = list.filter((_, i) => i !== index);
    listSetter(next);
  };

  const buildPostType = (images: string[], videos: string[], text: string) => {
    if (images.length === 0 && videos.length === 0) return "text";
    if (images.length > 0 && videos.length > 0) return "multipleMedia";
    if (images.length > 1 || videos.length > 1) return "multipleMedia";
    if (images.length === 1) return "image";
    return "video";
  };

  const uploadMediaList = async (items: MediaItem[]) => {
    const uploadedImages: string[] = [];
    const uploadedVideos: string[] = [];

    for (const item of items) {
      if (item.isRemote || item.uri.startsWith("http")) {
        if (item.type === "image") uploadedImages.push(item.uri);
        if (item.type === "video") uploadedVideos.push(item.uri);
        continue;
      }
      const uploaded = await uploadFile({
        uri: item.uri,
        name: item.name,
        type: item.mime,
      });
      if (item.type === "image") uploadedImages.push(uploaded.url);
      if (item.type === "video") uploadedVideos.push(uploaded.url);
    }

    return { images: uploadedImages, videos: uploadedVideos };
  };

  const handleCreatePost = async () => {
    if (!content.trim() && media.length === 0) {
      Alert.alert("Empty post", "Add some text or media.");
      return;
    }
    if (!user?._id) return;

    setPosting(true);
    setUploadProgress(null);
    try {
      const mediaPayload = await uploadMediaList(media);
      const type = buildPostType(mediaPayload.images, mediaPayload.videos, content);

      const response = await fetchWithAuth(`/posts`, {
        method: "POST",
        body: JSON.stringify({
          type,
          created_by: user._id,
          content: content.trim(),
          media: mediaPayload,
        }),
      });
      const data = await response.json();
      console.warn(data)
      if (!response.ok) {
        throw new Error(data.message || "Failed to create post");
      }
      setPosts((prev) => [data.post, ...prev]);
      setContent("");
      setMedia([]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create post");
    } finally {
      setPosting(false);
      setUploadProgress(null);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user?._id) return;
    const prevPosts = posts;
    const userId = user._id;

    // optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p._id !== postId) return p;
        const likes = p?.likes || [];
        const hasLiked = likes.some((l: any) => (typeof l === "string" ? l === userId : l?._id === userId));
        const nextLikes = hasLiked
          ? likes.filter((l: any) => (typeof l === "string" ? l !== userId : l?._id !== userId))
          : [...likes, { _id: userId }];
        return { ...p, likes: nextLikes };
      })
    );

    try {
      const response = await fetchWithAuth(`/posts/like/${postId}`, { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        setPosts((prev) =>
          prev.map((p) => (p._id === postId ? { ...p, likes: data.likes } : p))
        );
      } else {
        setPosts(prevPosts);
      }
    } catch (err) {
      console.error("Like error:", err);
      setPosts(prevPosts);
    }
  };

  const openComments = async (post: any) => {
    setCommentPost(post);
    setCommentModalOpen(true);
    setCommentsLoading(true);
    try {
      const res = await fetchWithoutAuth(`/posts/comments/${post._id}`);
      const data = await res.json();
      if (res.ok) {
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error("Comments error:", err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const addComment = async () => {
    if (!commentPost?._id || !commentInput.trim()) return;
    setCommentSending(true);
    try {
      const res = await fetchWithAuth(`/posts/comments/${commentPost._id}`, {
        method: "POST",
        body: JSON.stringify({ content: commentInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments(data.comments || []);
        setCommentInput("");
        setPosts((prev) =>
          prev.map((p) =>
            p._id === commentPost._id ? { ...p, comments: data.comments || p.comments } : p
          )
        );
      }
    } catch (err) {
      console.error("Add comment error:", err);
    } finally {
      setCommentSending(false);
    }
  };

  const handleShare = async (post: any) => {
    try {
      const firstMedia = post?.media?.images?.[0] || post?.media?.videos?.[0];
      await Share.share({
        message: post?.content || "Check this post",
        url: firstMedia ? toAbsoluteUrl(firstMedia) : undefined,
      });
      const res = await fetchWithAuth(`/posts/share/${post._id}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) => (p._id === post._id ? { ...p, shares: data.shares } : p))
        );
      }
    } catch (err) {
      console.error("Share error:", err);
    }
  };

  const openEdit = (post: any) => {
    setEditPost(post);
    setEditContent(post?.content || "");
    const mergedMedia: MediaItem[] = [
      ...(post?.media?.images || []).map((uri: string) => ({
        uri: toAbsoluteUrl(uri),
        type: "image" as const,
        mime: "image/jpeg",
        name: uri.split("/").pop() || "image.jpg",
        isRemote: true,
      })),
      ...(post?.media?.videos || []).map((uri: string) => ({
        uri: toAbsoluteUrl(uri),
        type: "video" as const,
        mime: "video/mp4",
        name: uri.split("/").pop() || "video.mp4",
        isRemote: true,
      })),
    ];
    setEditMedia(mergedMedia);
    setEditModalOpen(true);
  };

  const saveEdit = async () => {
    if (!editPost?._id) return;
    setEditSaving(true);
    setUploadProgress(null);
    try {
      const mediaPayload = await uploadMediaList(editMedia);
      const type = buildPostType(mediaPayload.images, mediaPayload.videos, editContent);

      const res = await fetchWithAuth(`/posts/${editPost._id}`, {
        method: "PUT",
        body: JSON.stringify({
          type,
          content: editContent.trim(),
          media: mediaPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update post");

      setPosts((prev) => prev.map((p) => (p._id === editPost._id ? data.post : p)));
      setEditModalOpen(false);
      setEditPost(null);
      setEditContent("");
      setEditMedia([]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update post");
    } finally {
      setEditSaving(false);
      setUploadProgress(null);
    }
  };

  const formatName = (u: any) => {
    if (!u) return "User";
    if (u.name) return u.name;
    const first = u.firstname || "";
    const last = u.lastname || "";
    return `${first} ${last}`.trim() || "User";
  };

  const renderSkeleton = () => (
    <View style={styles.postCard}>
      <View style={[styles.row, { gap: 10 }]}>
        <View style={styles.skeletonAvatar} />
        <View style={{ flex: 1 }}>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: "40%", marginTop: 6 }]} />
        </View>
      </View>
      <View style={[styles.skeletonLine, { marginTop: 12, width: "90%" }]} />
      <View style={[styles.skeletonLine, { marginTop: 8, width: "70%" }]} />
      <View style={[styles.skeletonMedia, { marginTop: 12 }]} />
    </View>
  );

  const renderPost = ({ item }: { item: any }) => {
    const isOwner = user?._id && item?.created_by?._id === user._id;
    const images = item?.media?.images || [];
    const videos = item?.media?.videos || [];

    return (
      <View style={styles.postCard}>
        <View style={[styles.row, styles.between]}>
          <View style={[styles.row, { gap: 10 }]}>
            <Image
              source={{
                uri: item?.created_by?.photo || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
              }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.postName}>{formatName(item?.created_by)}</Text>
              <Text style={styles.postDate}>
                {item?.date ? new Date(item.date).toLocaleString() : "Just now"}
              </Text>
            </View>
          </View>
          {isOwner && (
            <TouchableOpacity onPress={() => openEdit(item)}>
              <MaterialIcons name="edit" size={20} color={colorScheme === "dark" ? "#fff" : "#111"} />
            </TouchableOpacity>
          )}
        </View>

        {!!item?.content && <Text style={styles.postContent}>{item.content}</Text>}

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
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item._id)}>
            <Ionicons name="heart" size={18} color={colorScheme === "dark" ? "#fff" : "#111"} />
            <Text style={styles.actionText}>{item?.likes?.length || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(item)}>
            <Ionicons name="chatbubble" size={18} color={colorScheme === "dark" ? "#fff" : "#111"} />
            <Text style={styles.actionText}>{item?.comments?.length || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item)}>
            <Ionicons name="share-social" size={18} color={colorScheme === "dark" ? "#fff" : "#111"} />
            <Text style={styles.actionText}>{item?.shares || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const skeletons = useMemo(() => Array.from({ length: 3 }), []);

  return (
    <View style={styles.appContainer}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <View style={styles.statusBar} />

      <FlatList
        data={loading ? skeletons : posts}
        keyExtractor={(item, index) => (loading ? `skeleton-${index}` : item._id)}
        renderItem={loading ? renderSkeleton : renderPost}
        refreshing={refreshing}
        onRefresh={refreshPosts}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.row, styles.between]}>
              <Text style={styles.pageTitle}>Home</Text>
              <View style={[styles.row, { gap: 10 }]}> 
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/notifications")}>
                  <Ionicons name="notifications" size={22} color={colorScheme === "dark" ? "#fff" : "#111"} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/messages")}>
                  <Ionicons name="mail" size={22} color={colorScheme === "dark" ? "#fff" : "#111"} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.composer}>
              <Image
                source={{
                  uri: user?.photo || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
                }}
                style={styles.avatar}
              />
              <TextInput
                style={styles.composerInput}
                placeholder="What's on your mind?"
                placeholderTextColor={colorScheme === "dark" ? "#9ca3af" : "#6b7280"}
                value={content}
                onChangeText={setContent}
                multiline
              />
            </View>

            {media.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                {media.map((item, idx) =>
                  item.type === "image" ? (
                    <View key={`new-img-${idx}`} style={styles.previewWrap}>
                      <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                      <TouchableOpacity
                        style={styles.removeMediaBtn}
                        onPress={() => removeMedia(idx, setMedia, media)}
                      >
                        <MaterialIcons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View key={`new-vid-${idx}`} style={styles.previewWrap}>
                      <Video
                        source={{ uri: item.uri }}
                        style={styles.mediaVideo}
                        useNativeControls
                        resizeMode="cover"
                        isLooping
                      />
                      <TouchableOpacity
                        style={styles.removeMediaBtn}
                        onPress={() => removeMedia(idx, setMedia, media)}
                      >
                        <MaterialIcons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )
                )}
              </ScrollView>
            )}

            {uploadProgress !== null && (
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.max(3, uploadProgress * 100)}%` }]} />
              </View>
            )}

            <View style={[styles.row, { marginTop: 10, gap: 10 }]}>
              <TouchableOpacity style={styles.mediaBtn} onPress={pickImage}>
                <Ionicons name="image" size={18} color="#fff" />
                <Text style={styles.mediaBtnText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaBtn} onPress={pickVideo}>
                <Ionicons name="videocam" size={18} color="#fff" />
                <Text style={styles.mediaBtnText}>Video</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.postBtn, posting && { opacity: 0.7 }]} onPress={handleCreatePost} disabled={posting}>
                {posting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.postBtnText}>Post</Text>}
              </TouchableOpacity>
            </View>
          </View>
        }
        ListFooterComponent={<View style={{ height: 120 }} />}
      />

      <Modal visible={commentModalOpen} animationType="slide" onRequestClose={() => setCommentModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={[styles.row, styles.between]}>
            <Text style={styles.modalTitle}>Comments</Text>
            <TouchableOpacity onPress={() => setCommentModalOpen(false)}>
              <MaterialIcons name="close" size={24} color={colorScheme === "dark" ? "#fff" : "#111"} />
            </TouchableOpacity>
          </View>
          {commentsLoading ? (
            <ActivityIndicator size="small" color={colorScheme === "dark" ? "#fff" : "#111"} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(_, idx) => `comment-${idx}`}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <Image
                    source={{
                      uri: item?.user?.photo || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
                    }}
                    style={styles.commentAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentName}>{formatName(item?.user)}</Text>
                    <Text style={styles.commentText}>{item?.content}</Text>
                  </View>
                </View>
              )}
            />
          )}
          <View style={styles.commentInputWrap}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor={colorScheme === "dark" ? "#9ca3af" : "#6b7280"}
              value={commentInput}
              onChangeText={setCommentInput}
            />
            <TouchableOpacity onPress={addComment} disabled={commentSending}>
              {commentSending ? (
                <ActivityIndicator size="small" color={colorScheme === "dark" ? "#fff" : "#111"} />
              ) : (
                <Ionicons name="send" size={20} color={colorScheme === "dark" ? "#fff" : "#111"} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={editModalOpen} animationType="slide" onRequestClose={() => setEditModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={[styles.row, styles.between]}>
            <Text style={styles.modalTitle}>Edit Post</Text>
            <TouchableOpacity onPress={() => setEditModalOpen(false)}>
              <MaterialIcons name="close" size={24} color={colorScheme === "dark" ? "#fff" : "#111"} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.editInput}
            value={editContent}
            onChangeText={setEditContent}
            placeholder="Update your post..."
            placeholderTextColor={colorScheme === "dark" ? "#9ca3af" : "#6b7280"}
            multiline
          />

          {editMedia.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              {editMedia.map((item, idx) =>
                item.type === "image" ? (
                  <View key={`edit-img-${idx}`} style={styles.previewWrap}>
                    <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                    <TouchableOpacity
                      style={styles.removeMediaBtn}
                      onPress={() => removeMedia(idx, setEditMedia, editMedia)}
                    >
                      <MaterialIcons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View key={`edit-vid-${idx}`} style={styles.previewWrap}>
                    <Video
                      source={{ uri: item.uri }}
                      style={styles.mediaVideo}
                      useNativeControls
                      resizeMode="cover"
                      isLooping
                    />
                    <TouchableOpacity
                      style={styles.removeMediaBtn}
                      onPress={() => removeMedia(idx, setEditMedia, editMedia)}
                    >
                      <MaterialIcons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )
              )}
            </ScrollView>
          )}

          {uploadProgress !== null && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.max(3, uploadProgress * 100)}%` }]} />
            </View>
          )}

          <View style={[styles.row, { marginTop: 10, gap: 10 }]}>
            <TouchableOpacity style={styles.mediaBtn} onPress={pickEditImage}>
              <Ionicons name="image" size={18} color="#fff" />
              <Text style={styles.mediaBtnText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaBtn} onPress={pickEditVideo}>
              <Ionicons name="videocam" size={18} color="#fff" />
              <Text style={styles.mediaBtnText}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.postBtn, editSaving && { opacity: 0.7 }]} onPress={saveEdit} disabled={editSaving}>
              {editSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.postBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View
        style={[
          styles.container,
          styles.SafeAreaPaddingBottom,
          { borderTopWidth: 1, paddingTop: 15, borderTopColor: colorScheme === "dark" ? "#4b4b4b" : "#ddd" },
        ]}
      >
        <View style={[styles.row, { justifyContent: "space-between", gap: 10 }]}>
          <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push("/")}
          >
            <View style={{ alignItems: "center", gap: 2 }}>
              <MaterialIcons name="dashboard" size={22} color={colorScheme === "dark" ? "#fff" : "#000"} />
              <Text style={styles.navBarCTAText}>Dashboard</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push("/students")}>
            <View style={{ alignItems: "center", gap: 2 }}>
              <FontAwesome6 name="people-group" size={22} color={colorScheme === "dark" ? "#fff" : "#000"} />
              <Text style={styles.navBarCTAText}>Students</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push("/home")}>
            <View style={{ alignItems: "center", gap: 2 }}>
              <FontAwesome5 name="home" size={22} color={colorScheme === "dark" ? "#2563EB" : "#2563EB"} />
              <Text style={[styles.navBarCTAText, styles.activeText]}>Home</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push("/offers")}>
            <View style={{ alignItems: "center", gap: 2 }}>
              <MaterialIcons name="local-offer" size={22} color={colorScheme === "dark" ? "#fff" : "#000"} />
              <Text style={styles.navBarCTAText}>Offers</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push("/clubs")}>
            <View style={{ alignItems: "center", gap: 2 }}>
              <Entypo name="sports-club" size={22} color={colorScheme === "dark" ? "#fff" : "#000"} />
              <Text style={styles.navBarCTAText}>Clubs</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
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
    SafeAreaPaddingBottom: {
      paddingBottom: Platform.OS == "ios" ? 40 : 55,
    },
    container: {
      paddingHorizontal: 20,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
    },
    between: {
      justifyContent: "space-between",
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      paddingTop: 10,
    },
    pageTitle: {
      fontSize: 26,
      fontFamily: "Manrope_700Bold",
      color: colorScheme === "dark" ? "#fff" : "#111827",
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#374151" : "#ddd",
      alignItems: "center",
      justifyContent: "center",
    },
    composer: {
      marginTop: 15,
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#fff",
      borderRadius: 16,
      padding: 12,
    },
    composerInput: {
      flex: 1,
      minHeight: 60,
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_400Regular",
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "#d1d5db",
    },
    postBtn: {
      marginLeft: "auto",
      backgroundColor: "#2563EB",
      borderRadius: 10,
      paddingHorizontal: 16,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    postBtnText: {
      color: "#fff",
      fontFamily: "Manrope_600SemiBold",
    },
    mediaBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#111827",
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
    },
    mediaBtnText: {
      color: "#fff",
      fontFamily: "Manrope_600SemiBold",
      fontSize: 12,
    },
    postCard: {
      marginHorizontal: 20,
      marginTop: 15,
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#fff",
      borderRadius: 16,
      padding: 14,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 2,
    },
    postName: {
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_600SemiBold",
    },
    postDate: {
      color: colorScheme === "dark" ? "#9ca3af" : "#6b7280",
      fontSize: 12,
      marginTop: 2,
    },
    postContent: {
      marginTop: 10,
      color: colorScheme === "dark" ? "#e5e7eb" : "#111827",
      fontFamily: "Manrope_400Regular",
    },
    mediaImage: {
      width: 220,
      height: 160,
      borderRadius: 12,
      marginRight: 10,
      backgroundColor: "#e5e7eb",
    },
    mediaVideo: {
      width: 220,
      height: 160,
      borderRadius: 12,
      marginRight: 10,
      backgroundColor: "#111827",
    },
    postActions: {
      marginTop: 12,
      gap: 16,
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    actionText: {
      color: colorScheme === "dark" ? "#e5e7eb" : "#111827",
      fontSize: 12,
    },
    progressBar: {
      height: 6,
      borderRadius: 6,
      backgroundColor: colorScheme === "dark" ? "#374151" : "#e5e7eb",
      marginTop: 10,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: "#2563EB",
    },
    previewWrap: {
      position: "relative",
      marginRight: 10,
    },
    removeMediaBtn: {
      position: "absolute",
      top: 6,
      right: 6,
      backgroundColor: "rgba(0,0,0,0.6)",
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colorScheme === "dark" ? "#111827" : "#f9fafb",
      paddingTop: Platform.OS === "ios" ? insets.top + 10 : 20,
      paddingHorizontal: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: "Manrope_700Bold",
      color: colorScheme === "dark" ? "#fff" : "#111827",
    },
    commentItem: {
      flexDirection: "row",
      gap: 10,
      marginTop: 12,
    },
    commentAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "#d1d5db",
    },
    commentName: {
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_600SemiBold",
    },
    commentText: {
      color: colorScheme === "dark" ? "#e5e7eb" : "#111827",
      marginTop: 2,
      fontFamily: "Manrope_400Regular",
    },
    commentInputWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colorScheme === "dark" ? "#374151" : "#e5e7eb",
    },
    commentInput: {
      flex: 1,
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#fff",
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 42,
      color: colorScheme === "dark" ? "#fff" : "#111827",
    },
    editInput: {
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#fff",
      borderRadius: 12,
      padding: 12,
      color: colorScheme === "dark" ? "#fff" : "#111827",
      minHeight: 120,
      marginTop: 12,
    },
    navbarCTA: {
      flex: 1,
    },
    navBarCTAText: {
      fontSize: 10,
      color: colorScheme === "dark" ? "#fff" : "#000",
    },
    activeText: {
      color: "#2563EB",
    },
    skeletonAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colorScheme === "dark" ? "#374151" : "#e5e7eb",
    },
    skeletonLine: {
      height: 10,
      borderRadius: 6,
      backgroundColor: colorScheme === "dark" ? "#374151" : "#e5e7eb",
      width: "60%",
    },
    skeletonMedia: {
      height: 140,
      borderRadius: 12,
      backgroundColor: colorScheme === "dark" ? "#374151" : "#e5e7eb",
    },
  });
