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
import ChatCard from '../src/components/ChatCard';
import Entypo from '@expo/vector-icons/Entypo';
import { ActivityIndicator } from 'react-native-paper';


const { width } = Dimensions.get('window');

export default function MessagesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const styles = styling(colorScheme, insets);
    const [user, setUser] = useState<any>(null);
    const [chats, setChats] = useState<any[]>([]);
    const [chatsLoading, setChatsLoading] = useState(true);

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

            getUserInfo();
            getChats();
        }, [])
    );

    const getChats = async () => {
        setChatsLoading(true)
        try {
            const user = await getCurrentUser();
            if (!user?._id) {
                console.warn("⚠️ No user found, cannot fetch chats");
                return;
            }

            const res = await fetchWithAuth(`/chats/${user._id}`, {
                method: "GET",
            });

            if (!res.ok) {
                console.error("❌ Failed to fetch chats:", res.status);
                setChats([]);
                return;
            }

            const data = await res.json();

            if (data?.chats) {
                // Sort chats by recent activity
                const sorted = [...data.chats].sort((a, b) => {
                    const dateA = new Date(a.lastMessageAt || a.updatedAt).getTime();
                    const dateB = new Date(b.lastMessageAt || b.updatedAt).getTime();
                    return dateB - dateA;
                });

                setChats(sorted);
            } else {
                setChats([]);
            }
        } catch (err: any) {
            console.error("❌ Error loading chats:", err.message);
            setChats([]);
        } finally {
            setChatsLoading(false)
        }
    };

    const handleGoToChat = (chat:any) => {
        router.push({
            pathname: "/chat",
            params: {
                userId: chat.participants.find(p => p._id == user._id)._id,
                receiverId: chat.participants.find(p => p._id != user._id)._id,
                name: chat.participants.find(p => p._id != user._id).firstname + " " + chat.participants.find(p => p._id != user._id).lastname,
                avatar: chat.participants.find(p => p._id != user._id).photo
            },
        });
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
                            {/* <TouchableOpacity style={styles.tinyCTA} onPress={() => { handleAddChat() }}>
                                <Ionicons name="add-outline" size={24} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                            </TouchableOpacity> */}
                        </View>
                    </View>
                </View>

                {!chatsLoading && <View style={[{ padding: 0 }]}>
                    {chats.map(chat => (
                        <ChatCard key={chat._id} item={chat} onPress={() => { handleGoToChat(chat) }} onRefresh={() => { getChats() }} />
                    ))}
                    {chats.length !== 0 && <Text style={styles.empty}>
                        {`No chats yet.\n\nClose a help offer by accepting a bid or request to start chatting with the selected user`}
                    </Text>}
                </View>}
                {chatsLoading && <ActivityIndicator size='small' color={colorScheme==='dark'?'#fff':"#000"} style={{ marginTop: 20 }} />}
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

                    {/*

                                        <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/universityPosts')}>

                                            <View style={{ alignItems: 'center', gap: 2 }}>

                                                <FontAwesome5 name="university" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />

                                                <Text style={styles.navBarCTAText}>University</Text>

                                            </View>

                                        </TouchableOpacity>

                    

                                        

                    */}


                    <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/home')}>

                        <View style={{ alignItems: 'center', gap: 2 }}>

                            <FontAwesome5 name="home" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />

                            <Text style={styles.navBarCTAText}>Home</Text>

                        </View>

                    </TouchableOpacity><TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/offers')}>
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
            borderBottomLeftRadius:Platform.OS == 'ios' ? 60 : 30,
            borderBottomRightRadius:Platform.OS == 'ios' ? 60 : 30,
            marginBottom:10
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
            color: colorScheme === 'dark' ? '#fff' : "#000",
            paddingHorizontal:20,
            paddingTop:20,
        }
    });