import React, { useState } from 'react';
import { View, ScrollView, Image, StyleSheet, SafeAreaView, Dimensions, TouchableOpacity, Text, Platform, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import Fontisto from '@expo/vector-icons/Fontisto';
import Octicons from '@expo/vector-icons/Octicons';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

export default function IndexScreen() {
    const router = useRouter();
    let colorScheme = useColorScheme();
    const styles = styling(colorScheme);

    return (
        <View style={styles.appContainer}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <View style={styles.statusBar}></View>

            <ScrollView style={styles.scrollArea}>
                <View style={[styles.header, styles.container]}>
                    <View style={[styles.paddedHeader, styles.row, styles.between, { marginBottom: 30 }]}>
                        <Image style={styles.minimalLogo} source={colorScheme === 'dark' ? require('../assets/images/minimalLogo_white.png') : require('../assets/images/minimalLogo_black.png')} />
                        <View style={[styles.row, { gap: 10 }]}>
                            <TouchableOpacity style={styles.tinyCTA} onPress={() => router.push('/notifications')}>
                                <Fontisto name="bell" size={22} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.tinyCTA} onPress={() => router.push('/messages')}>
                                <Octicons name="mail" size={22} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.tinyCTA, styles.profileCTA]} onPress={() => router.push('/profile')}>
                                <Image style={styles.profileImage} source={require('../assets/images/avatar.jpg')} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.greeting}>Hello, </Text>
                        <Text style={[styles.greeting, { fontFamily: 'Manrope_700Bold' }]}>Omar</Text>
                        <Text style={styles.greeting}>!</Text>
                    </View>
                    <View>
                        <Text style={styles.hint}>Lebanese Amercian University</Text>
                    </View>
                </View>

                <View style={styles.container}>
                    <View style={styles.stats}>
                        <View style={[styles.stat]}>
                            <Text style={styles.statTitle}>Total Points</Text>
                            <Text style={styles.statValue}>1250</Text>
                            <View style={[styles.row]}>
                                <Feather name="arrow-up" size={16} color="#05ce48" style={{ marginBottom: -2 }} />
                                <Text style={{ fontSize: 16, color: "#05ce48", flex: 1 }}>+35</Text>
                                {/* <Text style={styles.hint}> this month</Text> */}
                            </View>
                        </View>
                        <View style={[styles.stat]}>
                            <Text style={styles.statTitle}>Help Sessions</Text>
                            <Text style={styles.statValue} >24</Text>
                            <View style={[styles.row]}>
                                <Feather name="arrow-down" size={16} color={colorScheme === 'dark' ? '#f62f2f' : "#ce0505"} style={{ marginBottom: -2 }} />
                                <Text style={{ fontSize: 16, color: colorScheme === 'dark' ? '#f62f2f' : "#ce0505", flex: 1 }}>-35</Text>
                                {/* <Text style={styles.hint}> this month</Text> */}
                            </View>
                        </View>
                        <View style={[styles.stat]}>
                            <Text style={styles.statTitle}>Rating</Text>
                            <Text style={styles.statValue} >4.8</Text>
                            <View style={[styles.row]}>
                                <Feather name="arrow-up" size={16} color="#05ce48" style={{ marginBottom: -2 }} />
                                <Text style={{ fontSize: 16, color: "#05ce48", flex: 1 }}>+0.2</Text>
                                {/* <Text style={styles.hint}> this month</Text> */}
                            </View>
                        </View>
                        <View style={[styles.stat]}>
                            <Text style={styles.statTitle}>Response Time</Text>
                            <Text style={styles.statValue} >2h</Text>
                            <View style={[styles.row]}>
                                <Feather name="arrow-down" size={16} color={colorScheme === 'dark' ? '#f62f2f' : "#ce0505"} style={{ marginBottom: -2 }} />
                                <Text style={{ fontSize: 16, color: colorScheme === 'dark' ? '#f62f2f' : "#ce0505", flex: 1 }}>-15m </Text>
                                {/* <Text style={styles.hint}> this month</Text> */}
                            </View>
                        </View>
                    </View>

                    <View style={{ gap: 5, marginBottom: 30 }}>
                        <Text style={styles.sectiontTitle}>Quick Actions</Text>

                        <TouchableOpacity style={styles.fullCTA} onPress={() => router.push('/createPost')}>
                            <View style={[styles.row, { gap: 10 }]}>
                                <Fontisto name="bell" size={22} color='#fff' />
                                <Text style={styles.fullCTAText}>Offer help</Text>
                            </View>
                            <Feather name="arrow-right" size={16} color='#fff' />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.fullCTA} onPress={() => router.push('/studentsPosts')}>
                            <View style={[styles.row, { gap: 10 }]}>
                                <Fontisto name="bell" size={22} color='#fff' />
                                <Text style={styles.fullCTAText}>Find help</Text>
                            </View>
                            <Feather name="arrow-right" size={16} color='#fff' />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.fullCTA} onPress={() => router.push('/universityPosts')}>
                            <View style={[styles.row, { gap: 10 }]}>
                            <FontAwesome5 name="university" size={22} color='#fff' />
                                <Text style={styles.fullCTAText}>University events</Text>
                            </View>
                            <Feather name="arrow-right" size={16}  color='#fff' />
                        </TouchableOpacity>
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

                    <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/')}>
                        <View style={{ alignItems: 'center', gap: 2 }}>
                            <Fontisto name="bell" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                            <Text style={styles.navBarCTAText}>Page</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/universityPosts')}>
                        <View style={{ alignItems: 'center', gap: 2 }}>
                            <FontAwesome5 name="university" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                            <Text style={styles.navBarCTAText}>University</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/')}>
                        <View style={{ alignItems: 'center', gap: 2 }}>
                            <Fontisto name="bell" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                            <Text style={styles.navBarCTAText}>Page</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/')}>
                        <View style={{ alignItems: 'center', gap: 2 }}>
                            <Fontisto name="bell" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                            <Text style={styles.navBarCTAText}>Page</Text>
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
            padding: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor:'#2563EB'
        },
        fullCTAText: {
            color: '#fff'
        },
        profileCTA: {
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
            color: colorScheme === 'dark' ? '#2563EB' : '#7d7f81',
        },
        banner: {
            backgroundColor: colorScheme === 'dark' ? '#111' : '#e4e4e4',
            borderRadius: 30,
            padding: 20
        },
        sectiontTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 16,
            marginBottom: 5,
            color: colorScheme === 'dark' ? '#fff' : "#000" },
        header: {
            marginBottom: 30,
        },
        paddedHeader: {
            paddingTop: 20,
            marginBottom: 20
        },
        greeting: {
            fontSize: 32,
            color: colorScheme === 'dark' ? '#fff' : "#000"
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
            marginBottom: 5,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_700Bold'
        }
    });