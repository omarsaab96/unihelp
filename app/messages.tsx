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
import * as SecureStore from "expo-secure-store";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import NotificationCard from '../src/components/NotificationCard';

const { width } = Dimensions.get('window');

export default function MessagesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const styles = styling(colorScheme, insets);
    const [user, setUser] = useState<any>(null);
    const [chats, setChats] = useState<any[]>([]);

    useFocusEffect(
        useCallback(() => {
            const getUserInfo = async () => {
                try {
                    const data = await getCurrentUser();
                    if (data.error) console.error("Error", data.error);
                    else {
                        await SecureStore.setItem('user', JSON.stringify(data))
                        setUser(data)
                    }
                } catch (err: any) {
                    console.error("Error", err.message);
                }
            }

            getUserInfo();
            getChats();
        }, [])
    );

    const getChats = async () => {
        //Get chats from API
    };
    const handleAddChat = async () => {
        //Create new chat 
    };

    return (
        <View style={styles.appContainer}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <View style={styles.statusBar} />

            <ScrollView style={styles.scrollArea}>
                <View style={[styles.header, styles.container]}>
                    <View style={[styles.paddedHeader, styles.row, styles.between]}>
                        <TouchableOpacity onPress={() => { router.back() }} style={[styles.row, { alignItems: 'baseline', gap: 5 }]}>
                            <Feather name="arrow-left" size={24} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                            <Text style={styles.pageTitle}>Chats</Text>
                        </TouchableOpacity>
                        <View style={[styles.row, { gap: 10 }]}>
                            <TouchableOpacity style={styles.tinyCTA} onPress={() => { getChats() }}>
                                <Ionicons name="refresh" size={24} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.tinyCTA} onPress={() => { handleAddChat() }}>
                                <Ionicons name="add-outline" size={24} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={[styles.container, { paddingTop: 20 }]}>
                    {chats.map(chat => (
                        <NotificationCard key={chat._id} item={chat} onPress={() => { console.log(chat._id) }} onRefresh={() => { getChats() }} />
                    ))}
                    {chats.length === 0 && <Text style={styles.empty}>
                        {`Coming Soon!\nStay tuned for upcoming updates.`}
                    </Text>}
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

                    <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/profile')}>
                        <View style={{ alignItems: 'center', gap: 2 }}>
                            <View style={[styles.tinyCTA, styles.profileCTA]}>
                                {user && <Image style={styles.profileImage} source={{ uri: user.photo }} />}
                            </View>
                            {/* <Text style={styles.navBarCTAText}>Profile</Text> */}
                        </View>
                        {/* <TouchableOpacity style={[styles.tinyCTA, styles.profileCTA]} onPress={() => router.push('/profile')}> */}
                        {/* </TouchableOpacity> */}
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