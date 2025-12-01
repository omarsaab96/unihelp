import React, { useEffect, useCallback, useState } from 'react';
import { useFocusEffect } from "@react-navigation/native";
import { View, ScrollView, Image, StyleSheet, SafeAreaView, Dimensions, TouchableOpacity, Text, Platform, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import Fontisto from '@expo/vector-icons/Fontisto';
import Octicons from '@expo/vector-icons/Octicons';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { StatusBar } from 'expo-status-bar';
import { getCurrentUser, fetchWithoutAuth, fetchWithAuth, logout } from "../src/api";
import * as SecureStore from "expo-secure-store";

const { width } = Dimensions.get('window');

export default function IndexScreen() {
    const router = useRouter();
    let colorScheme = useColorScheme();
    const styles = styling(colorScheme);
    const [user, setUser] = useState(null)
    const [ratingsData, setRatingsData] = useState([])
    const [gettingRating, setGettingRating] = useState(false)
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)

    useFocusEffect(
        useCallback(() => {
            const getUserInfo = async () => {
                try {
                    const data = await getCurrentUser();
                    // console.log("data = ", data)
                    if (data == null) {
                        console.log("Error");
                        await logout();
                        router.replace('/login')
                    } else {
                        await SecureStore.setItem('user', JSON.stringify(data))
                        setUser(data)
                        getUserRating(data._id)
                        getUnreadNotificationsCount()
                    }

                } catch (err) {
                    if (err != null) {
                        console.log("Error", err.message);
                    }
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

    const getUnreadNotificationsCount = async () => {
        try {
            const res = await fetchWithAuth(`/notifications`, { method: 'GET' });
            if (res.ok) {
                const data = await res.json();
                setUnreadNotificationsCount(data.filter(n => !n.read).length);
            } else {
                const errorData = await res.json();
                console.error("Failed to fetch notifications:", errorData);
            }
        } catch (err: any) {
            console.error("Error fetching notifications:", err.message);
        }

    }

    const handleGoToJobDetails = (offer: any) => {
        // Route to the unified details screen which expects serialized `data`
        console.log(offer)
        router.push({
            pathname: '/jobDetails',
            params: { offerId: offer._id }
        });
    }

    const getJobStatus = (job: any) => {
        if (job.status == "pending" && job.systemApproved == null && job.systemRejected == null) {
            if (job.survey == null) {
                return "Waiting for your feedback"
            } else {
                return "Waiting for other person's feedback"
            }
        }


        return "Pending";
    }

    if (!user) {
        return null;
    }

    return (
        <View style={styles.appContainer}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <View style={styles.statusBar}></View>

            <ScrollView style={styles.scrollArea}>
                <View style={[styles.header, styles.container]}>
                    <View style={[styles.paddedHeader, styles.row, styles.between, { marginBottom: 30 }]}>
                        <Image style={styles.minimalLogo} source={colorScheme === 'dark' ? require('../assets/images/minimalLogo_white.png') : require('../assets/images/minimalLogo_black.png')} />
                        <View style={[styles.row, { gap: 10 }]}>
                            <TouchableOpacity style={[styles.tinyCTA, unreadNotificationsCount > 0 && { position: 'relative' }]} onPress={() => router.push('/notifications')}>
                                <Fontisto name="bell" size={22} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                                {unreadNotificationsCount > 0 && <View style={{ position: 'absolute', top: -2, right: -2, paddingHorizontal: 5, backgroundColor: '#f62f2f', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Manrope_500Medium', fontWeight: 'bold' }}>{unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}</Text>
                                </View>}
                            </TouchableOpacity>
                            {true && <TouchableOpacity style={styles.tinyCTA} onPress={() => router.push('/messages')}>
                                <Octicons name="mail" size={22} color={colorScheme === 'dark' ? "#fff" : "#000"} />
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
                    {user &&
                        <View>
                            <View style={styles.row}>
                                <Text style={styles.greeting}>Hello, </Text>
                                <Text style={[styles.greeting, { fontFamily: 'Manrope_700Bold', textTransform: 'capitalize' }]}>{user.firstname}</Text>
                                <Text style={styles.greeting}>!</Text>
                            </View>
                            <View>
                                <Text style={styles.hint}>{user.university.name}</Text>
                            </View>
                        </View>
                    }

                </View>

                <View style={styles.container}>
                    {user && ratingsData && <View style={styles.stats}>
                        <View style={[styles.stat]}>
                            <Text style={styles.statTitle}>Total Points</Text>
                            <Text style={styles.statValue}>{user.totalPoints}</Text>
                            {/* <View style={[styles.row]}>
                                <Feather name="arrow-up" size={16} color="#05ce48" style={{ marginBottom: -2 }} />
                                <Text style={{ fontSize: 16, color: "#05ce48", flex: 1 }}>+35</Text>
                                <Text style={styles.hint}> this month</Text>
                            </View> */}
                        </View>
                        <View style={[styles.stat]}>
                            <Text style={styles.statTitle}>Rating</Text>
                            <Text style={styles.statValue}>{ratingsData?.totalReviews == 0 ? (0).toFixed(1) : ratingsData?.avgRating?.toFixed(1)}</Text>
                            {/* <View style={[styles.row]}>
                                <Feather name="arrow-up" size={16} color="#05ce48" style={{ marginBottom: -2 }} />
                                <Text style={{ fontSize: 16, color: "#05ce48", flex: 1 }}>+0.2</Text>
                                <Text style={styles.hint}> this month</Text>
                            </View> */}
                        </View>
                        <View style={[styles.stat]}>
                            <Text style={styles.statTitle}>You Helped</Text>
                            <View style={{ flexDirection: 'row', gap: 5, alignItems: 'baseline' }}>
                                <Text style={styles.statValue}>{user.offered}</Text>
                                <Text style={[styles.statTitle, { opacity: 0.5 }]}>{user.offered == 1 ? 'person' : 'people'}</Text>
                            </View>
                            {/* <View style={[styles.row]}>
                                <Feather name="arrow-down" size={16} color={colorScheme === 'dark' ? '#f62f2f' : "#ce0505"} style={{ marginBottom: -2 }} />
                                <Text style={{ fontSize: 16, color: colorScheme === 'dark' ? '#f62f2f' : "#ce0505", flex: 1 }}>-35</Text>
                                <Text style={styles.hint}> this month</Text>
                            </View> */}
                        </View>
                        <View style={[styles.stat]}>
                            <Text style={styles.statTitle}>Asked for Help</Text>
                            <View style={{ flexDirection: 'row', gap: 5, alignItems: 'baseline' }}>
                                <Text style={styles.statValue}>{user.seeked}</Text>
                                <Text style={[styles.statTitle, { opacity: 0.5 }]}>time{user.seeked == 1 ? '' : 's'}</Text>
                            </View>
                            {/* <View style={[styles.row]}>
                                <Feather name="arrow-down" size={16} color={colorScheme === 'dark' ? '#f62f2f' : "#ce0505"} style={{ marginBottom: -2 }} />
                                <Text style={{ fontSize: 16, color: colorScheme === 'dark' ? '#f62f2f' : "#ce0505", flex: 1 }}>-15m </Text>
                                <Text style={styles.hint}> this month</Text>
                            </View> */}
                        </View>
                    </View>}

                    <View style={{ gap: 5, marginBottom: 30 }}>
                        <View style={styles.banner}>
                            <Image style={styles.bannerImage} source={require('../assets/images/promoBanner.png')} />
                        </View>

                    </View>

                    <View style={{ gap: 5, marginBottom: 30 }}>
                        <Text style={styles.sectiontTitle}>Quick Actions</Text>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                            <TouchableOpacity style={[styles.fullCTA, { flex: 1 / 3 }]} onPress={() => router.push('/students')}>
                                <View style={{ gap: 10, alignItems: 'center', width: 100 }}>
                                    <Ionicons name="help-buoy" size={34} color='#fff' />
                                    <Text style={[styles.fullCTAText, { textAlign: 'center' }]}>Students Help Offers</Text>
                                </View>
                                {/* <Feather name="arrow-right" size={16} color='#fff' /> */}
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.fullCTA, { flex: 1 / 3 }]} onPress={() => router.push('/offers')}>
                                <View style={{ gap: 10, alignItems: 'center', width: 100 }}>
                                    <FontAwesome5 name="map-signs" size={34} color='#fff' />
                                    <Text style={[styles.fullCTAText, { textAlign: 'center' }]}>Redeem Your Points</Text>
                                </View>
                                {/* <Feather name="arrow-right" size={16} color='#fff' /> */}
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.fullCTA, { flex: 1 / 3 }]} onPress={() => router.push('/universityEvents')}>
                                <View style={{ gap: 10, alignItems: 'center', width: 100 }}>
                                    <MaterialIcons name="event" size={34} color='#fff' />
                                    <Text style={[styles.fullCTAText, { textAlign: 'center' }]}>University Events</Text>
                                </View>
                                {/* <Feather name="arrow-right" size={16} color='#fff' /> */}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {user && user.helpjobs.filter(job => job.status === "open").length > 0 && <View style={{ marginBottom: 20 }}>
                        <View style={styles.infoRow}>
                            <Text style={styles.sectiontTitle}>OnGoing jobs ({user.helpjobs.filter(job => job.status === "open").length})</Text>
                            <TouchableOpacity style={styles.viewAllBtn} onPress={() => { }}>
                                <Text style={styles.viewAllBtnText}>View all</Text>
                                <FontAwesome6 name="arrow-right" size={10} color={colorScheme === 'dark' ? '#ffff' : '#2563EB'} />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.infoRow, {
                            flexDirection: 'column',
                            backgroundColor: colorScheme === 'dark' ? '#2c3854' : '#e4e4e4',
                            borderRadius: 10,
                            padding: 10
                        }]}>
                            {user.helpjobs.filter(job => job.status === "open").length == 0 ? (
                                <Text style={styles.infoLabel}>No opened jobs</Text>
                            ) : (
                                user.helpjobs
                                    .filter(job => job.status === "open")
                                    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
                                    .map((job, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={{
                                                marginBottom: index === user.helpjobs.filter(job => job.status === "open").length - 1 ? 0 : 8,
                                                borderBottomWidth: index === user.helpjobs.filter(job => job.status === "open").length - 1 ? 0 : 1,
                                                borderBottomColor: '#ccc',
                                                paddingBottom: index === user.helpjobs.filter(job => job.status === "open").length - 1 ? 0 : 8,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'space-between'
                                            }}
                                            onPress={() => {
                                                handleGoToJobDetails(job.offer)
                                            }}>
                                            <View>
                                                <Text style={styles.infoLabel}>
                                                    {job.offer?.title || job._id}
                                                </Text>
                                                <Text style={styles.infoSubLabel}>
                                                    Started: {new Date(job.startedAt).toLocaleDateString()}
                                                </Text>
                                            </View>
                                            <View>
                                                <Feather name="arrow-right-circle" size={24} color={colorScheme === 'dark' ? '#ffff' : '#000'} />
                                            </View>
                                        </TouchableOpacity>
                                    ))
                            )}
                        </View>
                    </View>}

                    {user && user.helpjobs.filter(job => job.status === "pending").length > 0 && <View>
                        <View style={styles.infoRow}>
                            <Text style={styles.sectiontTitle}>Pending jobs ({user.helpjobs.filter(job => job.status === "pending").length})</Text>
                            <TouchableOpacity style={styles.viewAllBtn} onPress={() => { }}>
                                <Text style={styles.viewAllBtnText}>View all</Text>
                                <FontAwesome6 name="arrow-right" size={10} color={colorScheme === 'dark' ? '#fff' : '#2563EB'} />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.infoRow, {
                            flexDirection: 'column',
                            backgroundColor: colorScheme === 'dark' ? '#2c3854' : '#e4e4e4',
                            borderRadius: 10,
                            padding: 10,
                            marginBottom: 30
                        }]}>
                            {user.helpjobs.filter(job => job.status === "pending").length == 0 ? (
                                <Text style={styles.infoLabel}>No completed jobs</Text>
                            ) : (
                                user.helpjobs
                                    .filter(job => job.status === "pending")
                                    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                                    .map((job, index) => (
                                        <TouchableOpacity key={index} style={{
                                            marginBottom: index === user.helpjobs.filter(job => job.status === "pending").length - 1 ? 0 : 8,
                                            borderBottomWidth: index === user.helpjobs.filter(job => job.status === "pending").length - 1 ? 0 : 1,
                                            borderBottomColor: '#ccc',
                                            paddingBottom: index === user.helpjobs.filter(job => job.status === "pending").length - 1 ? 0 : 8,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }} onPress={() => { handleGoToJobDetails(job.offer) }}>
                                            <View>
                                                <Text style={styles.infoLabel}>
                                                    {job.offer?.title || job._id}
                                                </Text>
                                                <Text style={styles.infoSubLabel}>
                                                    Status: {getJobStatus(job)}
                                                </Text>
                                            </View>
                                            <View>
                                                <Feather name="arrow-right-circle" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                                            </View>
                                        </TouchableOpacity>
                                    ))
                            )}
                        </View>
                    </View>}

                    {user && user.helpjobs.filter(job => job.status === "completed").length > 0 && <View>
                        <View style={styles.infoRow}>
                            <Text style={styles.sectiontTitle}>Completed jobs ({user.helpjobs.filter(job => job.status === "completed").length})</Text>
                            <TouchableOpacity style={styles.viewAllBtn} onPress={() => { }}>
                                <Text style={styles.viewAllBtnText}>View all</Text>
                                <FontAwesome6 name="arrow-right" size={10} color={colorScheme === 'dark' ? '#fff' : '#2563EB'} />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.infoRow, {
                            flexDirection: 'column',
                            backgroundColor: colorScheme === 'dark' ? '#2c3854' : '#e4e4e4',
                            borderRadius: 10,
                            padding: 10,
                            marginBottom: 30
                        }]}>
                            {user.helpjobs.filter(job => job.status === "completed").length == 0 ? (
                                <Text style={styles.infoLabel}>No completed jobs</Text>
                            ) : (
                                user.helpjobs
                                    .filter(job => job.status === "completed")
                                    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                                    .map((job, index) => (
                                        <TouchableOpacity key={index} style={{
                                            marginBottom: index === user.helpjobs.filter(job => job.status === "completed").length - 1 ? 0 : 8,
                                            borderBottomWidth: index === user.helpjobs.filter(job => job.status === "completed").length - 1 ? 0 : 1,
                                            borderBottomColor: '#ccc',
                                            paddingBottom: index === user.helpjobs.filter(job => job.status === "completed").length - 1 ? 0 : 8,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }} onPress={() => { handleGoToJobDetails(job.offer) }}>
                                            <View>
                                                <Text style={styles.infoLabel}>
                                                    {job.offer?.title || job._id}
                                                </Text>
                                                <Text style={styles.infoSubLabel}>
                                                    Completed: {new Date(job.completedAt).toLocaleDateString()}
                                                </Text>
                                            </View>
                                            <View>
                                                <Feather name="arrow-right-circle" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                                            </View>
                                        </TouchableOpacity>
                                    ))
                            )}
                        </View>
                    </View>}
                </View>
            </ScrollView>

            {/* navBar */}
            <View style={[styles.container, styles.SafeAreaPaddingBottom, { borderTopWidth: 1, paddingTop: 15, borderTopColor: colorScheme === 'dark' ? '#4b4b4b' : '#ddd' }]}>
                <View style={[styles.row, { justifyContent: 'space-between', gap: 10 }]}>
                    <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/')}>
                        <View style={{ alignItems: 'center', gap: 2 }}>
                            <MaterialIcons name="dashboard" size={22} color={colorScheme === 'dark' ? '#2563EB' : '#2563EB'} />
                            <Text style={[styles.navBarCTAText, styles.activeText]}>Dashboard</Text>
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
                            <Entypo name="sports-club" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                            <Text style={styles.navBarCTAText}>Clubs</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styling = (colorScheme: string) =>
    StyleSheet.create({
        appContainer: {
            flex: 1,
            backgroundColor: colorScheme === 'dark' ? '#111827' : '#f4f3e9',
        },
        scrollArea: {
            flex: 1
        },
        statusBar: {
            backgroundColor: colorScheme === 'dark' ? '#111827' : '#f4f3e9',
            height: Platform.OS === 'ios' ? 60 : 25
        },
        SafeAreaPaddingBottom: {
            paddingBottom: Platform.OS == 'ios' ? 40 : 55,
        },
        container: {
            paddingHorizontal: 20,
        },
        minimalLogo: {
            width: 50,
            height: 50,
            objectFit: 'contain'
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        between: {
            justifyContent: 'space-between'
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
        fullCTAText: {
            color: '#fff',
            fontFamily: 'Manrope_600SemiBold'

        },
        profileCTA: {
            width: 40,
            height: 40,
            borderWidth: 0,
            overflow: 'hidden'
        },
        navbarCTA: {
            flex: 1
        },
        navBarCTAText: {
            fontSize: 10,
            color: colorScheme === 'dark' ? '#fff' : '#000'
        },
        activeText: {
            color: '#2563EB'
        },
        profileImage: {
            width: '100%',
            height: '100%',
            objectFit: 'cover'
        },
        hint: {
            fontSize: 16,
            color: '#2563EB',
        },
        banner: {
            backgroundColor: colorScheme === 'dark' ? '#152446' : '#79d6b7',
            borderRadius: 30,
            // padding: 20,
            maxHeight: 300
        },
        bannerImage: {
            width: '100%',
            height: 'auto',
            aspectRatio: 2.46,
        },
        bannerText: {
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_600SemiBold'
        },
        sectiontTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 16,
            marginBottom: 5,
            color: colorScheme === 'dark' ? '#fff' : "#000"
        },
        header: {
            marginBottom: 30,
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
        stats: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 30
        },
        stat: {
            width: (width - 50) / 2,
            borderRadius: 30,
            padding: 20,
            backgroundColor: colorScheme === 'dark' ? '#2c3854' : '#e4e4e4',
        },
        statTitle: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fff' : '#000'
        },
        statValue: {
            fontSize: 28,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_700Bold'
        },
        infoRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 8,
        },
        viewAllBtn: {
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 5
        },
        viewAllBtnText: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fff' : '#2563EB',
            fontFamily: 'Manrope_700Bold'
        },
        infoLabel: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_600SemiBold'
        },
        infoSubLabel: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fff' : '#333',
            fontFamily: 'Manrope_400Regular'
        },
        infoValue: {
            fontSize: 14,
            fontFamily: 'Manrope_400Regular',
            color: colorScheme === 'dark' ? '#fff' : '#000',
            flex: 1,
            textAlign: 'right',
            maxWidth: '80%'
        },
        fullInfoValue: {
            textAlign: 'left',
            maxWidth: '100%'
        },
    });