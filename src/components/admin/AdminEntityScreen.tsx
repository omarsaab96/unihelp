import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { fetchWithAuth, getCurrentUser, inviteUser } from "../../api";
import { localstorage } from "../../../utils/localStorage";

type EntityType = "users" | "universities" | "sponsors" | "helpOffers";

type FieldConfig = {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
  secureTextEntry?: boolean;
};

const FALLBACK_AVATAR =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png";

const entityConfig: Record<
  EntityType,
  {
    title: string;
    singular: string;
    accent: string;
    loadPath: string;
    fields: FieldConfig[];
  }
> = {
  users: {
    title: "Users",
    singular: "user",
    accent: "#2563eb",
    loadPath: "/users",
    fields: [
      { key: "firstname", label: "First name", placeholder: "Alex" },
      { key: "lastname", label: "Last name", placeholder: "Thompson" },
      { key: "email", label: "Email", placeholder: "alex@example.com", keyboardType: "email-address" },
      { key: "role", label: "Role", placeholder: "student" },
      { key: "photo", label: "Photo URL", placeholder: "https://..." },
      { key: "bio", label: "Bio", placeholder: "Short bio", multiline: true },
    ],
  },
  universities: {
    title: "Universities",
    singular: "university",
    accent: "#0f766e",
    loadPath: "/universities",
    fields: [
      { key: "name", label: "Name", placeholder: "University name" },
      { key: "domain", label: "Domain", placeholder: "university.edu" },
      { key: "photo", label: "Photo URL", placeholder: "https://..." },
      { key: "cover", label: "Cover URL", placeholder: "https://..." },
      { key: "description", label: "Description", placeholder: "About this university", multiline: true },
    ],
  },
  sponsors: {
    title: "Sponsors",
    singular: "sponsor",
    accent: "#dc2626",
    loadPath: "/sponsors",
    fields: [
      { key: "name", label: "Name", placeholder: "Sponsor name" },
      { key: "category", label: "Category", placeholder: "Food, Tech, etc." },
      { key: "logo", label: "Logo URL", placeholder: "https://..." },
      { key: "website", label: "Website", placeholder: "https://..." },
      { key: "description", label: "Description", placeholder: "Sponsor details", multiline: true },
      { key: "contactinfo.phone", label: "Phone", placeholder: "+123456789" },
      { key: "contactinfo.whatsapp", label: "WhatsApp", placeholder: "+123456789" },
      { key: "contactinfo.facebook", label: "Facebook", placeholder: "facebook page" },
      { key: "contactinfo.instagram", label: "Instagram", placeholder: "@instagram" },
    ],
  },
  helpOffers: {
    title: "Help Offers",
    singular: "help offer",
    accent: "#10b981",
    loadPath: "/helpOffers?page=1&limit=100",
    fields: [
      { key: "type", label: "Type", placeholder: "seek or offer" },
      { key: "helpType", label: "Help type", placeholder: "tutoring" },
      { key: "subject", label: "Subject", placeholder: "Mathematics" },
      { key: "title", label: "Title", placeholder: "Need help with calculus" },
      { key: "description", label: "Description", placeholder: "Describe the offer", multiline: true },
      { key: "skills", label: "Skills", placeholder: "React, Java, Algebra" },
      { key: "price", label: "Price", placeholder: "20", keyboardType: "numeric" },
      { key: "priceMin", label: "Min price", placeholder: "10", keyboardType: "numeric" },
      { key: "priceMax", label: "Max price", placeholder: "30", keyboardType: "numeric" },
    ],
  },
};

const emptyForms: Record<EntityType, any> = {
  users: {
    firstname: "",
    lastname: "",
    email: "",
    role: "student",
    photo: "",
    bio: "",
  },
  universities: {
    name: "",
    domain: "",
    photo: "",
    cover: "",
    description: "",
  },
  sponsors: {
    name: "",
    category: "",
    logo: "",
    website: "",
    description: "",
    contactinfo: {
      phone: "",
      whatsapp: "",
      facebook: "",
      instagram: "",
    },
  },
  helpOffers: {
    type: "seek",
    helpType: "",
    subject: "",
    title: "",
    description: "",
    skills: "",
    price: "",
    priceMin: "",
    priceMax: "",
  },
};

const getByPath = (obj: any, path: string) =>
  path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);

const setByPath = (obj: any, path: string, value: any) => {
  const keys = path.split(".");
  const next = { ...obj };
  let cursor = next;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
      return;
    }
    cursor[key] = { ...(cursor[key] || {}) };
    cursor = cursor[key];
  });

  return next;
};

const deepClone = (value: any) => JSON.parse(JSON.stringify(value));

const normalizeListResponse = (entity: EntityType, data: any) => {
  if (Array.isArray(data?.data)) return data.data;
  if (entity === "sponsors" || entity === "helpOffers") {
    if (Array.isArray(data?.data)) return data.data;
  }
  return Array.isArray(data) ? data : [];
};

const normalizePayload = (entity: EntityType, form: any) => {
  if (entity === "helpOffers") {
    return {
      ...form,
      price: form.price === "" ? undefined : Number(form.price),
      priceMin: form.priceMin === "" ? undefined : Number(form.priceMin),
      priceMax: form.priceMax === "" ? undefined : Number(form.priceMax),
    };
  }
  return form;
};

const pickId = (item: any) => item?._id || item?.id;

const pickName = (entity: EntityType, item: any) => {
  if (entity === "users") {
    return `${item?.firstname || ""} ${item?.lastname || ""}`.trim() || item?.email || "User";
  }
  if (entity === "universities") return item?.name || "University";
  if (entity === "sponsors") return item?.name || "Sponsor";
  return item?.title || item?.subject || "Help offer";
};

const pickSubtitle = (entity: EntityType, item: any) => {
  if (entity === "users") return item?.email || item?.role || "";
  if (entity === "universities") return item?.domain || item?.description || "";
  if (entity === "sponsors") return item?.category || item?.website || "";
  return `${item?.type || ""} ${item?.helpType ? `• ${item.helpType}` : ""}`.trim();
};

const pickImage = (entity: EntityType, item: any) => {
  if (entity === "users") return item?.photo || FALLBACK_AVATAR;
  if (entity === "universities") return item?.photo || FALLBACK_AVATAR;
  if (entity === "sponsors") return item?.logo || FALLBACK_AVATAR;
  return item?.user?.photo || FALLBACK_AVATAR;
};

const pickDescription = (entity: EntityType, item: any) => {
  if (entity === "users") return item?.bio || item?.university?.name || "No additional details";
  if (entity === "universities") return item?.description || "No description";
  if (entity === "sponsors") return item?.description || "No description";
  return item?.description || "No description";
};

const pickMeta = (entity: EntityType, item: any) => {
  const blocked = item?.blocked || item?.isBlocked;
  const deleted = item?.deleted || item?.isDeleted || item?.deletedAt;

  if (entity === "helpOffers") {
    if (item?.jobReport?.active) return "Reported";
    if (item?.jobReport?.resolvedAt) return "Report resolved";
    if (item?.closedAt) return "Closed";
    if (deleted) return "Soft deleted";
    if (blocked) return "Blocked";
    return item?.price ? `Price: ${item.price}` : "Active";
  }

  if (deleted) return "Soft deleted";
  if (blocked) return "Blocked";
  return "Active";
};

async function tryRequest(
  candidates: Array<{ path: string; options: any }>,
  successCodes: number[] = [200, 201]
) {
  let lastError: any = null;

  for (const candidate of candidates) {
    try {
      const res = await fetchWithAuth(candidate.path, candidate.options);
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (successCodes.includes(res.status) || res.ok) {
        return { res, data };
      }

      lastError = new Error(data?.message || `Request failed for ${candidate.path}`);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error("Request failed");
}

export default function AdminEntityScreen({ entity }: { entity: EntityType }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const styles = styling(colorScheme, insets, entityConfig[entity].accent);

  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [actionItem, setActionItem] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const [form, setForm] = useState<any>(deepClone(emptyForms[entity]));
  const [resolutionMode, setResolutionMode] = useState<"normal" | "split" | "noPayment">("normal");
  const [splitPayerAmount, setSplitPayerAmount] = useState("");
  const [splitBeneficiaryAmount, setSplitBeneficiaryAmount] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");

  const config = entityConfig[entity];

  const loadCurrentUser = useCallback(async () => {
    const data = await getCurrentUser();
    if (data) {
      await localstorage.set("user", JSON.stringify(data));
      setUser(data);
    }
  }, []);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(config.loadPath);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `Failed to load ${config.title.toLowerCase()}`);
      }
      setItems(normalizeListResponse(entity, data));
    } catch (err: any) {
      Alert.alert("Error", err?.message || `Failed to load ${config.title.toLowerCase()}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [config.loadPath, config.title, entity]);

  useFocusEffect(
    useCallback(() => {
      loadCurrentUser();
      loadItems();
    }, [loadCurrentUser, loadItems])
  );

  useEffect(() => {
    if (!formVisible) {
      setForm(deepClone(emptyForms[entity]));
      setEditingItem(null);
    }
  }, [entity, formVisible]);

  useEffect(() => {
    setResolutionMode("normal");
    setSplitPayerAmount("");
    setSplitBeneficiaryAmount("");
    setResolutionNote("");
  }, [actionItem?._id]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => {
      const text = [
        pickName(entity, item),
        pickSubtitle(entity, item),
        pickDescription(entity, item),
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [entity, items, search]);

  const openCreate = () => {
    setEditingItem(null);
    setForm(deepClone(emptyForms[entity]));
    setFormVisible(true);
  };

  const openEdit = (item: any) => {
    let next = deepClone(emptyForms[entity]);
    config.fields.forEach((field) => {
      const value = getByPath(item, field.key);
      if (value != null) {
        next = setByPath(next, field.key, String(value));
      }
    });
    setForm(next);
    setEditingItem(item);
    setActionItem(null);
    setFormVisible(true);
  };

  const saveItem = async () => {
    try {
      setSaving(true);
      const payload = normalizePayload(entity, form);

      if (entity === "users" && !editingItem) {
        const data = await inviteUser({
          firstname: payload.firstname,
          lastname: payload.lastname,
          email: payload.email,
          role: payload.role || "student",
          photo: payload.photo,
          bio: payload.bio,
        });

        if (data?.error) {
          throw new Error(data?.error || data?.message || "Failed to create user");
        }
      } else if (editingItem) {
        const id = pickId(editingItem);
        await tryRequest([
          { path: `/${entity}/${id}`, options: { method: "PATCH", body: JSON.stringify(payload) } },
          { path: `/${entity}/${id}`, options: { method: "PUT", body: JSON.stringify(payload) } },
          { path: `/${entity}/edit/${id}`, options: { method: "PUT", body: JSON.stringify(payload) } },
        ]);
      } else {
        const createPath = entity === "helpOffers" ? "/helpOffers" : `/${entity}`;
        await tryRequest([{ path: createPath, options: { method: "POST", body: JSON.stringify(payload) } }]);
      }

      setFormVisible(false);
      await loadItems();
    } catch (err: any) {
      Alert.alert("Error", err?.message || `Failed to save ${config.singular}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleBlocked = async (item: any) => {
    const id = pickId(item);
    const nextBlocked = !(item?.blocked || item?.isBlocked);

    try {
      setActing(true);
      await tryRequest([
        {
          path: `/${entity}/block/${id}`,
          options: { method: "PUT", body: JSON.stringify({ blocked: nextBlocked }) },
        },
        {
          path: `/${entity}/block/${id}`,
          options: { method: "PATCH", body: JSON.stringify({ blocked: nextBlocked }) },
        },
        {
          path: `/${entity}/${id}`,
          options: {
            method: "PATCH",
            body: JSON.stringify({ blocked: nextBlocked, isBlocked: nextBlocked, active: !nextBlocked }),
          },
        },
      ]);

      setActionItem(null);
      await loadItems();
    } catch (err: any) {
      Alert.alert("Error", err?.message || `Failed to update ${config.singular}`);
    } finally {
      setActing(false);
    }
  };

  const softDelete = async (item: any) => {
    const id = pickId(item);

    try {
      setActing(true);
      await tryRequest([
        { path: `/${entity}/delete/${id}`, options: { method: "PUT" } },
        { path: `/${entity}/delete/${id}`, options: { method: "PATCH" } },
        {
          path: `/${entity}/${id}`,
          options: {
            method: "PATCH",
            body: JSON.stringify({
              deleted: true,
              isDeleted: true,
              deletedAt: new Date().toISOString(),
            }),
          },
        },
      ]);

      setActionItem(null);
      await loadItems();
    } catch (err: any) {
      Alert.alert("Error", err?.message || `Failed to delete ${config.singular}`);
    } finally {
      setActing(false);
    }
  };

  const getAcceptedBid = (item: any) =>
    (item?.bids || []).find((bid: any) => bid?.acceptedAt) || item?.acceptedBid || null;

  const getSettlementTotal = (item: any) => {
    const bid = getAcceptedBid(item);
    if (!bid) return 0;
    return item?.type === "offer"
      ? Number(bid.duration || 0) * Number(bid.amount || 0)
      : Number(bid.amount || 0);
  };

  const getSettlementLabels = (item: any) => {
    const bid = getAcceptedBid(item);
    const ownerName = item?.user
      ? `${item.user.firstname || ""} ${item.user.lastname || ""}`.trim()
      : "Offer maker";
    const bidderName = bid?.user
      ? `${bid.user.firstname || ""} ${bid.user.lastname || ""}`.trim()
      : "Bidder";

    return item?.type === "seek"
      ? { payerName: ownerName, beneficiaryName: bidderName }
      : { payerName: bidderName, beneficiaryName: ownerName };
  };

  const openOfferThreadChat = (item: any, receiver: any) => {
    if (!user?._id || !receiver?._id) return;
    const offerId = pickId(item);
    if (!offerId) return;

    setActionItem(null);
    router.push({
      pathname: "/chat",
      params: {
        userId: user._id,
        receiverId: receiver._id,
        name: `${receiver.firstname || ""} ${receiver.lastname || ""}`.trim() || "User",
        avatar: receiver.photo,
        helpOfferId: offerId,
        negotiationOfferId: offerId,
        threadTitle: item?.title || "Report review",
        threadType: item?.type || "offer",
        adminReview: "true",
      },
    });
  };

  const resolveJobReport = async (item: any) => {
    const id = pickId(item);
    const total = getSettlementTotal(item);
    const payerAmount = Number(splitPayerAmount);
    const beneficiaryAmount = Number(splitBeneficiaryAmount);

    if (resolutionMode === "split") {
      if (!Number.isFinite(payerAmount) || !Number.isFinite(beneficiaryAmount)) {
        Alert.alert("Error", "Enter both split amounts.");
        return;
      }
      if (payerAmount < 0 || beneficiaryAmount < 0) {
        Alert.alert("Error", "Split amounts cannot be negative.");
        return;
      }
      if (Math.round((payerAmount + beneficiaryAmount) * 100) !== Math.round(total * 100)) {
        Alert.alert("Error", `Split amounts must add up to ${total}.`);
        return;
      }
    }

    try {
      setActing(true);
      const res = await fetchWithAuth(`/helpOffers/${id}/report/resolve`, {
        method: "POST",
        body: JSON.stringify({
          note: resolutionNote || "Resolved from admin panel",
          mode: resolutionMode,
          payerAmount: resolutionMode === "split" ? payerAmount : undefined,
          beneficiaryAmount: resolutionMode === "split" ? beneficiaryAmount : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to resolve report");
      }

      setActionItem(null);
      await loadItems();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to resolve report");
    } finally {
      setActing(false);
    }
  };

  const handleCardPress = (item: any) => {
    if (entity === "sponsors") {
      router.push(`/admin/offerDetails?sponsorId=${pickId(item)}`);
      return;
    }
    setActionItem(item);
  };

  const renderCard = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => handleCardPress(item)}>
      <View style={[styles.row, { gap: 14, alignItems: "flex-start" }]}>
        <Image source={{ uri: pickImage(entity, item) }} style={styles.cardImage} />
        <View style={{ flex: 1 }}>
          <View style={[styles.row, styles.between, { marginBottom: 6 }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.cardTitle}>{pickName(entity, item)}</Text>
              <Text style={styles.cardSubtitle}>{pickSubtitle(entity, item)}</Text>
            </View>
            <TouchableOpacity onPress={() => setActionItem(item)}>
              <Feather name="more-vertical" size={22} color={colorScheme === "dark" ? "#fff" : "#111827"} />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardDescription} numberOfLines={3}>
            {pickDescription(entity, item)}
          </Text>
          {entity === "helpOffers" && (
            <Text style={styles.cardMeta} numberOfLines={1}>
              {item?.user ? `${item.user.firstname || ""} ${item.user.lastname || ""}`.trim() : "Unknown user"}
            </Text>
          )}
          {entity === "helpOffers" && item?.jobReport && (
            <Text style={[styles.cardMeta, item.jobReport.active && styles.reportMeta]} numberOfLines={1}>
              {item.jobReport.active
                ? `Reported by ${item.jobReport.reportCount || 0} user${item.jobReport.reportCount === 1 ? "" : "s"}`
                : "Report resolved"}
            </Text>
          )}
          <View style={[styles.row, styles.between, { marginTop: 12 }]}>
            <Text style={styles.badge}>{pickMeta(entity, item)}</Text>
            {entity === "sponsors" ? (
              <Text style={styles.linkText}>Open offers</Text>
            ) : (
              <Text style={styles.linkText}>Manage</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.appContainer}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <View style={styles.statusBar} />

      <View style={[styles.header, styles.container]}>
        <View style={[styles.row, styles.between, { marginBottom: 24 }]}>
          <View style={[styles.row, { gap: 12 }]}>
            <TouchableOpacity style={styles.tinyCTA} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={22} color={colorScheme === "dark" ? "#fff" : "#111827"} />
            </TouchableOpacity>
            <View>
              <Text style={styles.pageTitle}>{config.title}</Text>
              <Text style={styles.pageSubtitle}>Manage all {config.title.toLowerCase()}</Text>
            </View>
          </View>
          <View style={[styles.row, { gap: 10 }]}>
            {user?.photo ? <Image source={{ uri: user.photo }} style={styles.headerAvatar} /> : null}
            <TouchableOpacity style={styles.tinyCTA} onPress={loadItems}>
              <Ionicons name="refresh" size={20} color={colorScheme === "dark" ? "#fff" : "#111827"} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tinyCTA, styles.accentCTA]} onPress={openCreate}>
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroValue}>{filteredItems.length}</Text>
          <Text style={styles.heroLabel}>{config.title}</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={`Search ${config.title.toLowerCase()}...`}
            placeholderTextColor={colorScheme === "dark" ? "#9ca3af" : "#6b7280"}
            style={styles.searchInput}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color={config.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(pickId(item))}
          renderItem={renderCard}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadItems();
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FontAwesome6 name="layer-group" size={28} color={colorScheme === "dark" ? "#9ca3af" : "#6b7280"} />
              <Text style={styles.emptyTitle}>No {config.title.toLowerCase()} found</Text>
            </View>
          }
        />
      )}

      <Modal visible={formVisible} transparent animationType="slide" onRequestClose={() => setFormVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.row, styles.between, { marginBottom: 18 }]}>
              <Text style={styles.modalTitle}>{editingItem ? `Edit ${config.singular}` : `Create ${config.singular}`}</Text>
              <TouchableOpacity onPress={() => setFormVisible(false)}>
                <Ionicons name="close" size={24} color={colorScheme === "dark" ? "#fff" : "#111827"} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {config.fields.map((field) => (
                <View key={field.key} style={{ marginBottom: 14 }}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    value={getByPath(form, field.key) || ""}
                    onChangeText={(text) => setForm((prev: any) => setByPath(prev, field.key, text))}
                    placeholder={field.placeholder}
                    placeholderTextColor={colorScheme === "dark" ? "#9ca3af" : "#6b7280"}
                    style={[styles.fieldInput, field.multiline && styles.fieldTextarea]}
                    multiline={field.multiline}
                    keyboardType={field.keyboardType}
                    secureTextEntry={field.secureTextEntry}
                  />
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.primaryButton} onPress={saveItem} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!actionItem} transparent animationType="fade" onRequestClose={() => setActionItem(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActionItem(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheetCard} onPress={() => undefined}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}>{actionItem ? pickName(entity, actionItem) : ""}</Text>
              <TouchableOpacity style={styles.sheetButton} onPress={() => openEdit(actionItem)}>
                <Text style={styles.sheetButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetButton} onPress={() => toggleBlocked(actionItem)} disabled={acting}>
                <Text style={styles.sheetButtonText}>
                  {actionItem?.blocked || actionItem?.isBlocked ? "Unblock" : "Block"}
                </Text>
              </TouchableOpacity>
              {entity === "helpOffers" && actionItem?.jobReport && (
              <View style={styles.reportPanel}>
                <Text style={styles.reportTitle}>
                  {actionItem.jobReport.active ? "Active report" : "Resolved report"}
                </Text>
                {(actionItem.jobReport.reports || []).map((report: any, index: number) => (
                  <Text key={`${report._id || index}`} style={styles.reportText}>
                    {report.reporter
                      ? `${report.reporter.firstname || ""} ${report.reporter.lastname || ""}`.trim()
                      : "Unknown user"}: {report.text}
                  </Text>
                ))}
                {(actionItem.jobReport.messages || []).map((message: any, index: number) => (
                  <Text key={`${message._id || index}`} style={styles.reportText}>
                    {message.sender
                      ? `${message.sender.firstname || ""} ${message.sender.lastname || ""}`.trim()
                      : "Unknown user"}: {message.text}
                  </Text>
                ))}
                {actionItem.jobReport.resolvedAt && (
                  <Text style={styles.reportText}>
                    Resolved {new Date(actionItem.jobReport.resolvedAt).toLocaleString()}
                  </Text>
                )}
                {actionItem.jobReport.settlement?.mode && (
                  <Text style={styles.reportText}>
                    Settlement: {actionItem.jobReport.settlement.mode} - paid {actionItem.jobReport.settlement.beneficiaryAmount || 0} TRY
                  </Text>
                )}
              </View>
              )}
              {entity === "helpOffers" && actionItem?.jobReport?.active && (
              <View style={styles.resolutionPanel}>
                <Text style={styles.sectionLabel}>Contact users</Text>
                <View style={styles.contactRow}>
                  {actionItem?.user?._id && (
                    <TouchableOpacity
                      style={styles.contactButton}
                      onPress={() => openOfferThreadChat(actionItem, actionItem.user)}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={17} color={config.accent} />
                      <Text style={styles.contactButtonText}>Offer maker</Text>
                    </TouchableOpacity>
                  )}
                  {getAcceptedBid(actionItem)?.user?._id && (
                    <TouchableOpacity
                      style={styles.contactButton}
                      onPress={() => openOfferThreadChat(actionItem, getAcceptedBid(actionItem).user)}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={17} color={config.accent} />
                      <Text style={styles.contactButtonText}>Bidder</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.sectionLabel}>Resolve report</Text>
                <Text style={styles.reportText}>
                  Total reserved amount: {getSettlementTotal(actionItem)} TRY
                </Text>
                <Text style={styles.reportText}>
                  Payer: {getSettlementLabels(actionItem).payerName} - Receiver: {getSettlementLabels(actionItem).beneficiaryName}
                </Text>

                <TouchableOpacity
                  style={[styles.optionButton, resolutionMode === "normal" && styles.optionButtonActive]}
                  onPress={() => setResolutionMode("normal")}
                >
                  <Text style={[styles.optionText, resolutionMode === "normal" && styles.optionTextActive]}>
                    Close normally and pay receiver
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, resolutionMode === "split" && styles.optionButtonActive]}
                  onPress={() => setResolutionMode("split")}
                >
                  <Text style={[styles.optionText, resolutionMode === "split" && styles.optionTextActive]}>
                    Split the reserved money
                  </Text>
                </TouchableOpacity>
                {resolutionMode === "split" && (
                  <View style={styles.splitGrid}>
                    <TextInput
                      value={splitPayerAmount}
                      onChangeText={setSplitPayerAmount}
                      placeholder={`${getSettlementLabels(actionItem).payerName} amount`}
                      placeholderTextColor={colorScheme === "dark" ? "#9ca3af" : "#6b7280"}
                      keyboardType="numeric"
                      style={[styles.fieldInput, styles.splitInput]}
                    />
                    <TextInput
                      value={splitBeneficiaryAmount}
                      onChangeText={setSplitBeneficiaryAmount}
                      placeholder={`${getSettlementLabels(actionItem).beneficiaryName} amount`}
                      placeholderTextColor={colorScheme === "dark" ? "#9ca3af" : "#6b7280"}
                      keyboardType="numeric"
                      style={[styles.fieldInput, styles.splitInput]}
                    />
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.optionButton, resolutionMode === "noPayment" && styles.optionButtonActive]}
                  onPress={() => setResolutionMode("noPayment")}
                >
                  <Text style={[styles.optionText, resolutionMode === "noPayment" && styles.optionTextActive]}>
                    Close without payment or deduction
                  </Text>
                </TouchableOpacity>
                <TextInput
                  value={resolutionNote}
                  onChangeText={setResolutionNote}
                  placeholder="Resolution note"
                  placeholderTextColor={colorScheme === "dark" ? "#9ca3af" : "#6b7280"}
                  multiline
                  style={[styles.fieldInput, styles.noteInput]}
                />
                <TouchableOpacity
                  style={[styles.sheetButton, styles.successButton]}
                  onPress={() => resolveJobReport(actionItem)}
                  disabled={acting}
                >
                  <Text style={[styles.sheetButtonText, styles.successText]}>
                    Resolve report and close offer
                  </Text>
                </TouchableOpacity>
              </View>
              )}
              <TouchableOpacity style={[styles.sheetButton, styles.dangerButton]} onPress={() => softDelete(actionItem)} disabled={acting}>
                <Text style={[styles.sheetButtonText, styles.dangerText]}>Soft delete</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styling = (colorScheme: string | null | undefined, insets: any, accent: string) =>
  StyleSheet.create({
    appContainer: {
      flex: 1,
      backgroundColor: colorScheme === "dark" ? "#111827" : "#f4f3e9",
    },
    statusBar: {
      backgroundColor: colorScheme === "dark" ? "#111827" : "#f4f3e9",
      height: Platform.OS === "ios" ? Math.max(60, insets.top) : 25,
    },
    container: {
      paddingHorizontal: 20,
    },
    header: {
      paddingBottom: 10,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
    },
    between: {
      justifyContent: "space-between",
    },
    tinyCTA: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colorScheme === "dark" ? "#172036" : "#ffffff",
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#243047" : "#d1d5db",
    },
    headerAvatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#f3f4f6",
    },
    accentCTA: {
      backgroundColor: accent,
      borderColor: accent,
    },
    pageTitle: {
      fontSize: 28,
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_800ExtraBold",
    },
    pageSubtitle: {
      fontSize: 14,
      color: colorScheme === "dark" ? "#9ca3af" : "#6b7280",
      fontFamily: "Manrope_500Medium",
    },
    heroCard: {
      backgroundColor: colorScheme === "dark" ? "#131d33" : "#ffffff",
      borderRadius: 24,
      padding: 18,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#243047" : "#e5e7eb",
    },
    heroValue: {
      fontSize: 34,
      color: accent,
      fontFamily: "Manrope_800ExtraBold",
    },
    heroLabel: {
      fontSize: 15,
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_600SemiBold",
      marginBottom: 14,
    },
    searchInput: {
      backgroundColor: colorScheme === "dark" ? "#0f172a" : "#f9fafb",
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colorScheme === "dark" ? "#fff" : "#111827",
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#243047" : "#e5e7eb",
      fontFamily: "Manrope_500Medium",
    },
    loaderWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    card: {
      backgroundColor: colorScheme === "dark" ? "#131d33" : "#ffffff",
      marginHorizontal: 20,
      marginVertical: 8,
      borderRadius: 20,
      padding: 14,
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#243047" : "#e5e7eb",
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    cardImage: {
      width: 58,
      height: 58,
      borderRadius: 18,
      backgroundColor: colorScheme === "dark" ? "#1f2937" : "#f3f4f6",
    },
    cardTitle: {
      fontSize: 17,
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_700Bold",
      textTransform: "capitalize",
    },
    cardSubtitle: {
      fontSize: 13,
      color: accent,
      fontFamily: "Manrope_600SemiBold",
      marginTop: 2,
    },
    cardDescription: {
      fontSize: 14,
      lineHeight: 20,
      color: colorScheme === "dark" ? "#cbd5e1" : "#4b5563",
      fontFamily: "Manrope_400Regular",
    },
    cardMeta: {
      marginTop: 8,
      fontSize: 13,
      color: colorScheme === "dark" ? "#9ca3af" : "#6b7280",
      fontFamily: "Manrope_600SemiBold",
    },
    reportMeta: {
      color: "#dc2626",
    },
    badge: {
      color: accent,
      fontSize: 13,
      fontFamily: "Manrope_700Bold",
    },
    linkText: {
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_700Bold",
      fontSize: 13,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 80,
      gap: 12,
    },
    emptyTitle: {
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_600SemiBold",
      fontSize: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalCard: {
      maxHeight: "86%",
      backgroundColor: colorScheme === "dark" ? "#111827" : "#ffffff",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: Math.max(20, insets.bottom + 12),
    },
    modalTitle: {
      fontSize: 20,
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_700Bold",
      textTransform: "capitalize",
    },
    fieldLabel: {
      fontSize: 13,
      marginBottom: 6,
      color: colorScheme === "dark" ? "#e5e7eb" : "#374151",
      fontFamily: "Manrope_600SemiBold",
    },
    fieldInput: {
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#243047" : "#d1d5db",
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colorScheme === "dark" ? "#fff" : "#111827",
      backgroundColor: colorScheme === "dark" ? "#131d33" : "#f9fafb",
      fontFamily: "Manrope_500Medium",
    },
    fieldTextarea: {
      minHeight: 100,
      textAlignVertical: "top",
    },
    primaryButton: {
      marginTop: 14,
      backgroundColor: accent,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
    },
    primaryButtonText: {
      color: "#fff",
      fontFamily: "Manrope_700Bold",
      fontSize: 16,
    },
    sheetCard: {
      maxHeight: "90%",
      backgroundColor: colorScheme === "dark" ? "#111827" : "#ffffff",
      marginHorizontal: 16,
      marginBottom: Math.max(16, insets.bottom + 8),
      borderRadius: 22,
      padding: 16,
    },
    sheetTitle: {
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_700Bold",
      fontSize: 18,
      marginBottom: 12,
    },
    sheetButton: {
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: colorScheme === "dark" ? "#131d33" : "#f9fafb",
      marginTop: 10,
    },
    sheetButtonText: {
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_700Bold",
      fontSize: 15,
    },
    dangerButton: {
      backgroundColor: colorScheme === "dark" ? "#3f1d24" : "#fef2f2",
    },
    dangerText: {
      color: "#dc2626",
    },
    successButton: {
      backgroundColor: colorScheme === "dark" ? "#123524" : "#ecfdf5",
    },
    successText: {
      color: "#10b981",
    },
    reportPanel: {
      marginTop: 12,
      borderRadius: 16,
      padding: 12,
      backgroundColor: colorScheme === "dark" ? "#231f1f" : "#fff7ed",
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#7f1d1d" : "#fed7aa",
      gap: 6,
    },
    reportTitle: {
      color: colorScheme === "dark" ? "#fecaca" : "#9a3412",
      fontFamily: "Manrope_700Bold",
      fontSize: 14,
    },
    reportText: {
      color: colorScheme === "dark" ? "#e5e7eb" : "#374151",
      fontFamily: "Manrope_500Medium",
      fontSize: 13,
      lineHeight: 18,
    },
    resolutionPanel: {
      marginTop: 12,
      gap: 10,
    },
    sectionLabel: {
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_700Bold",
      fontSize: 14,
      marginTop: 4,
    },
    contactRow: {
      flexDirection: "row",
      gap: 10,
      flexWrap: "wrap",
    },
    contactButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colorScheme === "dark" ? "#131d33" : "#f9fafb",
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#243047" : "#e5e7eb",
    },
    contactButtonText: {
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_700Bold",
      fontSize: 13,
    },
    optionButton: {
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: colorScheme === "dark" ? "#131d33" : "#f9fafb",
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#243047" : "#e5e7eb",
    },
    optionButtonActive: {
      borderColor: accent,
      backgroundColor: colorScheme === "dark" ? "#123524" : "#ecfdf5",
    },
    optionText: {
      color: colorScheme === "dark" ? "#e5e7eb" : "#374151",
      fontFamily: "Manrope_700Bold",
      fontSize: 13,
    },
    optionTextActive: {
      color: accent,
    },
    splitGrid: {
      gap: 10,
    },
    splitInput: {
      borderRadius: 14,
    },
    noteInput: {
      minHeight: 72,
      textAlignVertical: "top",
    },
  });
