import React, { useState, useCallback } from 'react';
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, Dimensions, Platform, useColorScheme, StyleSheet, Image, TouchableOpacity, ScrollView, Touchable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Fontisto from '@expo/vector-icons/Fontisto';
import Octicons from '@expo/vector-icons/Octicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from "expo-secure-store";
import { getCurrentUser, fetchWithoutAuth, logout } from "../src/api";
import { ActivityIndicator } from 'react-native-paper';


const { width } = Dimensions.get('window');

export default function UserProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    // const [uploadingPicture, setUploadingPicture] = useState(false);

    let colorScheme = useColorScheme();
    const styles = styling(colorScheme, insets);
    const [user, setUser] = useState(null)
    const [gettingRating, setGettingRating] = useState(false)
    const [ratingsData, setRatingsData] = useState([])


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

    const handleEditProfile = () => {
        router.push("/editProfile")
    }

    const handleLogout = async () => {
        await logout();
        router.replace("/login");
    }

    const handleGoToJobDetails = (offerId: any) => {
        // Route to the unified details screen which expects serialized `data`
        router.push({
            pathname: '/helpOfferDetails',
            params: { data: JSON.stringify(offerId) }
        });
    }

    return (
        <View style={styles.appContainer}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <View style={styles.statusBar}></View>

            <View style={[styles.header, styles.container]}>
                <View style={[styles.paddedHeader, { marginBottom: 20 }]}>
                    <Text style={styles.pageTitle}>Profile</Text>
                    {user && ratingsData.length != 0 && <View style={[styles.row, { alignItems: 'center', gap: 20 }]}>
                        <View style={{ position: 'relative' }}>
                            <Image source={{ uri: user.photo }} style={styles.avatar} />
                            {/* {uploadingPicture && <ActivityIndicator size="small" color={'#fff'} style={{position:'absolute',top:18,left:18}} />} */}
                        </View>

                        <View style={{ flex: 1 }}>
                            <Text style={styles.name}>{user.firstname} {user.lastname}</Text>
                            <View style={[styles.row, { gap: 5 }]}>
                                <AntDesign
                                    name="star"
                                    size={12}
                                    color="#f2ff00"
                                />

                                <Text style={styles.metaText}>
                                    {ratingsData.totalReviews == 0 ? 'No ratings yet' : ratingsData.avgRating.toFixed(1)}
                                    ({ratingsData.totalReviews} review{ratingsData.totalReviews != 1 && 's'})
                                </Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20 }}>
                            <TouchableOpacity style={[styles.button, { paddingHorizontal: 0, marginBottom: 0 }]} onPress={() => handleEditProfile()}>
                                <FontAwesome name="edit" size={24} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.button, { paddingHorizontal: 0, marginBottom: 0 }]} onPress={() => router.push('/settings')}>
                                <Fontisto name="player-settings" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>}
                </View>
            </View>

            <ScrollView style={styles.container}>
                {/* Header */}
                {/* <View style={styles.header}>
                    <Text style={styles.email}>{user.email}</Text>
                </View> */}

                {user && user.bio && <View style={{ marginBottom: 30 }}>
                    <Text style={styles.sectionTitle}>About {user.firstname}</Text>
                    <Text style={[styles.infoValue, styles.fullInfoValue]}>{user.bio}</Text>
                </View>}

                {/* Account Info */}
                {user && <View style={{marginBottom:20}}>
                    <Text style={styles.sectionTitle}>Account Info</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>University</Text>
                        <Text style={styles.infoValue}>{user.university}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Major</Text>
                        <Text style={styles.infoValue}>{user.major}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Minor</Text>
                        <Text style={styles.infoValue}>{user.minor}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>GPA</Text>
                        <Text style={styles.infoValue}>{user.gpa}</Text>
                    </View>
                </View>}

                {user && <View style={{marginBottom:20}}>
                    <Text style={styles.sectionTitle}>Open jobs</Text>
                    <View style={styles.infoRow}>
                        {user.helpjobs.filter(job => job.status === "open").length == 0 ? (
                            <Text style={styles.infoLabel}>No opened jobs</Text>
                        ) : (
                            user.helpjobs
                                .filter(job => job.status === "open")
                                .map((job, index) => (
                                    <TouchableOpacity key={index} style={{ marginBottom: 8 }} onPress={()=>{handleGoToJobDetails(job.offer)}}>
                                        <Text style={styles.infoLabel}>
                                            Offer ID: {job._id}
                                        </Text>
                                        <Text style={styles.infoLabel}>
                                            Started: {new Date(job.startedAt).toLocaleDateString()}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                        )}
                    </View>
                </View>}

                {user && <View>
                    <Text style={styles.sectionTitle}>Completed jobs</Text>
                    <View style={styles.infoRow}>
                        {user.helpjobs.filter(job => job.status === "completed").length == 0 ? (
                            <Text style={styles.infoLabel}>No completed jobs</Text>
                        ) : (
                            user.helpjobs
                                .filter(job => job.status === "completed")
                                .map((job, index) => (
                                    <View key={index} style={{ marginBottom: 8 }}>
                                        <Text style={styles.infoLabel}>
                                            Offer ID: {job.offer?._id || job._id}
                                        </Text>
                                        <Text style={styles.infoLabel}>
                                            Completed: {new Date(job.completedAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                ))
                        )}
                    </View>
                </View>}


            </ScrollView>

            {/* Actions */}
            <View style={styles.container}>
                {/* <TouchableOpacity style={styles.button} onPress={() => handleEditProfile()}>
                    <FontAwesome name="edit" size={18} color="#fff" />
                    <Text style={styles.buttonText}>Edit Profile</Text>
                </TouchableOpacity> */}

                <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={() => handleLogout()}>
                    <FontAwesome name="sign-out" size={18} color="#fff" />
                    <Text style={styles.buttonText}>Logout</Text>
                </TouchableOpacity>
            </View>

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
            backgroundColor: '#2563EB',
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
            backgroundColor: '#2563EB'
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
        header: {
            marginBottom: 30,
            backgroundColor: colorScheme === 'dark' ? '#2563EB' : '#2563EB',
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,

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
            marginBottom: 5,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_700Bold'
        },
        avatar: {
            width: 60,
            height: 60,
            borderRadius: 50,
        },
        name: {
            fontSize: 24,
            color: '#fff',
            fontFamily: 'Manrope_700Bold',
            lineHeight: 24,
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
        infoLabel: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_600SemiBold'
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
            backgroundColor: '#ef4444',
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
            marginBottom: 30
        },
        metaText: {
            fontSize: 14,
            color: '#fff',
            fontFamily: 'Manrope_700Bold',
            lineHeight: 14
        },
    });
