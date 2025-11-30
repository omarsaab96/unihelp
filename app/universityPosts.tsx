import React, { useEffect, useCallback, useState } from 'react';
import { useFocusEffect } from "@react-navigation/native";
import { View, ScrollView, Image, StyleSheet, SafeAreaView, Dimensions, TouchableOpacity, Text, Platform, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import Fontisto from '@expo/vector-icons/Fontisto';
import Octicons from '@expo/vector-icons/Octicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { StatusBar } from 'expo-status-bar';
import { getCurrentUser, fetchWithoutAuth, fetchWithAuth, logout } from "../src/api";
import * as SecureStore from "expo-secure-store";
import { ActivityIndicator } from 'react-native-paper';

const { width } = Dimensions.get('window');

export default function universityPostsScreen() {
    const router = useRouter();
    let colorScheme = useColorScheme();
    const styles = styling(colorScheme);
    const [user, setUser] = useState(null)
    const [university, setUniversity] = useState(null)
    const [gettingStudentsCount, setGettingStudentsCount] = useState(true)
    const [universityStudentsCount, setUniversityStudentsCount] = useState(0)

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
                        setUniversity(data.university)
                        getStudentsCount(data.university._id)
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

    const getStudentsCount = async (uniId:string) => {
        setGettingStudentsCount(true);
        try {
            const res = await fetchWithAuth(`/universities/studentsCount/${uniId}`);

            if (res.ok) {
                const data = await res.json();
                setUniversityStudentsCount(data.count);
            }


        } catch (err) {
            console.error(err);
        } finally {
            setGettingStudentsCount(false);
        }
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
                        <Image style={[styles.minimalLogo, colorScheme === 'dark' && { tintColor: '#fff' }]} source={{ uri: university.photo }} />
                    </View>
                    {user && university &&
                        <View>
                            <View style={styles.row}>
                                {/* <Text style={styles.greeting}>Welcome, to</Text> */}
                                <Text style={[styles.greeting, { fontFamily: 'Manrope_700Bold', textTransform: 'capitalize' }]}>{university.name}</Text>
                            </View>
                        </View>
                    }

                </View>

                <View style={styles.container}>
                    {user && university &&
                        <>
                            <View style={styles.stats}>
                                <View style={[styles.stat]}>
                                    <Text style={styles.statTitle}>Rating</Text>
                                    <Text style={styles.statValue}>
                                        {university.reviews == 0 ? (0).toFixed(1) : university.rating?.toFixed(1)}
                                    </Text>
                                </View>

                                <View style={[styles.stat]}>
                                    <Text style={styles.statTitle}>Students on Unihelp</Text>
                                    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'baseline' }}>
                                        {gettingStudentsCount ? (
                                            <ActivityIndicator size='small' color={colorScheme==='dark'?'#fff':'#000'} style={{ transform: [{ translateY: 10 }] }}/>
                                        ): (
                                            <Text style={styles.statValue}>{universityStudentsCount}</Text>
                                        )}
                                    </View>
                                    {/* <View style={[styles.row]}>
                                <Feather name="arrow-down" size={16} color={colorScheme === 'dark' ? '#f62f2f' : "#ce0505"} style={{ marginBottom: -2 }} />
                                <Text style={{ fontSize: 16, color: colorScheme === 'dark' ? '#f62f2f' : "#ce0505", flex: 1 }}>-15m </Text>
                                <Text style={styles.hint}> this month</Text>
                            </View> */}
                                </View>
                            </View>

                            <View style={{ gap: 5, marginBottom: 30 }}>
                                <View style={styles.banner}>
                                    <Image style={styles.bannerImage} source={{ uri: university.cover }} />
                                </View>

                            </View>

                            <View style={{ gap: 5, marginBottom: 30 }}>
                                <Text style={styles.sectiontTitle}>Go to</Text>

                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                    <TouchableOpacity style={[styles.fullCTA, { flex: 1 / 3 }]} onPress={() => router.push('/universityEvents')}>
                                        <View style={{ gap: 10, alignItems: 'center', width: 100 }}>
                                            <MaterialIcons name="event" size={34} color='#fff' />
                                            <Text style={[styles.fullCTAText, { textAlign: 'center' }]}>University Events</Text>
                                        </View>
                                        {/* <Feather name="arrow-right" size={16} color='#fff' /> */}
                                    </TouchableOpacity>

                                    <TouchableOpacity style={[styles.fullCTA, { flex: 1 / 3 }]} onPress={() => router.push('/universityNews')}>
                                        <View style={{ gap: 10, alignItems: 'center', width: 100 }}>
                                            <FontAwesome6 name="newspaper" size={34} color='#fff' />
                                            <Text style={[styles.fullCTAText, { textAlign: 'center' }]}>University News</Text>
                                        </View>
                                        {/* <Feather name="arrow-right" size={16} color='#fff' /> */}
                                    </TouchableOpacity>

                                    <TouchableOpacity style={[styles.fullCTA, { flex: 1 / 3 }]} onPress={() => router.push('/universityStaff')}>
                                        <View style={{ gap: 10, alignItems: 'center', width: 100 }}>
                                            <Ionicons name="help-buoy" size={34} color='#fff' />
                                            <Text style={[styles.fullCTAText, { textAlign: 'center' }]}>Staff Help Offers</Text>
                                        </View>
                                        {/* <Feather name="arrow-right" size={16} color='#fff' /> */}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    }
                </View>
            </ScrollView >

            {/* navBar */}
            <View View style={[styles.container, styles.SafeAreaPaddingBottom, { borderTopWidth: 1, paddingTop: 15, borderTopColor: colorScheme === 'dark' ? '#4b4b4b' : '#ddd' }]} >
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
                            <FontAwesome5 name="university" size={22} color={colorScheme === 'dark' ? '#2563EB' : '#2563EB'} />
                            <Text style={[styles.navBarCTAText, styles.activeText]}>University</Text>
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
            </View >
        </View >
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
            width: 150,
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
            maxHeight: 300,
            overflow: 'hidden'
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