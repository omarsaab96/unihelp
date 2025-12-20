import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from "@react-navigation/native";
import Octicons from '@expo/vector-icons/Octicons';
import * as Clipboard from "expo-clipboard";
import { useRouter } from 'expo-router';
import { localstorage } from '../utils/localStorage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
    ActivityIndicator,
    Dimensions,
    useColorScheme,
    Image,
    KeyboardAvoidingView, Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { getCurrentUser, fetchWithAuth, fetchWithoutAuth } from "../src/api";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AntDesign from '@expo/vector-icons/AntDesign';


const { width } = Dimensions.get('window');

export default function CertificateScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    let colorScheme = useColorScheme();
    const styles = styling(colorScheme, insets);

    const [userId, setUserId] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ratingsData, setRatingsData] = useState([])

    useFocusEffect(
        useCallback(() => {
            getUserInfo()
        }, [])
    );

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

        try {
            const res = await fetchWithoutAuth(`/tutors/ratings/${id}`);

            if (res.ok) {
                const data = await res.json();
                setRatingsData(data.data);
            }


        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const formatDate= (date: any) => {
        if (!date) return "";
        const d = new Date(date); // ✅ handle strings or Date objects
        if (isNaN(d.getTime())) return "Invalid date";

        return d.toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="small" color="#ddac0b" />
            </View>
        );
    }

    return (
        <View style={styles.appContainer}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <View style={styles.statusBar}></View>

            <View style={[styles.header, styles.container]}>
                <View style={[styles.paddedHeader, { marginBottom: 20 }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                        <Text style={styles.pageTitle}>Unihelp Certification</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View>
                {user && !loading && <ScrollView>
                    <View style={styles.contentContainer}>
                        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 30 }}>
                            {/* <Image source={{ uri: user.photo }} style={styles.avatar} /> */}
                            <Image source={colorScheme === 'dark' ?
                                require("../assets/images/logo_white.png")
                                :
                                require("../assets/images/logoBlack.png")}
                                style={styles.avatar}
                            />

                        </View>

                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 30 }}>
                            {/* <Text style={styles.name}>{user.firstname} {user.lastname}</Text> */}
                            {/* <View style={[styles.row, { gap: 5 }]}>
                                <AntDesign
                                    name="star"
                                    size={16}
                                    color="#facc15"
                                />

                                <Text style={styles.metaText}>
                                    {ratingsData.totalReviews == 0 ? 'No ratings yet' : ratingsData?.avgRating.toFixed(1)}
                                    ({ratingsData.totalReviews} review{ratingsData.totalReviews != 1 && 's'})
                                </Text>
                            </View> */}
                        </View>

                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom:30 }}>
                            <Text style={styles.paragraph}>
                                {`This document certifies that\n\n`}
                                <Text style={{ textTransform: 'capitalize', fontFamily: 'Manrope_600SemiBold', fontSize: 28 }}>{user.firstname} {user.lastname}</Text>
                                {`\n\nis an officially verified member of the Unihelp community.\nTheir dedication, expertise, and service excellence have contributed to helping students achieve academic success through the platform.`}
                            </Text>
                        </View>

                        <View style={styles.stats}>
                            <View style={[styles.stat]}>
                                <Text style={styles.statTitle}>Total Hours</Text>
                                <Text style={styles.statValue}>{user.totalHours || 0}</Text>
                            </View>
                            <View style={[styles.stat]}>
                                <Text style={styles.statTitle}>Total offers</Text>
                                <Text style={styles.statValue}>{user.offered}</Text>
                            </View>
                            <View style={[styles.stat]}>
                                <Text style={styles.statTitle}>Rating</Text>
                                <Text style={styles.statValue}>{user.rating.toFixed(1)}</Text>
                            </View>

                        </View>

                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom:30 }}>
                            <Text style={styles.paragraph}>
                                {formatDate(Date.now())}
                            </Text>
                        </View>
                    </View>
                </ScrollView>
                }
            </View>
        </View>
    );
}

const styling = (colorScheme: string, insets: any) =>
    StyleSheet.create({
        contentContainer: {
            padding: 20,
            paddingBottom: 130
        },
        error: {
            marginBottom: 15,
            backgroundColor: '#fce3e3',
            paddingHorizontal: 5,
            paddingVertical: 5,
            borderRadius: 5,
            flexDirection: 'row',
            alignItems: 'flex-start'
        },
        errorIcon: {
            width: 3,
            height: 15,
            backgroundColor: 'red',
            borderRadius: 5,
            marginRight: 10,
            marginTop: 3
        },
        errorText: {
            color: 'red',
            fontFamily: 'Acumin',
        },
        pageHeader: {
            backgroundColor: '#FF4000',
            height: 270,
            // marginBottom: 30
        },
        logo: {
            width: 120,
            height: 30,
            position: 'absolute',
            top: 30,
            left: 20,
            zIndex: 1,
        },
        headerTextBlock: {
            position: 'absolute',
            bottom: 20,
            left: 20,
            width: width - 40,
        },
        pageDesc: {
            color: '#ffffff',
            fontSize: 16,
            fontFamily: 'Acumin'
        },
        entity: {
            marginBottom: 20
        },
        title: {
            fontFamily: "Manrope_600SemiBold",
            fontSize: 20,
            color: colorScheme === 'dark' ? '#fff' : 'black'
        },
        subtitle: {
            fontFamily: "Acumin",
            fontSize: 16,
            // fontWeight: 'bold',
            width: '100%',
            textTransform: 'capitalize',
            color: colorScheme === 'dark' ? '#fff' : 'black'
        },
        paragraph: {
            fontFamily: "Manrope_400Regular",
            fontSize: 18,
            color: colorScheme === 'dark' ? '#fff' : 'black',
            textAlign: 'center'
        },
        profileImage: {
            position: 'absolute',
            bottom: 0,
            right: -5,
            height: '70%',
            maxWidth: 200,
            overflow: 'hidden',
        },
        profileImageAvatar: {
            height: '100%',
            width: undefined,
            aspectRatio: 1,
            resizeMode: 'contain',
        },
        profileActions: {
            borderTopWidth: 1,
            borderTopColor: 'rgba(0,0,0,0.2)',
            paddingTop: 10
        },
        inlineActions: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            columnGap: 15
        },
        profileButton: {
            borderRadius: 60,
            padding: 10,
            paddingHorizontal: 10,
            backgroundColor: '#ddac0b',
            marginBottom: 10,
            justifyContent: 'center'
        },
        savebtn: {
            flexDirection: 'row'
        },
        profileButtonText: {
            fontSize: 16,
            color: colorScheme === 'dark' ? '#fff' : '#fff',
            fontFamily: 'Manrope_600SemiBold',
        },
        input: {
            fontSize: 14,
            padding: 15,
            backgroundColor: '#F4F4F4',
            marginBottom: 16,
            color: 'black',
            borderRadius: 10
        },
        saveLoaderContainer: {
            marginLeft: 10
        },
        phoneContainer: {
            flexDirection: 'row',
            alignItems: 'stretch',
            width: '100%',
            marginBottom: 16,
            backgroundColor: '#F4F4F4',
            borderRadius: 10,
            paddingHorizontal: 15,
            paddingVertical: 12,
            gap: 5
        },
        phonePicker: {
            justifyContent: 'center',
            fontSize: 16
        },
        phoneInput: {
            marginBottom: 0,
            backgroundColor: 'transparent',
            flex: 1,
            padding: 0,
            fontSize: 16,
            lineHeight: Platform.OS == 'ios' ? 17 : 16,
        },
        verifiedbadge: {
            color: '#009933',
        },
        otpInputContainer: {
            borderWidth: 1,
            borderColor: colorScheme === 'dark' ? '#fff' : '#000',
            width: Platform.OS == 'ios' ? 40 : 35,
            height: 50,
            borderRadius: 10,
            marginHorizontal: 5,
            overflow: 'hidden',
            justifyContent: 'center',
            alignContent: 'center'
        },
        otpInput: {
            fontSize: 40,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            lineHeight: 45,
            padding: 0,
            includeFontPadding: false,
            textAlign: 'center',
        },
        backBtn: { flexDirection: "row", alignItems: "baseline", gap: 10 },
        appContainer: {
            flex: 1,
            backgroundColor: colorScheme === 'dark' ? '#111827' : '#f4f3e9',
        },
        scrollArea: {
            flex: 1
        },
        statusBar: {
            backgroundColor: '#ddac0b',
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
            backgroundColor: '#ddac0b'
        },
        fullCTAText: {
            color: '#fff'
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
            color: colorScheme === 'dark' ? '#ffcc00' : '#ff6f00'
        },
        hint: {
            fontSize: 16,
            color: '#ddac0b',
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
        header: {
            backgroundColor: colorScheme === 'dark' ? '#ddac0b' : '#ddac0b',
            borderBottomLeftRadius: Platform.OS == 'ios' ? 60 : 30,
            borderBottomRightRadius: Platform.OS == 'ios' ? 60 : 30,
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
            marginBottom: 30,
        },
        stat: {
            width: (width - 70) / 3,
            borderRadius: 30,
            padding: 15,
            backgroundColor: colorScheme === 'dark' ? '#2c3854' : '#e4e4e4',
        },
        statTitle: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            textAlign:'center'
        },
        statValue: {
            fontSize: 28,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_700Bold',            
            textAlign:'center'
        },
        topupBtn: {
        },
        topupIcon: {

        },
        avatar: {
            width: '60%',
            height: 100,
            objectFit: 'contain'
        },
        name: {
            fontSize: 34,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_700Bold',
            lineHeight: 40,
            marginBottom: 5,
            textTransform: 'capitalize'
        },
        email: {
            fontSize: 16,
            color: '#d1d5db',
            fontFamily: 'Manrope_400Regular'
        },
        sectionTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 16,
            marginBottom: 5,
            color: colorScheme === 'dark' ? '#fff' : "#000"
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
        button: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#2563eb',
            paddingVertical: 15,
            paddingHorizontal: 20,
            borderRadius: 60,
            marginBottom: 12,
            gap: 10
        },
        logoutButton: {
            backgroundColor: '#3d78f8',
            marginBottom: 0,
            marginTop: 10
        },
        buttonText: {
            color: '#fff',
            fontSize: 16,
            fontFamily: 'Manrope_700Bold'
        },
        pageTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 24,
            color: '#fff',
        },
        metaText: {
            fontSize: 16,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_700Bold',
            lineHeight: 20
        },
    });
