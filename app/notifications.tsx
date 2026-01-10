import React, { useEffect, useCallback, useState } from 'react';
import { useFocusEffect } from "@react-navigation/native";
import { View, ScrollView, Image, StyleSheet, SafeAreaView, Dimensions, TouchableOpacity, Text, Platform, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import Fontisto from '@expo/vector-icons/Fontisto';
import Octicons from '@expo/vector-icons/Octicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { StatusBar } from 'expo-status-bar';
import { getCurrentUser, fetchWithAuth } from "../src/api";
import { localstorage } from '../utils/localStorage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import NotificationCard from '../src/components/NotificationCard';
import Entypo from '@expo/vector-icons/Entypo';
import { buildNotificationRoute } from "../utils/notificationNavigation";

const { width } = Dimensions.get('window');

export default function NotificationsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const styles = styling(colorScheme, insets);
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);

    useFocusEffect(
        useCallback(() => {
            const getUserInfo = async () => {
                try {
                    const data = await getCurrentUser();
                    if (data.error) console.error("Error", data.error);
                    else {
                        await localstorage.set('user', JSON.stringify(data))
                        setUser(data)
                    }
                } catch (err: any) {
                    console.error("Error", err.message);
                }
            }

            const getNotifications = async () => {
                try {
                    const res = await fetchWithAuth(`/notifications`, { method: 'GET' });
                    if (res.ok) {
                        const data = await res.json();
                        console.warn("data:", data)
                        setNotifications(data);
                    }
                } catch (err: any) {
                    console.error("Error", err.message);
                }
            }
            // createNotification()
            getUserInfo();
            getNotifications();
        }, [])

    );

    const getNotifications = async () => {
        try {
            const res = await fetchWithAuth(`/notifications`, { method: 'GET' });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            } else {
                const errorData = await res.json();
                console.error("Failed to fetch notifications:", errorData);
            }
        } catch (err: any) {
            console.error("Error fetching notifications:", err.message);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const res = await fetchWithAuth('/notifications/markAllRead', {
                method: 'PATCH',
            });

            if (res.ok) {
                console.log("All notifications marked as read");
                getNotifications();
            } else {
                const errorData = await res.json();
                console.error("Failed to mark notifications as read:", errorData);
            }
        } catch (err: any) {
            console.error("Error marking notifications as read:", err.message);
        }
    };

    const createNotification = async () => {
        const body = {
            title: 'New notification',
            content: 'This is a test notification',
            dateTime: new Date(),
            data: { screen: "clubDetails", data: JSON.stringify({ clubid: '6935d26058ba203b051601f1' }) },
        }

        try {
            const res = await fetchWithAuth('/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                const newNotification = await res.json();
                getNotifications();
            } else {
                const errorData = await res.json();
                console.error("Failed to create notification:", errorData);
            }
        } catch (err: any) {
            console.error("Error creating notification:", err.message);
        }
    };

    const handleNotificationPressed = async (notification: any) => {
        try {

            const raw = notification.data.data;
            const parsed = JSON.parse(raw[0] || raw);

            // console.log("parsed ", parsed)

            // router.push({
            //     pathname: `/${notification.data.screen}`,
            //     params: parsed.receiverId
            //         ? {
            //             userId: parsed.userId,
            //             receiverId: parsed.receiverId,
            //             name: parsed.name,
            //             avatar: parsed.avatar
            //         }
            //         : { data: parsed._id || parsed.clubid || parsed.offerId }
            // })

            const route = buildNotificationRoute(
                notification.data.screen,
                parsed
            );

            router.push(route);
        } catch (err) {
            console.log("Failed to parse notification data", err);
        }
    }


    return (
        <View style={styles.appContainer}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <View style={styles.statusBar} />

            <ScrollView style={styles.scrollArea}>
                <View style={[styles.header, styles.container]}>
                    <View style={[styles.paddedHeader, styles.row, styles.between]}>
                        <TouchableOpacity onPress={() => { router.back() }} style={[styles.row, { alignItems: 'baseline', gap: 5 }]}>
                            <Feather name="arrow-left" size={24} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                            <Text style={styles.pageTitle}>Notifications</Text>
                        </TouchableOpacity>
                        <View style={[styles.row, { gap: 10 }]}>
                            {/* <TouchableOpacity onPress={() => createNotification()}>
                                <Text>C</Text>
                            </TouchableOpacity> */}
                            <TouchableOpacity style={styles.tinyCTA} onPress={() => { getNotifications() }}>
                                <Ionicons name="refresh" size={24} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.tinyCTA} onPress={() => { handleMarkAllAsRead() }}>
                                <Ionicons name="checkmark-done" size={24} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={[styles.container, { paddingTop: 20 }]}>
                    {notifications.map(notification => (
                        <NotificationCard key={notification._id} item={notification} onPress={() => { handleNotificationPressed(notification) }} onRefresh={() => { getNotifications() }} />
                    ))}
                    {notifications.length === 0 && <Text style={styles.empty}>No notifications</Text>}
                </View>
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
                            <Entypo name="sports-club" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
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
            backgroundColor: colorScheme === 'dark' ? '#111827' : '#f4f3e9',
        },
        scrollArea: {
            flex: 1
        },
        statusBar: {
            backgroundColor: colorScheme === 'dark' ? '#2c3854' : '#e4e4e4',
            height: insets.top
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
        pageTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 24,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            marginBottom: 30
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        between: {
            justifyContent: 'space-between',
            alignItems: 'baseline'
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
        profileImage: {
            width: '100%',
            height: '100%',
            objectFit: 'cover'
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
            backgroundColor: colorScheme === 'dark' ? '#2c3854' : '#e4e4e4',
            borderBottomLeftRadius: Platform.OS == 'ios' ? 60 : 30,
            borderBottomRightRadius: Platform.OS == 'ios' ? 60 : 30,
        },
        paddedHeader: {
            paddingTop: 20,
        },
        schedule: {

        },
        currentMonthText: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 16,
            color: colorScheme === 'dark' ? '#fff' : "#000"
        },
        day: {
            fontSize: 16,
            color: colorScheme === 'dark' ? '#fff' : "#000"
        },
        previousBtn: {
            width: 30,
            height: 30,
        },
        nextBtn: {
            width: 30,
            height: 30,
        },
        title: {
            fontFamily: 'Manrope_700Bold',
            marginBottom: 5,
            fontSize: 16,
            color: colorScheme === 'dark' ? '#fff' : "#000"
        },
        empty: {
            fontFamily: 'Manrope_400Regular',
            fontSize: 16,
            color: colorScheme === 'dark' ? '#fff' : "#000"
        }
    });