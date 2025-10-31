import React, { useEffect, useCallback, useState } from 'react';
import { useFocusEffect } from "@react-navigation/native";
import { View, ScrollView, Image, StyleSheet, SafeAreaView, Dimensions, TouchableOpacity, Text, Platform, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import Fontisto from '@expo/vector-icons/Fontisto';
import Octicons from '@expo/vector-icons/Octicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { StatusBar } from 'expo-status-bar';
import { getCurrentUser, fetchWithoutAuth, fetchWithAuth } from "../src/api";
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
                    if (data.error) {
                        console.error("Error", data.error);
                    } else {
                        await SecureStore.setItem('user', JSON.stringify(data))
                        setUser(data)
                    }
                    getUserRating(data._id)
                    getUnreadNotificationsCount()
                } catch (err) {
                    console.error("Error", err.message);
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
                                <Text style={styles.hint}>{user.university}</Text>
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
                                <Text style={[styles.statTitle, { opacity: 0.5 }]}>{user.offered==1?'person':'people'}</Text>
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
                                <Text style={[styles.statTitle, { opacity: 0.5 }]}>time{user.seeked==1?'':'s'}</Text>
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
                            <TouchableOpacity style={[styles.fullCTA, { flex: 1 / 3 }]} onPress={() => router.push('/students?tab=offerHelp')}>
                                <View style={{ gap: 10, alignItems: 'center', width: 100 }}>
                                    <MaterialCommunityIcons name="offer" size={34} color='#fff' />
                                    <Text style={[styles.fullCTAText, { textAlign: 'center' }]}>Offer help</Text>
                                </View>
                                {/* <Feather name="arrow-right" size={16} color='#fff' /> */}
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.fullCTA, { flex: 1 / 3 }]} onPress={() => router.push('/students?tab=seekHelp')}>
                                <View style={{ gap: 10, alignItems: 'center', width: 100 }}>
                                    <FontAwesome5 name="map-signs" size={30} color='#fff' />
                                    <Text style={[styles.fullCTAText, { textAlign: 'center' }]}>Seek help</Text>
                                </View>
                                {/* <Feather name="arrow-right" size={16} color='#fff' /> */}
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.fullCTA, { flex: 1 / 3 }]} onPress={() => router.push('/universityPosts')}>
                                <View style={{ gap: 10, alignItems: 'center', width: 100 }}>
                                    <FontAwesome6 name="money-bill-wave" size={34} color='#fff' />
                                    <Text style={[styles.fullCTAText, { textAlign: 'center' }]}>Earn</Text>
                                </View>
                                {/* <Feather name="arrow-right" size={16} color='#fff' /> */}
                            </TouchableOpacity>
                        </View>
                    </View>
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
            borderColor: colorScheme === 'dark' ? '#888' : '#ccc',
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
            lineHeight: 36
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
        }
    });