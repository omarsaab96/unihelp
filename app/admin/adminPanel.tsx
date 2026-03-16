import React, { useEffect, useCallback, useState } from 'react';
import { useFocusEffect } from "@react-navigation/native";
import { View, Alert, ScrollView, Image, StyleSheet, SafeAreaView, Dimensions, TouchableOpacity, Text, Platform, useColorScheme } from 'react-native';
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
import { getCurrentUser, fetchWithoutAuth, fetchWithAuth, logout } from "../../src/api";
import { localstorage } from '../../utils/localStorage';
import { ActivityIndicator } from 'react-native-paper';

const { width } = Dimensions.get('window');

export default function AdminPanelScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const styles = styling(colorScheme);
    const [user, setUser] = useState<any>(null)

    const [totalUsers, setTotalUsers] = useState(0);
    const [totalUniversities, setTotalUniversities] = useState(0);
    const [totalSponsors, setTotalSponsors] = useState(0);
    const [totalHelpOffers, setTotalHelpOffers] = useState(0);

    const [usersLoading, setUsersLoading] = useState(true);
    const [universitiesLoading, setUniversitiesLoading] = useState(true);
    const [sponsorsLoading, setSponsorsLoading] = useState(true);
    const [helpOffersLoading, setHelpOffersLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const getUserInfo = async () => {
                try {
                    const data = await getCurrentUser();
                    if (data == null) {
                        console.log("no current user");
                        await logout();
                        router.replace('/login')
                    } else {
                        await localstorage.set('user', JSON.stringify(data))
                        setUser(data)
                        getStats();
                    }
                } catch (err: any) {
                    if (err != null) {
                        console.log("Error", err.message);
                    }
                }
            }
            getUserInfo()
        }, [])
    );

    const getStats = async () => {
        try {
            const res = await fetchWithAuth("/users")
            if (res.ok) {
                const data = await res.json();
                setTotalUsers(data.length);
                setUsersLoading(false);
            }
        } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to load users")
        }

        try {
            const res = await fetchWithAuth("/universities")
            if (res.ok) {
                const data = await res.json();
                setTotalUniversities(data.length)
                setUniversitiesLoading(false);
            }
        } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to load universities")
        }

        try {
            const res = await fetchWithAuth("/sponsors")
            if (res.ok) {
                const data = await res.json();
                setTotalSponsors(data.data.length)
                setSponsorsLoading(false);
            }
        } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to load sponsors")
        }

        try {
            const res = await fetchWithAuth("/helpOffers/count")
            if (res.ok) {
                const data = await res.json();
                setTotalHelpOffers(data.total)
                setHelpOffersLoading(false);
            }
        } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to load help offers")
        }
    }

    if (!user) {
        return null;
    }

    const sendNotification = async (title: string, body: string, data = {}, save = true) => {
        try {
            const res = await fetchWithAuth(`/notifications/test`, {
                method: 'POST',
                body: JSON.stringify({
                    title,
                    body,
                    data,
                    save
                })
            });

            const respdata = await res.json();
            console.log(respdata)
            if (res.ok) {

            }
        } catch (err) {
            console.error(err);
        } finally {
        }
    }

    return (
        <View style={styles.appContainer}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <View style={styles.statusBar}></View>

            <ScrollView style={styles.scrollArea}>
                <View style={[styles.header, styles.container]}>
                    <View style={[styles.paddedHeader, styles.row, styles.between, { marginBottom: 30 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Image style={styles.minimalLogo} source={colorScheme === 'dark' ? require('../../assets/images/minimalLogo_white.png') : require('../../assets/images/minimalLogo_black.png')} />
                            <Text style={styles.greeting}>Admin Panel</Text>
                        </View>
                        <View style={[styles.row, { gap: 10 }]}>
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
                                <Text style={styles.hint}>{user.role.toUpperCase()}</Text>
                            </View>
                        </View>
                    }

                </View>

                <View style={styles.container}>
                    {user && <View style={styles.stats}>
                        <TouchableOpacity style={[styles.stat]} onPress={() => router.push('/admin/users')}>
                            <Text style={styles.statTitle}>Users</Text>
                            {usersLoading ? (
                                <ActivityIndicator size='small' color={colorScheme === 'dark' ? '#fff' : '#000'} />
                            ) : (
                                <Text style={styles.statValue}>{totalUsers}</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.stat]} onPress={() => router.push('/admin/universities')}>
                            <Text style={styles.statTitle}>Universities</Text>
                            {universitiesLoading ? (
                                <ActivityIndicator size='small' color={colorScheme === 'dark' ? '#fff' : '#000'} />
                            ) : (
                                <Text style={styles.statValue}>{totalUniversities}</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.stat]} onPress={() => {
                            router.push('/admin/sponsors')
                        }}>
                            <Text style={styles.statTitle}>Sponsors</Text>
                            {sponsorsLoading ? (
                                <ActivityIndicator size='small' color={colorScheme === 'dark' ? '#fff' : '#000'} />
                            ) : (
                                <Text style={styles.statValue}>{totalSponsors}</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.stat]} onPress={() => router.push('/admin/helpOffers')}>
                            <Text style={styles.statTitle}>Help offers</Text>
                            {helpOffersLoading ? (
                                <ActivityIndicator size='small' color={colorScheme === 'dark' ? '#fff' : '#000'} />
                            ) : (
                                <Text style={styles.statValue}>{totalHelpOffers}</Text>
                            )}
                        </TouchableOpacity>
                    </View>}

                    {user && <View style={styles.stats}>
                        <TouchableOpacity
                            style={[styles.stat, styles.fullWidth]}
                            onPress={() => {
                                sendNotification("Test title", "test body", { key: "value" }, true)
                            }}>
                            <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000' }}>Send notification</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.stat, styles.fullWidth]}
                            onPress={() => {
                                router.push('/admin/createUniversity')
                            }}>
                            <Text style={styles.statTitle}>Add university</Text>
                        </TouchableOpacity>
                    </View>}
                </View>


            </ScrollView>
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
            gap: 10,
            alignItems: 'flex-start'
        },
        fullWidth: {
            width: width - 40,
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
