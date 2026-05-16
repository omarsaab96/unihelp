import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { View, Alert, Platform, Keyboard, ScrollView, Text, ActivityIndicator, StyleSheet, Dimensions, TouchableOpacity, Image, useColorScheme } from "react-native";
import { PaperProvider, MD3LightTheme as DefaultTheme } from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import AntDesign from '@expo/vector-icons/AntDesign';
import Octicons from '@expo/vector-icons/Octicons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Entypo from '@expo/vector-icons/Entypo';
import { useFocusEffect } from "@react-navigation/native";
import { getCurrentUser, fetchWithoutAuth, fetchWithAuth, logout } from "../src/api";
import { localstorage } from '../utils/localStorage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetTextInput, BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import { useTranslation } from "../src/i18n";

const { width } = Dimensions.get("window");

const theme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: "#2563eb",
    },
};

export default function clubDetailsScreen() {
    const router = useRouter();
    const { t, language } = useTranslation();
    const params = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const styles = styling(colorScheme);

    const [sponsor, setSponsor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null)
    const [gettingRating, setGettingRating] = useState(false)
    const [ratingsData, setRatingsData] = useState([])
    const [activeTab, setActiveTab] = useState('info');
    const [announcements, setAnnouncements] = useState([]);
    const [events, setEvents] = useState([]);
    const [editingMembers, setEditingMembers] = useState(false);
    const [settingAdmin, setSettingAdmin] = useState(false);
    const [addingMembers, setAddingMembers] = useState(false);
    const [removingMember, setRemovingMember] = useState(false);
    const [removingAdmin, setRemovingAdmin] = useState(false);
    const [addingAnnouncement, setAddingAnnouncement] = useState(false);
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAnnouncementText, setNewAnnouncementText] = useState('');
    const [memberToRemove, setMemberToRemove] = useState('');

    const editMembersRef = useRef<BottomSheet>(null);
    const removeMemberRef = useRef<BottomSheet>(null);
    const setAdminRef = useRef<BottomSheet>(null);
    const removeAdminRef = useRef<BottomSheet>(null);
    const newAnnouncementRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["50%", "90%"], []);

    useFocusEffect(
        useCallback(() => {
            getUserInfo()
        }, [])
    );

    const clubId = useMemo(() => {
        const rawId = params.data ?? params.id ?? params.clubId ?? params.clubid;
        if (Array.isArray(rawId)) return rawId[0];
        return rawId ?? null;
    }, [params.data, params.id, params.clubId, params.clubid]);

    useEffect(() => {
        if (clubId) fetchSponsorDetails();
    }, [clubId]);

    const fetchSponsorDetails = async () => {
        console.log("clubId is", clubId)
        if (!clubId) return;
        try {
            const res = await fetchWithAuth(`/clubs/${clubId}`);
            const datares = await res.json();
            // console.log(res)
            if (res.ok) {
                setSponsor(datares);
            } else {
                console.error("Error fetching sponsor:", datares);
            }
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

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

    const handleCloseModalPress = () => {
        setNewMemberEmail('')
        setMemberToRemove('')
        setNewAdminEmail('')
        setNewAnnouncementText('')
        editMembersRef.current?.close();
        removeMemberRef.current?.close();
        setAdminRef.current?.close();
        removeAdminRef.current?.close();
        newAnnouncementRef.current?.close();
        Keyboard.dismiss();
    };

    const handleEditMembers = () => {
        setEditingMembers(true)
    }

    const handleDoneEditMembers = () => {
        setEditingMembers(false)
    }

    const handleAddMembers = () => {
        editMembersRef.current?.snapToIndex(0);
    }

    const handleConfirmAddMembers = async () => {
        setAddingMembers(true)

        try {
            if (!clubId) {
                Alert.alert(t("common.error"), t("clubs.missingClubId"));
                return;
            }
            const token = await localstorage.get("accessToken");
            const res = await fetchWithAuth(`/clubs/${clubId}/addMember`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    memberEmail: newMemberEmail.toLowerCase()
                }),
            });
            const data = await res.json();
            if (res.ok) {
                // console.log(data)
                fetchSponsorDetails()
                handleCloseModalPress()
            } else {
                console.error("Error adding member:", data);
                Alert.alert(t("common.error"), data.message)
            }
        } catch (err) {
            console.error("Add member error:", err);
        } finally {
            setAddingMembers(false);
        }

    }

    const handleRemoveMember = (memId: string) => {
        setMemberToRemove(memId)
        removeMemberRef.current?.snapToIndex(0);
    }

    const handleConfirmRemoveMember = async () => {
        setRemovingMember(true)

        try {
            if (!clubId) {
                Alert.alert(t("common.error"), t("clubs.missingClubId"));
                return;
            }
            const token = await localstorage.get("accessToken");
            const res = await fetchWithAuth(`/clubs/${clubId}/removeMember`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    memberId: memberToRemove
                }),
            });
            const data = await res.json();
            if (res.ok) {
                // console.log(data)
                fetchSponsorDetails()
                handleCloseModalPress()
            } else {
                console.error("Error removing member:", data);
                Alert.alert(t("common.error"), data.message)
            }
        } catch (err) {
            console.error("Remove member error:", err);
        } finally {
            setRemovingMember(false);
        }

    }

    const handleSetAdmin = () => {
        setAdminRef.current?.snapToIndex(0);
    }

    const handleConfirmSetAdmin = async () => {
        setSettingAdmin(true)

        try {
            const token = await localstorage.get("accessToken");
            if (!clubId) {
                Alert.alert(t("common.error"), t("clubs.missingClubId"));
                return;
            }
            const res = await fetchWithAuth(`/clubs/${clubId}/setAdmin`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    adminEmail: newAdminEmail.toLowerCase()
                }),
            });
            const data = await res.json();
            if (res.ok) {
                // console.log(data)
                fetchSponsorDetails()
                handleCloseModalPress()
            } else {
                console.error("Error setting admin:", data);
                Alert.alert(t("common.error"), data.message)
            }
        } catch (err) {
            console.error("Set admin error:", err);
        } finally {
            setSettingAdmin(false);
        }

    }

    const handleRemoveAdmin = () => {
        removeAdminRef.current?.snapToIndex(0);
    }

    const handleConfirmRemoveAdmin = async () => {
        setRemovingAdmin(true)

        try {
            const token = await localstorage.get("accessToken");
            if (!clubId) {
                Alert.alert(t("common.error"), t("clubs.missingClubId"));
                return;
            }
            const res = await fetchWithAuth(`/clubs/${clubId}/removeadmin`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                }
            });
            const data = await res.json();
            if (res.ok) {
                // console.log(data)
                fetchSponsorDetails()
                handleCloseModalPress()
            } else {
                console.error("Error removing admin:", data);
                Alert.alert(t("common.error"), data.message)
            }
        } catch (err) {
            console.error("Remove admin error:", err);
        } finally {
            setRemovingAdmin(false);
        }

    }

    const handleAddAnnouncement = () => {
        newAnnouncementRef.current?.snapToIndex(0);
    }

    const handleConfirmAddAnnouncement = async () => {
        setAddingAnnouncement(true)

        try {
            const token = await localstorage.get("accessToken");
            if (!clubId) {
                Alert.alert(t("common.error"), t("clubs.missingClubId"));
                return;
            }
            const res = await fetchWithAuth(`/clubs/${clubId}/addAnnouncement`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message: newAnnouncementText
                })
            });
            const data = await res.json();
            if (res.ok) {
                // console.log(data)
                fetchSponsorDetails()
                handleCloseModalPress()
            } else {
                console.error("Error adding announcement:", data);
                Alert.alert(t("common.error"), data.message)
            }
        } catch (err) {
            console.error("Add announcement error:", err);
        } finally {
            setAddingAnnouncement(false);
        }
    }

    const formatDateTime = (date: any) => {
        if (!date) return "";
        const d = new Date(date); // ✅ handle strings or Date objects
        if (isNaN(d.getTime())) return "Invalid date";

        return d.toLocaleString(language === "tr" ? "tr-TR" : "en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (loading) {
        return (
            <View style={[styles.center, { flex: 1 }]}>
                <ActivityIndicator size="small" color="#8125eb" />
            </View>
        );
    }

    if (!sponsor) {
        return (
            <View style={[styles.center, { flex: 1 }]}>
                <Text style={{ color: colorScheme === "dark" ? "#fff" : "#000" }}>{t("clubs.clubNotFound")}</Text>
            </View>
        );
    }

    const hanldeGoToProfile = (id: string) => {
        // console.log(id)
        router.push({
            pathname: "/user/[id]",
            params: { id: id, user: typeof u === "object" ? JSON.stringify(u) : undefined },
        });
    }

    return (
        <PaperProvider theme={theme}>
            <GestureHandlerRootView style={styles.appContainer}>
                <StatusBar style="light" />
                <View style={styles.statusBar}></View>

                {/* Header */}
                <View style={[styles.header]}>
                    <View style={[styles.container, styles.purpleHeader]}>
                        <View style={[styles.paddedHeader, { marginBottom: 0 }]}>
                            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                                <Ionicons name="chevron-back" size={24} color="#fff" />
                                <Text style={styles.pageTitle}>{t("clubs.backToClubs")}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            <View style={styles.tabs}>
                                <TouchableOpacity onPress={() => { setActiveTab('info') }} style={[styles.tab, activeTab == 'info' && styles.activeTab]}>
                                    <Text style={styles.tabText}>{t("clubs.info")}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { setActiveTab('announcements') }} style={[styles.tab, activeTab == 'announcements' && styles.activeTab]}>
                                    <Text style={styles.tabText}>{t("clubs.announcements")}</Text>
                                </TouchableOpacity>
                                {/* <TouchableOpacity onPress={() => { setActiveTab('events') }} style={[styles.tab, activeTab == 'events' && styles.activeTab]}>
                                    <Text style={styles.tabText}>{t("clubs.events")}</Text>
                                </TouchableOpacity> */}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Content */}
                <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 100 }}>
                    {activeTab == 'info' && <View style={[styles.container, { marginTop: 20 }]}>

                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 30, gap: 20 }}>
                            <View style={{ flex: 1 / 4, borderWidth: 1, borderColor: '#aaa', borderRadius: 25, width: 100, height: 100, padding: 10 }}>
                                <Image
                                    source={sponsor?.image ? { uri: sponsor.image } : colorScheme === 'dark' ? require("../assets/images/minimalLogo_white.png") : require("../assets/images/minimalLogo_black.png")}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', marginBottom: 30 }}
                                />
                            </View>
                            <View style={{ flex: 3 / 4, paddingRight: 30 }}>
                                <Text style={styles.offerTitle}>{sponsor.name || t("clubs.noName")} {sponsor.verified == null && <Octicons name="verified" size={16} color={colorScheme === 'dark' ? '#fff' : '#000'} style={{ marginTop: 4 }} />}</Text>

                                <Text style={styles.category}>{sponsor.category || t("clubs.noCategory")}</Text>


                                <Text style={styles.description}>{sponsor.description || t("clubs.noDescription")}</Text>
                            </View>
                        </View>

                        <Text style={styles.membersTitle}>{t("clubs.president")}</Text>
                        <TouchableOpacity onPress={() => { hanldeGoToProfile(sponsor.createdBy._id) }} style={[styles.memberCard, { borderBottomWidth: 0, marginBottom: 30 }]}>
                            <View style={{ width: 40, height: 40, borderRadius: 50, overflow: 'hidden' }}>
                                <Image source={{ uri: sponsor.createdBy.photo }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                            </View>

                            <View>
                                <Text style={styles.memberName}>{sponsor.createdBy.firstname} {sponsor.createdBy.lastname}</Text>
                                <Text style={styles.memberRole}>{sponsor.createdBy.email}</Text>
                            </View>
                        </TouchableOpacity>

                        <Text style={styles.membersTitle}>{t("clubs.admin")}</Text>
                        <View style={[styles.memberCard, { borderBottomWidth: 0, marginBottom: 30 }]}>
                            <TouchableOpacity onPress={() => { hanldeGoToProfile(sponsor.admin._id) }} style={{ width: 40, height: 40, borderRadius: 50, overflow: 'hidden' }}>
                                <Image source={{ uri: sponsor.admin.photo }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => { hanldeGoToProfile(sponsor.admin._id) }} style={{ flex: 1 }}>
                                <Text style={styles.memberName}>{sponsor.admin.firstname} {sponsor.admin.lastname}</Text>
                                <Text style={styles.memberRole}>{sponsor.admin.email}</Text>
                            </TouchableOpacity>

                            {user && user._id == sponsor.createdBy._id &&
                                <View style={[styles.row, { gap: 20 }]}>
                                    {sponsor.createdBy._id != sponsor.admin._id && <TouchableOpacity onPress={() => { handleRemoveAdmin() }}>
                                        <MaterialCommunityIcons name="account-remove" size={24} color={colorScheme === 'dark' ? '#8125eb' : '#8125eb'} />
                                    </TouchableOpacity>}
                                    <TouchableOpacity onPress={() => { handleSetAdmin() }}>
                                        <FontAwesome name="edit" size={24} color={colorScheme === 'dark' ? '#8125eb' : '#8125eb'} />
                                    </TouchableOpacity>
                                </View>
                            }
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                            <Text style={styles.membersTitle}>{sponsor.members.length} {sponsor.members.length === 1 ? t("clubs.member") : t("clubs.memberPlural")}</Text>
                            {user && (user._id == sponsor.createdBy._id || user._id == sponsor.admin._id) && !editingMembers && <TouchableOpacity onPress={() => { handleEditMembers() }}>
                                <Text style={styles.presidentActionCTAText}>
                                    {t("clubs.manage")}
                                </Text>
                            </TouchableOpacity>}
                            {user && (user._id == sponsor.createdBy._id || user._id == sponsor.admin._id) && editingMembers && <View style={[styles.row, { gap: 20 }]}>
                                <TouchableOpacity onPress={() => { handleAddMembers() }}>
                                    <Text style={styles.presidentActionCTAText}>
                                        {t("clubs.add")}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { handleDoneEditMembers() }}>
                                    <Text style={styles.presidentActionCTAText}>
                                        {t("clubs.done")}
                                    </Text>
                                </TouchableOpacity>
                            </View>}
                        </View>

                        {sponsor.members.length > 0 ? (
                            sponsor.members.map((member, index) => {
                                const isLast = index === sponsor.members.length - 1;

                                return (
                                    <TouchableOpacity onPress={() => { hanldeGoToProfile(member._id) }}
                                        key={member._id}
                                        style={[
                                            styles.memberCard,
                                            isLast && { borderBottomWidth: 0 } // remove border for last item
                                        ]}
                                    >
                                        <View style={{ width: 40, height: 40, borderRadius: 50, overflow: 'hidden' }}>
                                            <Image
                                                source={{ uri: member.photo }}
                                                style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                                            />
                                        </View>

                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.memberName}>{member.firstname} {member.lastname}</Text>
                                            <Text style={styles.memberRole}>{member.email}</Text>
                                        </View>
                                        {editingMembers && <View>
                                            <TouchableOpacity onPress={() => { handleRemoveMember(member._id) }}>
                                                <Ionicons name="remove-circle" size={22} color="#f85151" />
                                            </TouchableOpacity>
                                        </View>}
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            <Text style={styles.description}>{t("clubs.noMembersYet")}</Text>
                        )}

                    </View>}

                    {activeTab == 'announcements' && <View style={[styles.container, { marginTop: 20 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                            <Text style={styles.membersTitle}>{sponsor.announcements.length} {sponsor.announcements.length === 1 ? t("clubs.announcement") : t("clubs.announcementPlural")}</Text>
                            {user && (user._id == sponsor.createdBy._id || user._id == sponsor.admin._id) && !addingAnnouncement &&
                                <TouchableOpacity onPress={() => { handleAddAnnouncement() }}>
                                    <Text style={styles.presidentActionCTAText}>
                                        {t("clubs.newAnnouncement")}
                                    </Text>
                                </TouchableOpacity>}
                        </View>

                        {sponsor.announcements.length > 0 ? (
                            sponsor.announcements.map((announcement, index) => {
                                const isLast = index === sponsor.announcements.length - 1;

                                return (
                                    <View
                                        key={announcement._id}
                                        style={[
                                            styles.announcementCard,
                                            isLast && { borderBottomWidth: 0 } // remove border for last item
                                        ]}
                                    >
                                        <TouchableOpacity onPress={() => { hanldeGoToProfile(announcement.createdBy._id) }} style={styles.announcementHead}>
                                            <View style={{ width: 40, height: 40, borderRadius: 50, overflow: 'hidden' }}>
                                                <Image
                                                    source={{ uri: announcement.createdBy.photo }}
                                                    style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                                                />
                                            </View>

                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.memberName}>{announcement.createdBy.firstname} {announcement.createdBy.lastname}</Text>
                                                <Text style={styles.memberRole}>{formatDateTime(announcement.createdAt)}</Text>
                                            </View>
                                        </TouchableOpacity>

                                        <View>
                                            <Text style={styles.announcementText}>
                                                {announcement.message}
                                            </Text>
                                        </View>

                                    </View>
                                );
                            })
                        ) : (
                            <Text style={styles.description}>{t("clubs.noAnnouncementsYet")}</Text>
                        )}
                    </View>}

                    {activeTab == 'events' && <View style={[styles.container, { marginTop: 20 }]}>
                        <Text style={styles.membersTitle}>{events.length} {events.length === 1 ? t("clubs.event") : t("clubs.eventPlural")}</Text>
                    </View>}

                </ScrollView>

                {/* navBar */}
                <View style={[styles.container, styles.SafeAreaPaddingBottom, { borderTopWidth: 1, paddingTop: 15, borderTopColor: colorScheme === 'dark' ? '#4b4b4b' : '#ddd' }]}>
                    <View style={[styles.row, { justifyContent: 'space-between', gap: 10 }]}>
                        <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/')}>
                            <View style={{ alignItems: 'center', gap: 2 }}>
                                <MaterialIcons name="dashboard" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                                <Text style={styles.navBarCTAText}>{t("nav.dashboard")}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/students')}>
                            <View style={{ alignItems: 'center', gap: 2 }}>
                                <FontAwesome6 name="people-group" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                                <Text style={styles.navBarCTAText}>{t("nav.students")}</Text>
                            </View>
                        </TouchableOpacity>

                        {/*

                                                <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/universityPosts')}>

                                                    <View style={{ alignItems: 'center', gap: 2 }}>

                                                        <FontAwesome5 name="university" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />

                                                        <Text style={styles.navBarCTAText}>{t("nav.university")}</Text>

                                                    </View>

                                                </TouchableOpacity>

                        

                                                

                        */}


                        <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/home')}>

                            <View style={{ alignItems: 'center', gap: 2 }}>

                                <FontAwesome5 name="home" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />

                                <Text style={styles.navBarCTAText}>{t("nav.home")}</Text>

                            </View>

                        </TouchableOpacity><TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/offers')}>
                            <View style={{ alignItems: 'center', gap: 2 }}>
                                <MaterialIcons name="local-offer" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                                <Text style={styles.navBarCTAText}>{t("nav.offers")}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/clubs')}>
                            <View style={{ alignItems: 'center', gap: 2 }}>
                                <Entypo name="sports-club" size={22} color={colorScheme === 'dark' ? '#8125eb' : '#8125eb'} />
                                <Text style={[styles.navBarCTAText, styles.activeText]}>{t("nav.clubs")}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>


                {/* add member */}
                <BottomSheet
                    ref={editMembersRef}
                    index={-1}
                    snapPoints={snapPoints}
                    enableDynamicSizing={false}
                    enablePanDownToClose={true}
                    backgroundStyle={styles.modal}
                    handleIndicatorStyle={styles.modalHandle}
                    backdropComponent={props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
                    // footerComponent={(footerProps) => (
                    //     <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                    //         <Text style={{ color: '#fff', fontWeight: 'bold' }}>Apply Filters</Text>
                    //     </TouchableOpacity>
                    // )}
                    keyboardBehavior="extend"
                    keyboardBlurBehavior="restore"
                >
                    <BottomSheetView>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t("clubs.addNewMember")}</Text>
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
                                        {t("clubs.memberEmail")}
                                    </Text>
                                    <BottomSheetTextInput
                                        placeholder={t("clubs.email")}
                                        placeholderTextColor={colorScheme === 'dark' ? '#fff' : '#000'}
                                        style={styles.filterInput}
                                        value={newMemberEmail}
                                        onChangeText={setNewMemberEmail}
                                        selectionColor='#8125eb'
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={[styles.row, { gap: 10 }]}>
                                    <TouchableOpacity onPress={() => { handleCloseModalPress() }} style={[styles.modalButton, styles.gray]} disabled={addingMembers}>
                                        <Text style={styles.modalButtonText}>{t("common.cancel")}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { handleConfirmAddMembers() }} style={styles.modalButton} disabled={addingMembers}>
                                        <Text style={styles.modalButtonText}>{addingMembers ? t("clubs.adding") : t("clubs.add")} {t("clubs.member")}</Text>
                                        {addingMembers && <ActivityIndicator size='small' color={'#fff'} />}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </BottomSheetScrollView>
                    </BottomSheetView>


                </BottomSheet>

                {/* Confirm remove member */}
                <BottomSheet
                    ref={removeMemberRef}
                    index={-1}
                    snapPoints={["25%"]}
                    enableDynamicSizing={false}
                    enablePanDownToClose={true}
                    backgroundStyle={styles.modal}
                    handleIndicatorStyle={styles.modalHandle}
                    backdropComponent={props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
                    // footerComponent={(footerProps) => (
                    //     <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                    //         <Text style={{ color: '#fff', fontWeight: 'bold' }}>Apply Filters</Text>
                    //     </TouchableOpacity>
                    // )}
                    keyboardBehavior="extend"
                    keyboardBlurBehavior="restore"
                >
                    <BottomSheetView>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t("clubs.areYouSure")}</Text>
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
                                <View style={[styles.row, { gap: 10 }]}>
                                    <TouchableOpacity onPress={() => { handleCloseModalPress() }} style={[styles.modalButton, styles.gray]} disabled={removingMember}>
                                        <Text style={styles.modalButtonText}>{t("common.cancel")}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { handleConfirmRemoveMember() }} style={styles.modalButton} disabled={removingMember}>
                                        <Text style={styles.modalButtonText}>{removingMember ? t("clubs.removing") : t("clubs.remove")} {t("clubs.member")}</Text>
                                        {removingMember && <ActivityIndicator size='small' color={'#fff'} />}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </BottomSheetScrollView>
                    </BottomSheetView>


                </BottomSheet>

                {/* Set admin */}
                <BottomSheet
                    ref={setAdminRef}
                    index={-1}
                    snapPoints={snapPoints}
                    enableDynamicSizing={false}
                    enablePanDownToClose={true}
                    backgroundStyle={styles.modal}
                    handleIndicatorStyle={styles.modalHandle}
                    backdropComponent={props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
                    // footerComponent={(footerProps) => (
                    //     <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                    //         <Text style={{ color: '#fff', fontWeight: 'bold' }}>Apply Filters</Text>
                    //     </TouchableOpacity>
                    // )}
                    keyboardBehavior="extend"
                    keyboardBlurBehavior="restore"
                >
                    <BottomSheetView>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t("clubs.setNewAdmin")}</Text>
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
                                        {t("clubs.newAdminEmail")}
                                    </Text>
                                    <BottomSheetTextInput
                                        placeholder={t("clubs.email")}
                                        placeholderTextColor={colorScheme === 'dark' ? '#fff' : '#000'}
                                        style={styles.filterInput}
                                        value={newAdminEmail}
                                        onChangeText={setNewAdminEmail}
                                        selectionColor='#8125eb'
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={[styles.row, { gap: 10 }]}>
                                    <TouchableOpacity onPress={() => { handleCloseModalPress() }} style={[styles.modalButton, styles.gray]} disabled={settingAdmin}>
                                        <Text style={styles.modalButtonText}>{t("common.cancel")}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { handleConfirmSetAdmin() }} style={styles.modalButton} disabled={settingAdmin}>
                                        <Text style={styles.modalButtonText}>{settingAdmin ? t("clubs.setting") : t("clubs.set")} {t("clubs.admin")}</Text>
                                        {settingAdmin && <ActivityIndicator size='small' color={'#fff'} />}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </BottomSheetScrollView>
                    </BottomSheetView>


                </BottomSheet>

                {/* Confirm remove admin */}
                <BottomSheet
                    ref={removeAdminRef}
                    index={-1}
                    snapPoints={["25%"]}
                    enableDynamicSizing={false}
                    enablePanDownToClose={true}
                    backgroundStyle={styles.modal}
                    handleIndicatorStyle={styles.modalHandle}
                    backdropComponent={props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
                    // footerComponent={(footerProps) => (
                    //     <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                    //         <Text style={{ color: '#fff', fontWeight: 'bold' }}>Apply Filters</Text>
                    //     </TouchableOpacity>
                    // )}
                    keyboardBehavior="extend"
                    keyboardBlurBehavior="restore"
                >
                    <BottomSheetView>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t("clubs.areYouSure")}</Text>
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
                                <View style={[styles.row, { gap: 10 }]}>
                                    <TouchableOpacity onPress={() => { handleCloseModalPress() }} style={[styles.modalButton, styles.gray]} disabled={removingAdmin}>
                                        <Text style={styles.modalButtonText}>{t("common.cancel")}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { handleConfirmRemoveAdmin() }} style={styles.modalButton} disabled={removingAdmin}>
                                        <Text style={styles.modalButtonText}>{removingAdmin ? t("clubs.removing") : t("clubs.remove")} {t("clubs.admin")}</Text>
                                        {removingAdmin && <ActivityIndicator size='small' color={'#fff'} />}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </BottomSheetScrollView>
                    </BottomSheetView>


                </BottomSheet>

                {/* New Announcement */}
                <BottomSheet
                    ref={newAnnouncementRef}
                    index={-1}
                    snapPoints={snapPoints}
                    enableDynamicSizing={false}
                    enablePanDownToClose={true}
                    backgroundStyle={styles.modal}
                    handleIndicatorStyle={styles.modalHandle}
                    backdropComponent={props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
                    // footerComponent={(footerProps) => (
                    //     <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                    //         <Text style={{ color: '#fff', fontWeight: 'bold' }}>Apply Filters</Text>
                    //     </TouchableOpacity>
                    // )}
                    keyboardBehavior="extend"
                    keyboardBlurBehavior="restore"
                >
                    <BottomSheetView>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t("clubs.createAnnouncement")}</Text>
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
                                        {t("clubs.message")}
                                    </Text>

                                    <BottomSheetTextInput
                                        style={[styles.filterInput, { minHeight: 80, textAlignVertical: "top", }]}
                                        placeholder={t("clubs.announcementPlaceholder")}
                                        placeholderTextColor="#aaa"
                                        multiline
                                        selectionColor='#10b981'
                                        value={newAnnouncementText}
                                        onChangeText={setNewAnnouncementText}
                                    />
                                </View>

                                <View style={[styles.row, { gap: 10 }]}>
                                    <TouchableOpacity onPress={() => { handleCloseModalPress() }} style={[styles.modalButton, styles.gray]} disabled={settingAdmin}>
                                        <Text style={styles.modalButtonText}>{t("common.cancel")}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { handleConfirmAddAnnouncement() }} style={styles.modalButton} disabled={addingAnnouncement}>
                                        <Text style={styles.modalButtonText}>{addingAnnouncement ? t("clubs.posting") : t("clubs.post")}</Text>
                                        {addingAnnouncement && <ActivityIndicator size='small' color={'#fff'} />}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </BottomSheetScrollView>
                    </BottomSheetView>


                </BottomSheet>

            </GestureHandlerRootView>
        </PaperProvider >
    );
}

const styling = (colorScheme) =>
    StyleSheet.create({
        appContainer: {
            flex: 1,
            backgroundColor: colorScheme === "dark" ? "#111827" : "#f4f3e9",
        },
        scrollArea: {
            flex: 1,
        },
        statusBar: {
            backgroundColor: "#8125eb",
            height: Platform.OS === "ios" ? 60 : 25,
        },
        container: {
            paddingHorizontal: 20,
        },
        purpleHeader: {
            backgroundColor: '#8125eb',
            borderBottomLeftRadius: Platform.OS == 'ios' ? 60 : 30,
            borderBottomRightRadius: Platform.OS == 'ios' ? 60 : 30,
        },
        paddedHeader: {
            paddingTop: 20,
            marginBottom: 20,
        },
        pageTitle: {
            fontFamily: "Manrope_700Bold",
            fontSize: 22,
            color: "#fff",
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
        },
        between: {
            justifyContent: "space-between",
        },
        tinyCTA: {
            width: 50,
            height: 50,
            borderWidth: 1,
            borderRadius: 25,
            alignItems: "center",
            justifyContent: "center",
            borderColor: "#fff",
        },
        bannerImage: {
            width: "100%",
            height: 200,
            borderRadius: 20,
            marginBottom: 20,
        },
        sectionTitle: {
            fontFamily: "Manrope_700Bold",
            fontSize: 18,
            color: colorScheme === "dark" ? "#fff" : "#000",
        },
        description: {
            fontFamily: "Manrope_400Regular",
            color: colorScheme === "dark" ? "#ccc" : "#333",
            lineHeight: 22,
            marginBottom: 20,
        },
        membersTitle: {
            fontFamily: "Manrope_700Bold",
            fontSize: 16,
            color: colorScheme === "dark" ? "#fff" : "#000",
            marginBottom: 10,
        },
        fullCTA: {
            borderWidth: 1,
            borderRadius: 25,
            borderColor: colorScheme === "dark" ? "#888" : "#ccc",
            padding: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        fullCTAText: {
            color: colorScheme === "dark" ? "#fff" : "#000",
        },
        offerCard: {
            backgroundColor: colorScheme === "dark" ? "#2c3854" : "#e4e4e4",
            padding: 15,
            borderRadius: 15,
            marginTop: 10,
        },
        offerTitle: {
            fontFamily: "Manrope_700Bold",
            fontSize: 18,
            color: colorScheme === "dark" ? "#fff" : "#000",
            marginBottom: 10,
        },
        offerDesc: {
            fontFamily: "Manrope_400Regular",
            color: colorScheme === "dark" ? "#ccc" : "#333",
            marginBottom: 20
        },
        center: {
            justifyContent: "center",
            alignItems: "center",
        },
        backBtn: { flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 20 },
        category: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#8125eb' : '#8125eb',
            fontFamily: 'Manrope_600SemiBold',
            marginBottom: 10
        },
        featured: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_600SemiBold',
        },
        announcementCard: {
            borderBottomWidth: 1,
            borderBottomColor: colorScheme === 'dark' ? '#444' : '#ccc',
            backgroundColor: colorScheme === 'dark' ? '#2c3854' : '#e4e4e4',
            borderRadius: 20,
            padding: 8,
            marginBottom: 10
        },
        announcementHead: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 20,
            marginBottom: 20
        },
        announcementText: {
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_400Regular',
            fontSize: 14,

        },
        memberCard: {
            borderBottomWidth: 1,
            paddingVertical: 8,
            borderBottomColor: colorScheme === 'dark' ? '#444' : '#ccc',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 20
        },
        memberName: {
            textTransform: 'capitalize',
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_600SemiBold',
        },
        memberRole: {
            fontSize: 12,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            opacity: 0.6
        },
        SafeAreaPaddingBottom: {
            paddingBottom: Platform.OS == 'ios' ? 40 : 55,
        },
        navbarCTA: {
            flex: 1
        },
        navBarCTAText: {
            fontSize: 10,
            color: colorScheme === 'dark' ? '#fff' : '#000'
        },
        activeText: {
            color: '#8125eb'
        },
        tabs: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
        },
        tab: {
            paddingVertical: 5,
            paddingHorizontal: 15,
            borderBottomWidth: 5,
            borderBottomColor: "#8125eb",
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
        presidentActionCTAText: {
            color: "#8125eb",
            fontFamily: "Manrope_600SemiBold",
            fontSize: 14
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
            backgroundColor: '#8125eb',
            paddingVertical: 15,
            borderRadius: 60,
            alignItems: 'center',
            marginTop: 10,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 15,
            flex: 1
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
        },
        gray: {
            backgroundColor: '#aaa'
        },
    });
