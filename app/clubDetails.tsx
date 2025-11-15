import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { View, Platform, Keyboard, ScrollView, Text, ActivityIndicator, StyleSheet, Dimensions, TouchableOpacity, Image, useColorScheme } from "react-native";
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
import * as SecureStore from "expo-secure-store";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetTextInput, BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";

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
    const { clubid } = useLocalSearchParams();
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
    const [addingMembers, setAddingMembers] = useState(false);
    const [newMemberEmail, setNewMemberEmail] = useState('');

    const editMembersRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["50%", "85%"], []);



    useFocusEffect(
        useCallback(() => {
            getUserInfo()
        }, [])
    );

    useEffect(() => {
        const fetchSponsorDetails = async () => {
            try {
                const res = await fetchWithAuth(`/clubs/${clubid}`);
                const data = await res.json();
                console.log(res)
                if (res.ok) {
                    setSponsor(data);
                } else {
                    console.error("Error fetching sponsor:", data);
                }
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        if (clubid) fetchSponsorDetails();
    }, [clubid]);

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
        editMembersRef.current?.close();
        Keyboard.dismiss();
    };

    const handleEditAdmin = () => {

    }

    const handleRemoveAdmin = () => {

    }

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
            const token = await SecureStore.getItemAsync("accessToken");
            const res = await fetchWithAuth(`/clubs/${clubid}/addMember`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            if (res.ok) {
                console.log(data)
                setSponsor(data.club)
            } else {
                console.error("Error adding member:", data);
            }
        } catch (err) {
            console.error("Add member error:", err);
        } finally {
            setAddingMembers(false);
        }

    }

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
                <Text style={{ color: colorScheme === "dark" ? "#fff" : "#000" }}>Sponsor not found.</Text>
            </View>
        );
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
                                <Text style={styles.pageTitle}>Back to Clubs</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            <View style={styles.tabs}>
                                <TouchableOpacity onPress={() => { setActiveTab('info') }} style={[styles.tab, activeTab == 'info' && styles.activeTab]}>
                                    <Text style={styles.tabText}>Info</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { setActiveTab('announcements') }} style={[styles.tab, activeTab == 'announcements' && styles.activeTab]}>
                                    <Text style={styles.tabText}>Announcements</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { setActiveTab('events') }} style={[styles.tab, activeTab == 'events' && styles.activeTab]}>
                                    <Text style={styles.tabText}>Events</Text>
                                </TouchableOpacity>
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
                                <Text style={styles.offerTitle}>{sponsor.name || 'No name'} {sponsor.verified == null && <Octicons name="verified" size={16} color={colorScheme === 'dark' ? '#fff' : '#000'} style={{ marginTop: 4 }} />}</Text>

                                <Text style={styles.category}>{sponsor.category || 'No category'}</Text>


                                <Text style={styles.description}>{sponsor.description || "No description available."}</Text>
                            </View>
                        </View>

                        <Text style={styles.membersTitle}>President</Text>
                        <View style={[styles.memberCard, { borderBottomWidth: 0, marginBottom: 30 }]}>
                            <View style={{ width: 40, height: 40, borderRadius: 50, overflow: 'hidden' }}>
                                <Image source={{ uri: sponsor.createdBy.photo }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                            </View>

                            <View>
                                <Text style={styles.memberName}>{sponsor.createdBy.firstname} {sponsor.createdBy.lastname}</Text>
                                <Text style={styles.memberRole}>{sponsor.createdBy.email}</Text>
                            </View>
                        </View>

                        <Text style={styles.membersTitle}>Admin</Text>
                        <View style={[styles.memberCard, { borderBottomWidth: 0, marginBottom: 30 }]}>
                            <View style={{ width: 40, height: 40, borderRadius: 50, overflow: 'hidden' }}>
                                <Image source={{ uri: sponsor.admin.photo }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={styles.memberName}>{sponsor.admin.firstname} {sponsor.admin.lastname}</Text>
                                <Text style={styles.memberRole}>{sponsor.admin.email}</Text>
                            </View>

                            {user && user._id == sponsor.createdBy._id &&
                                <View style={[styles.row, { gap: 20 }]}>
                                    {sponsor.createdBy._id != sponsor.admin._id && <TouchableOpacity onPress={() => { handleRemoveAdmin() }}>
                                        <MaterialCommunityIcons name="account-remove" size={24} color={colorScheme === 'dark' ? '#8125eb' : '#8125eb'} />
                                    </TouchableOpacity>}
                                    <TouchableOpacity onPress={() => { handleEditAdmin() }}>
                                        <FontAwesome name="edit" size={24} color={colorScheme === 'dark' ? '#8125eb' : '#8125eb'} />
                                    </TouchableOpacity>
                                </View>
                            }
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={styles.membersTitle}>{sponsor.members.length} Member{sponsor.members.length == 1 ? '' : 's'}</Text>
                            {user && (user._id == sponsor.createdBy._id || user._id == sponsor.admin._id) && !editingMembers && <TouchableOpacity onPress={() => { handleEditMembers() }}>
                                <Text style={styles.presidentActionCTAText}>
                                    Manage
                                </Text>
                            </TouchableOpacity>}
                            {user && (user._id == sponsor.createdBy._id || user._id == sponsor.admin._id) && editingMembers && <View style={[styles.row, { gap: 20 }]}>
                                <TouchableOpacity onPress={() => { handleAddMembers() }}>
                                    <Text style={styles.presidentActionCTAText}>
                                        Add
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { handleDoneEditMembers() }}>
                                    <Text style={styles.presidentActionCTAText}>
                                        Done
                                    </Text>
                                </TouchableOpacity>
                            </View>}
                        </View>

                        {sponsor.members.length > 0 ? (
                            sponsor.members.map((member, index) => {
                                const isLast = index === sponsor.members.length - 1;

                                return (
                                    <View
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

                                        <View>
                                            <Text style={styles.memberName}>{member.firstname} {member.lastname}</Text>
                                            <Text style={styles.memberRole}>{member.email}</Text>
                                        </View>
                                    </View>
                                );
                            })
                        ) : (
                            <Text style={styles.description}>No members yet</Text>
                        )}

                    </View>}

                    {activeTab == 'announcements' && <View style={[styles.container, { marginTop: 20 }]}>
                        <Text style={styles.membersTitle}>{announcements.length} Announcement{announcements.length == 1 ? '' : 's'}</Text>
                    </View>}

                    {activeTab == 'events' && <View style={[styles.container, { marginTop: 20 }]}>
                        <Text style={styles.membersTitle}>{events.length} Event{events.length == 1 ? '' : 's'}</Text>
                    </View>}

                </ScrollView>

                {/* navBar */}
                <View style={[styles.container, styles.SafeAreaPaddingBottom, { borderTopWidth: 1, paddingTop: 15, borderTopColor: colorScheme === 'dark' ? '#4b4b4b' : '#ddd' }]}>
                    <View style={[styles.row, { justifyContent: 'space-between', gap: 10 }]}>
                        <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/')}>
                            <View style={{ alignItems: 'center', gap: 2 }}>
                                <MaterialIcons name="dashboard" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                                <Text style={styles.navBarCTAText}>Dashboard</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/students')}>
                            <View style={{ alignItems: 'center', gap: 2 }}>
                                <FontAwesome6 name="people-group" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                                <Text style={styles.navBarCTAText}>Students</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/universityPosts')}>
                            <View style={{ alignItems: 'center', gap: 2 }}>
                                <FontAwesome5 name="university" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                                <Text style={styles.navBarCTAText}>University</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/offers')}>
                            <View style={{ alignItems: 'center', gap: 2 }}>
                                <MaterialIcons name="local-offer" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                                <Text style={styles.navBarCTAText}>Offers</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/clubs')}>
                            <View style={{ alignItems: 'center', gap: 2 }}>
                                <Entypo name="sports-club" size={22} color={colorScheme === 'dark' ? '#8125eb' : '#8125eb'} />
                                <Text style={[styles.navBarCTAText, styles.activeText]}>Clubs</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>


                {/* create club */}
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
                    keyboardBehavior="interactive"
                    keyboardBlurBehavior="restore"
                >
                    <BottomSheetView>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add a new member</Text>
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
                                        Member email address
                                    </Text>
                                    <BottomSheetTextInput
                                        placeholder="Email"
                                        placeholderTextColor={colorScheme === 'dark' ? '#fff' : '#000'}
                                        style={styles.filterInput}
                                        value={newMemberEmail}
                                        onChangeText={setNewMemberEmail}
                                        selectionColor='#8125eb'
                                    />
                                </View>

                                <View style={[styles.row, { gap: 10 }]}>
                                    <TouchableOpacity onPress={() => { handleCloseModalPress() }} style={[styles.modalButton, styles.gray]} disabled={addingMembers}>
                                        <Text style={styles.modalButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { handleConfirmAddMembers() }} style={styles.modalButton} disabled={addingMembers}>
                                        <Text style={styles.modalButtonText}>{addingMembers ? 'Adding' : 'Add'} Member</Text>
                                        {addingMembers && <ActivityIndicator size='small' color={'#fff'} />}
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
            color: colorScheme === 'dark' ? '#fff' : '#000'
        },
        memberRole: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fff' : '#000'
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
