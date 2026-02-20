
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Dimensions,
  InteractionManager,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
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
import { localstorage } from "../utils/localStorage";
import Fontisto from '@expo/vector-icons/Fontisto';
import Octicons from '@expo/vector-icons/Octicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';

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
  const [cachedUser, setCachedUser] = useState<any>(null);
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
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [actionSheetPost, setActionSheetPost] = useState<any>(null);

  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const [composerVisible, setComposerVisible] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [composerLayout, setComposerLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const openProgress = useSharedValue(0);
  const expandedHeight = useSharedValue(0);
  const composerRef = useRef<View>(null);
  const composerInputRef = useRef<TextInput>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const data = await getCurrentUser();
        if (data) {
          setUser(data);
          await localstorage.set("user", JSON.stringify(data));
        } else {
          const stored = await localstorage.get("user");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setUser(parsed);
            } catch {
              // ignore parse errors
            }
          }
        }
        await loadPosts();
      };
      init();
    }, [])
  );

  useEffect(() => {
    const loadCachedUser = async () => {
      const stored = await localstorage.get("user");
      if (stored) {
        try {
          setCachedUser(JSON.parse(stored));
        } catch {
          // ignore parse errors
        }
      }
    };
    loadCachedUser();
  }, []);

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

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow media access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setMedia((prev) => [
      ...prev,
      {
        uri: asset.uri,
        type: asset.type === "video" ? "video" : "image",
        mime:
          asset.mimeType ||
          (asset.type === "video" ? "video/mp4" : "image/jpeg"),
        name:
          asset.fileName ||
          `${asset.type === "video" ? "video" : "photo"}-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"
          }`,
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
      if (!response.ok) {
        throw new Error(data.message || "Failed to create post");
      }
      const baseUser = user || cachedUser;
      const createdByRaw = data.post?.created_by;
      const hydratedPost = {
        ...data.post,
        created_by:
          createdByRaw && typeof createdByRaw === "object"
            ? { ...baseUser, ...createdByRaw }
            : {
                _id: baseUser?._id,
                firstname: baseUser?.firstname,
                lastname: baseUser?.lastname,
                name: baseUser?.name,
                photo: baseUser?.photo,
                university: baseUser?.university,
              },
      };
      setPosts((prev) => [hydratedPost, ...prev]);
      setContent("");
      setMedia([]);
      closeComposer();
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

  const openActionSheet = (post: any) => {
    setActionSheetPost(post);
    setActionSheetVisible(true);
  };

  const closeActionSheet = () => {
    setActionSheetVisible(false);
    setActionSheetPost(null);
  };

  const deletePost = async () => {
    if (!actionSheetPost?._id) return;
    try {
      const res = await fetchWithAuth(`/posts/delete/${actionSheetPost._id}`, { method: "PUT" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p._id !== actionSheetPost._id));
        closeActionSheet();
      } else {
        const data = await res.json();
        Alert.alert("Error", data?.message || "Failed to delete post");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to delete post");
    }
  };

  const reportPost = () => {
    closeActionSheet();
    Alert.alert("Reported", "Thanks, we'll review this post.");
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

  const measureComposer = () => {
    if (composerVisible) return;
    if (!composerRef.current) return;
    composerRef.current.measureInWindow((x, y, width, height) => {
      setComposerLayout({ x, y, width, height });
    });
  };

  const openComposer = () => {
    if (!composerRef.current) return;
    measureComposer();
    setComposerVisible(true);
    setComposerExpanded(true);
    openProgress.value = 0;
    openProgress.value = withTiming(1, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  };

  const closeComposer = () => {
    openProgress.value = withTiming(
      0,
      { duration: 200, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(setComposerExpanded)(false);
          runOnJS(setComposerVisible)(false);
        }
      }
    );
  };

  useEffect(() => {
    if (!composerVisible) return;
    const task = InteractionManager.runAfterInteractions(() => {
      composerInputRef.current?.focus();
    });
    const timer = setTimeout(() => {
      composerInputRef.current?.focus();
    }, 300);
    return () => {
      // @ts-ignore
      task?.cancel?.();
      clearTimeout(timer);
    };
  }, [composerVisible]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
    const baseUser = user || cachedUser;
    const createdByRaw = item?.created_by;
    const createdBy =
      createdByRaw && typeof createdByRaw === "object"
        ? { ...baseUser, ...createdByRaw }
        : baseUser;
    const images = item?.media?.images || [];
    const videos = item?.media?.videos || [];
    const hasLiked = user?._id
      ? (item?.likes || []).some((l: any) =>
          typeof l === "string" ? l === user._id : l?._id === user._id
        )
      : false;
    const openUserProfile = (u: any) => {
      const userId = typeof u === "string" ? u : u?._id;
      if (!userId) return;
      router.push({
        pathname: "/user/[id]",
        params: { id: userId, user: typeof u === "object" ? JSON.stringify(u) : undefined },
      });
    };

    return (
      <View style={styles.postCard}>
        <View style={[styles.row, styles.between]}>
          <TouchableOpacity
            style={[styles.row, { gap: 10 }]}
            onPress={() => openUserProfile(item?.created_by)}
            activeOpacity={0.8}
          >
            <Image
              source={{
                uri:
                  createdBy?.photo ||
                  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
              }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.postName}>{formatName(createdBy)}</Text>
              <Text style={styles.postDate}>
                {item?.date ? new Date(item.date).toLocaleString() : "Just now"}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openActionSheet(item)}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colorScheme === "dark" ? "#fff" : "#111"} />
          </TouchableOpacity>
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
            <FontAwesome
              name={hasLiked ? "heart" : "heart-o"}
              size={18}
              color={hasLiked ? "#ef4444" : colorScheme === "dark" ? "#fff" : "#111"}
            />
            <Text style={styles.actionText}>{item?.likes?.length || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(item)}>
            <FontAwesome6 name="message" size={18} color={colorScheme === "dark" ? "#fff" : "#111"} />
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
  const screen = Dimensions.get("window");
  const horizontalPad = 16;
  const verticalPad = 16;
  const targetWidth = Math.max(0, screen.width - composerLayout.x - horizontalPad);
  const maxHeight = Math.max(0, screen.height - composerLayout.y - verticalPad);
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(openProgress.value, [0, 1], [0, 0.55]),
  }));
  const animatedCardStyle = useAnimatedStyle(() => ({
    top: composerLayout.y + (Platform.OS === "ios" ? 60 : 25),
    left: composerLayout.x,
    width: interpolate(openProgress.value, [0, 1], [composerLayout.width || 0, targetWidth]),
    height: interpolate(
      openProgress.value,
      [0, 1],
      [
        composerLayout.height || 0,
        expandedHeight.value > 0 ? expandedHeight.value : maxHeight,
      ]
    ),
    borderRadius: interpolate(openProgress.value, [0, 1], [16, 16]),
  }));

  return (
    <View style={styles.appContainer}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.statusBar}></View>

      <FlatList
        data={loading ? skeletons : posts}
        keyExtractor={(item, index) => (loading ? `skeleton-${index}` : item._id)}
        renderItem={loading ? renderSkeleton : renderPost}
        refreshing={refreshing}
        onRefresh={refreshPosts}
        scrollEnabled={!composerVisible}
        ListHeaderComponent={
          <View style={[styles.header, styles.container]}>
            <View style={[styles.paddedHeader, styles.row, styles.between, { marginBottom: 30 }]}>
              <Image style={styles.minimalLogo} source={colorScheme === 'dark' ? require('../assets/images/minimalLogo_white.png') : require('../assets/images/minimalLogo_black.png')} />
              <View style={[styles.row, { gap: 10 }]}>
                <TouchableOpacity style={[styles.tinyCTA, unreadNotificationsCount > 0 && { position: 'relative' }]} onPress={() => router.push('/support')}>
                  <MaterialCommunityIcons name="face-agent" size={30} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tinyCTA, unreadNotificationsCount > 0 && { position: 'relative' }]} onPress={() => router.push('/notifications')}>
                  <Fontisto name="bell" size={24} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                  {unreadNotificationsCount > 0 && <View style={{ position: 'absolute', top: -2, right: -2, paddingHorizontal: 5, backgroundColor: '#f62f2f', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Manrope_500Medium', fontWeight: 'bold' }}>{unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}</Text>
                  </View>}
                </TouchableOpacity>
                {true && <TouchableOpacity style={styles.tinyCTA} onPress={() => router.push('/messages')}>
                  <Octicons name="mail" size={24} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                </TouchableOpacity>}
                {/* <TouchableOpacity style={styles.tinyCTA} onPress={() => router.push('/schedule')}>
                                <FontAwesome name="calendar" size={22} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                            </TouchableOpacity> */}
                <TouchableOpacity style={styles.tinyCTA} onPress={() => router.push('/profile')}>
                  <View style={{ alignItems: 'center', gap: 2 }}>
                    <View style={[styles.tinyCTA, styles.profileCTA]}>
                      {user && <Image style={styles.profileImage} source={{ uri: user.photo }} />}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {user && (
              <View
                ref={composerRef}
                onLayout={measureComposer}
                style={[composerExpanded && { opacity: 0 }]}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.composerShell}
                  onPress={openComposer}
                >
                  <View style={styles.composerTopRow}>
                    <Image
                      source={{
                        uri:
                          user?.photo ||
                          "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
                      }}
                      style={styles.avatar}
                    />
                    <TextInput
                      style={styles.composerInlineInput}
                      placeholder="Create a post..."
                      placeholderTextColor={colorScheme === "dark" ? "#9ca3af" : "#6b7280"}
                      editable={false}
                      pointerEvents="none"
                    />
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        ListFooterComponent={<View style={{ height: 120 }} />}
      />

      <Modal
        visible={composerVisible}
        transparent
        animationType="none"
        onRequestClose={closeComposer}
      >
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }, overlayStyle]}
          />
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeComposer} />
          <Animated.View style={[styles.composerOverlay, styles.composerShell, animatedCardStyle]}>
            <View
              onLayout={(event) => {
                const nextHeight = Math.min(event.nativeEvent.layout.height, maxHeight);
                if (nextHeight > 0) {
                  expandedHeight.value = withTiming(nextHeight, {
                    duration: 220,
                    easing: Easing.out(Easing.cubic),
                  });
                }
              }}
            >
              <View style={styles.composerTopRow}>
                <Image
                  source={{
                    uri:
                      user?.photo ||
                      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
                  }}
                  style={styles.avatar}
                />
                <TextInput
                  ref={composerInputRef}
                  style={styles.composerInlineInput}
                  placeholder="What's on your mind?"
                  placeholderTextColor={colorScheme === "dark" ? "#9ca3af" : "#6b7280"}
                  value={content}
                  onChangeText={setContent}
                  multiline
                />
              </View>

              <View style={styles.composerBody}>
                <View style={styles.composerDivider} />
                <TouchableOpacity style={styles.addMediaBtn} onPress={pickMedia}>
                  <Ionicons name="add-circle-outline" size={20} color={colorScheme === "dark" ? "#fff" : "#111"} />
                  <Text style={styles.addMediaText}>Add media</Text>
                </TouchableOpacity>

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

                <View style={[styles.row, { marginTop: 16, gap: 10, justifyContent: "flex-end" }]}>
                  <TouchableOpacity onPress={closeComposer} style={styles.ghostBtn}>
                    <Text style={styles.ghostBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.postBtn, posting && { opacity: 0.7 }]}
                    onPress={handleCreatePost}
                    disabled={posting}
                  >
                    {posting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.postBtnText}>Save</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={commentModalOpen} animationType="slide" onRequestClose={() => setCommentModalOpen(false)}>
        <KeyboardAvoidingView
          style={[styles.modalContainer, keyboardVisible && { paddingBottom: 0 }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
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
              style={{ flex: 1, marginTop: 12 }}
              keyboardShouldPersistTaps="handled"
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
              ListEmptyComponent={
                <View style={{ paddingVertical: 20, alignItems: "center" }}>
                  <Text style={styles.commentEmptyText}>No comments yet</Text>
                </View>
              }
            />
          )}
          <View style={styles.commentInputWrap}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor={colorScheme === "dark" ? "#9ca3af" : "#6b7280"}
              value={commentInput}
              onChangeText={setCommentInput}
              onSubmitEditing={addComment}
              returnKeyType="send"
            />
            <TouchableOpacity onPress={addComment} disabled={commentSending}>
              {commentSending ? (
                <ActivityIndicator size="small" color={colorScheme === "dark" ? "#fff" : "#111"} />
              ) : (
                <Ionicons name="send" size={20} color={colorScheme === "dark" ? "#fff" : "#111"} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow:0, marginTop: 10 }}>
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

      <Modal visible={actionSheetVisible} transparent animationType="fade" onRequestClose={closeActionSheet}>
        <View style={styles.actionSheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeActionSheet} />
          <View style={styles.actionSheet}>
            {actionSheetPost && user?._id && actionSheetPost?.created_by?._id === user._id ? (
              <>
                <TouchableOpacity style={styles.actionSheetItem} onPress={() => { closeActionSheet(); openEdit(actionSheetPost); }}>
                  <Text style={styles.actionSheetText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionSheetItem} onPress={deletePost}>
                  <Text style={[styles.actionSheetText, styles.destructiveText]}>Delete</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.actionSheetItem} onPress={reportPost}>
                <Text style={[styles.actionSheetText, styles.destructiveText]}>Report</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionSheetItem, styles.actionSheetCancel]} onPress={closeActionSheet}>
              <Text style={styles.actionSheetText}>Cancel</Text>
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
      // paddingBottom: 20,
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
    composerShell: {
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#fff",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#263241" : "#e5e7eb",
      overflow: "hidden",
    },
    composerOverlay: {
      position: "absolute",
      paddingHorizontal: 0,
    },
    composerTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
    },
    composerInlineInput: {
      flex: 1,
      minHeight: 40,
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_400Regular",
      fontSize: 16,
      textAlignVertical: "top",
      paddingTop: 6,
    },
    addMediaBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 8,
    },
    addMediaText: {
      color: colorScheme === "dark" ? "#e5e7eb" : "#111827",
      fontFamily: "Manrope_600SemiBold",
      fontSize: 14,
    },
    composerBody: {
      paddingHorizontal: 14,
      paddingBottom: 14,
    },
    composerDivider: {
      height: 1,
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#e5e7eb",
      marginBottom: 10,
    },
    ghostBtn: {
      height: 40,
      paddingHorizontal: 12,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#374151" : "#d1d5db",
    },
    ghostBtnText: {
      color: colorScheme === "dark" ? "#e5e7eb" : "#111827",
      fontFamily: "Manrope_600SemiBold",
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
      marginTop: 15,
      gap: 16,
      justifyContent:'space-between'
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
      paddingTop:insets.top + 20,
      paddingHorizontal: 20,
      paddingBottom: insets.bottom ,
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
    commentEmptyText: {
      color: colorScheme === "dark" ? "#9ca3af" : "#6b7280",
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
    actionSheetOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end",
    },
    actionSheet: {
      backgroundColor: colorScheme === "dark" ? "#111827" : "#fff",
      paddingBottom: insets.bottom + 10,
      paddingTop: 10,
      paddingHorizontal: 16,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    actionSheetItem: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === "dark" ? "#1f2937" : "#e5e7eb",
    },
    actionSheetCancel: {
      borderBottomWidth: 0,
      marginTop: 4,
    },
    actionSheetText: {
      fontSize: 16,
      fontFamily: "Manrope_600SemiBold",
      color: colorScheme === "dark" ? "#fff" : "#111827",
      textAlign: "center",
    },
    destructiveText: {
      color: "#ef4444",
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
      verticalAlign:'top'
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
    paddedHeader: {
      paddingTop: 20,
      marginBottom: 20
    },
    greeting: {
      fontSize: 32,
      color: colorScheme === 'dark' ? '#fff' : "#000",
      lineHeight: 44
    },
    hint: {
      fontSize: 16,
      color: '#2563EB',
    },
    minimalLogo: {
      width: 50,
      height: 50,
      objectFit: 'contain'
    },
    tinyCTA: {
      width: 50,
      height: 50,
      borderWidth: 1,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colorScheme === 'dark' ? '#fff' : '#aaa',
    },
    fullCTA: {
      borderRadius: 25,
      paddingVertical: 15,
      paddingHorizontal: 10,
      backgroundColor: '#2563EB'
    },
    profileCTA: {
      width: 40,
      height: 40,
      borderWidth: 0,
      overflow: 'hidden'
    },
    profileImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    },
  });
