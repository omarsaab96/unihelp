import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, ScrollView, Keyboard, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Dimensions, TouchableOpacity, Text, Platform, useColorScheme, TextInput } from 'react-native';
import { RadioButton } from 'react-native-paper';
import { MD3LightTheme as DefaultTheme, Provider as PaperProvider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Fontisto from '@expo/vector-icons/Fontisto';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import SponsorsCard from '../../src/components/sponsorsCard';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import { getCurrentUser, fetchWithAuth } from "../../src/api";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { localstorage } from '../../utils/localStorage';
import Entypo from '@expo/vector-icons/Entypo';

const { width } = Dimensions.get('window');

const theme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: '#2563eb',
    },
};

export default function SponsorsScreen() {
    const router = useRouter();
    let colorScheme = useColorScheme();
    const styles = styling(colorScheme);

    const [user, setUser] = useState(null);

    const [events, setEvents] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        name: '',
        category: '',
        description: '',
        logo: '',
        website: '',
        contactinfo: {
            phone: '',
            whatsapp: '',
            facebook: '',
            instagram: ''
        }
    });


    useEffect(() => {
        const getUserInfo = async () => {
            try {
                const data = await getCurrentUser();
                if (data.error) {
                    console.error("Error", data.error);
                } else {
                    await localstorage.set('user', JSON.stringify(data))
                    setUser(data)
                }
            } catch (err) {
                console.error("Error", err.message);
            }
        }
        getUserInfo()
        refreshSponsors()
    }, []);

    const refreshSponsors = async () => {
        try {
            const res = await fetchWithAuth('/sponsors');

            if (res.ok) {
                const data = await res.json();
                // console.log(data.data)
                setEvents(data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const saveSponsor = async () => {
        try {
            const res = await fetchWithAuth('/sponsors', {
                method: 'POST',
                body: JSON.stringify(form),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                await refreshSponsors();
                setShowForm(false);
                setForm({
                    name: '',
                    category: '',
                    description: '',
                    logo: '',
                    website: '',
                    contactinfo: {
                        phone: '',
                        whatsapp: '',
                        facebook: '',
                        instagram: ''
                    }
                });
            } else {
                console.log("Error adding sponsor");
            }

        } catch (err) {
            console.error(err);
        }
    };

    const handleGoToDetails = (sponsorId: string) => {
        router.push(`/admin/offerDetails?sponsorId=${sponsorId}`);
    };

    return (
        <PaperProvider theme={theme}>
            <GestureHandlerRootView style={styles.appContainer}>
                <StatusBar style='light' />
                <View style={styles.statusBar}></View>

                <View style={[styles.header]}>
                    <View style={[styles.container, styles.redHeader]}>
                        <View style={[styles.paddedHeader, { marginBottom: 20 }]}>
                            <View style={[styles.row, styles.between, { marginBottom: 0 }]}>
                                <Text style={styles.pageTitle}>Sponsors</Text>
                                <View style={[styles.row, styles.between, { marginBottom: 0, gap: 20 }]}>
                                    <TouchableOpacity style={styles.tinyCTA} onPress={() => { setShowForm(true) }}>
                                        <Ionicons name="add-outline" size={24} color="#fff" />
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.tinyCTA} onPress={() => { refreshSponsors() }}>
                                        <Ionicons name="refresh" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                            </View>
                        </View>
                    </View>

                </View>

                {showForm ? (
                    <ScrollView style={[styles.scrollArea]}>
                        <Text style={styles.sectionTitle}>Add New Sponsor</Text>

                        <TextInput
                            placeholder="Sponsor Name"
                            placeholderTextColor="#999"
                            style={styles.filterInput}
                            value={form.name}
                            onChangeText={(text) => setForm({ ...form, name: text })}
                        />

                        <TextInput
                            placeholder="Category"
                            placeholderTextColor="#999"
                            style={styles.filterInput}
                            value={form.category}
                            onChangeText={(text) => setForm({ ...form, category: text })}
                        />

                        <TextInput
                            placeholder="Description"
                            placeholderTextColor="#999"
                            style={[styles.filterInput, { height: 120, textAlignVertical: 'top' }]}
                            multiline
                            value={form.description}
                            onChangeText={(text) => setForm({ ...form, description: text })}
                        />

                        <TextInput
                            placeholder="Logo URL"
                            placeholderTextColor="#999"
                            style={styles.filterInput}
                            value={form.logo}
                            onChangeText={(text) => setForm({ ...form, logo: text })}
                        />

                        <TextInput
                            placeholder="Website"
                            placeholderTextColor="#999"
                            style={styles.filterInput}
                            value={form.website}
                            onChangeText={(text) => setForm({ ...form, website: text })}
                        />

                        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Contact Info</Text>

                        <TextInput
                            placeholder="Phone"
                            placeholderTextColor="#999"
                            style={styles.filterInput}
                            value={form.contactinfo.phone}
                            onChangeText={(text) =>
                                setForm({ ...form, contactinfo: { ...form.contactinfo, phone: text } })
                            }
                        />

                        <TextInput
                            placeholder="Whatsapp"
                            placeholderTextColor="#999"
                            style={styles.filterInput}
                            value={form.contactinfo.whatsapp}
                            onChangeText={(text) =>
                                setForm({ ...form, contactinfo: { ...form.contactinfo, whatsapp: text } })
                            }
                        />

                        <TextInput
                            placeholder="Facebook"
                            placeholderTextColor="#999"
                            style={styles.filterInput}
                            value={form.contactinfo.facebook}
                            onChangeText={(text) =>
                                setForm({ ...form, contactinfo: { ...form.contactinfo, facebook: text } })
                            }
                        />

                        <TextInput
                            placeholder="Instagram"
                            placeholderTextColor="#999"
                            style={styles.filterInput}
                            value={form.contactinfo.instagram}
                            onChangeText={(text) =>
                                setForm({ ...form, contactinfo: { ...form.contactinfo, instagram: text } })
                            }
                        />

                        {/* Buttons */}
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 30 }}>
                            <TouchableOpacity
                                style={[styles.modalButton, { flex: 1 }]}
                                onPress={saveSponsor}
                            >
                                <Text style={styles.modalButtonText}>Save</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, { flex: 1, backgroundColor: '#888' }]}
                                onPress={() => setShowForm(false)}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 80 }} />
                    </ScrollView>
                ) : (
                    <ScrollView style={styles.scrollArea}>

                        {(loading || refreshing) && <View style={{ marginTop: 20 }}>
                            <ActivityIndicator size="small" color="#f85151" />
                        </View>}

                        {!loading && !refreshing && <>
                            {events?.length > 0 ? (
                                <>
                                    <Text style={{ width: 15, color: '#fff' }}>{events.length}</Text>
                                    {events.map((item) => (
                                        <SponsorsCard key={item._id} event={item} isFeatured={item.featured} onPress={() => handleGoToDetails(item._id)} />
                                    ))
                                    }
                                    <Text style={{ width: 15 }}></Text>
                                </>
                            ) : (
                                <View style={{ width, justifyContent: "center", alignItems: "center" }}>
                                    <Text style={[styles.empty, styles.container, { fontFamily: 'Manrope_400Regular' }]}>
                                        No sponsors
                                    </Text>
                                </View>
                            )}
                        </>}
                    </ScrollView>
                )}

                {/* navBar */}
                <View style={[styles.container, styles.SafeAreaPaddingBottom, { borderTopWidth: 1, paddingTop: 15, borderTopColor: colorScheme === 'dark' ? '#4b4b4b' : '#ddd' }]}>
                    <View style={[styles.row, { justifyContent: 'space-between', gap: 10 }]}>
                        <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/admin/adminPanel')}>
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

                        <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/admin/sponsors')}>
                            <View style={{ alignItems: 'center', gap: 2 }}>
                                <MaterialIcons name="local-offer" size={22} color={colorScheme === 'dark' ? '#f85151' : '#f85151'} />
                                <Text style={[styles.navBarCTAText, styles.activeText]}>Offers</Text>
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
            </GestureHandlerRootView>
        </PaperProvider>

    );
}

const styling = (colorScheme: string) =>
    StyleSheet.create({
        appContainer: {
            flex: 1,
            backgroundColor: colorScheme === 'dark' ? '#111827' : '#f4f3e9',
        },
        scrollArea: {
            flex: 1,
            paddingHorizontal: 20,
            paddingTop: 20
        },
        statusBar: {
            backgroundColor: '#f85151',
            height: Platform.OS === 'ios' ? 60 : 25
        },
        sectionTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 16,
            marginBottom: 5,
            color: colorScheme === 'dark' ? '#fff' : "#000",
            paddingHorizontal: 20
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
            borderColor: colorScheme === 'dark' ? '#fff' : '#fff',
        },
        fullCTA: {
            borderWidth: 1,
            borderRadius: 25,
            borderColor: colorScheme === 'dark' ? '#888' : '#ccc',
            padding: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
        },
        fullCTAText: {
            color: colorScheme === 'dark' ? '#fff' : "#000"
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
            color: '#f85151'
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

        header: {
            backgroundColor: colorScheme === 'dark' ? '#131d33' : '#fadede',
        },
        redHeader: {
            backgroundColor: '#f85151',
            borderBottomLeftRadius: Platform.OS == 'ios' ? 60 : 30,
            borderBottomRightRadius: Platform.OS == 'ios' ? 60 : 30,
        },
        paddedHeader: {
            paddingTop: 20,
            marginBottom: 20
        },
        pageTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 24,
            color: '#fff',
            // marginBottom: 30
        },
        filters: {

        },
        search: {
            position: 'relative'
        },
        searchInput: {
            borderWidth: 1,
            borderColor: 'white',
            borderRadius: 30,
            paddingVertical: 10,
            paddingLeft: 20,
            paddingRight: 50,
            color: 'white',
            fontFamily: 'Manrope_500Medium',
        },
        filterInput: {
            backgroundColor: colorScheme === "dark" ? "#131d33" : "#f9f9f9",
            borderRadius: 10,
            paddingVertical: 10,
            paddingLeft: 20,
            paddingRight: 50,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_500Medium',
        },
        searchIcon: {
            position: 'absolute',
            top: 10,
            right: 10,
            width: 20,
            height: 20
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
        empty: {
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_500Medium'
        },
        loadingFooter: {
            paddingVertical: 20,
            marginBottom: 50
        },
        modal: {
            backgroundColor: colorScheme === 'dark' ? '#111827' : '#f4f3e9',
        },
        modalHandle: {
            width: 50,
            backgroundColor: colorScheme === 'dark' ? '#2c3854' : '#aaa',
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 15,
            paddingBottom: 15,
            borderBottomWidth: 1,
            borderColor: colorScheme === 'dark' ? '#1a253d' : '#e4e4e4',
            color: colorScheme === 'dark' ? '#fff' : '#eee',
        },
        modalTitle: {
            fontSize: 18,
            fontFamily: 'Manrope_700Bold',
            color: colorScheme === 'dark' ? '#fff' : '#000',

        },
        modalClose: {
            padding: 5,
            borderWidth: 1,
            borderRadius: 20,
            borderColor: colorScheme === 'dark' ? '#2c3854' : '#000',
        },
        modalScrollView: {
            paddingHorizontal: 15,
            paddingVertical: 10
        },
        modalButton: {
            backgroundColor: '#2563EB',
            paddingVertical: 15,
            borderRadius: 60,
            alignItems: 'center',
            marginTop: 10,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 15
        },
        modalButtonText: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 16,
            color: '#fff'
        },
        filterBar: {
            paddingTop: 15
        },
        filterCTA: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
        },
        filterCTAText: {
            color: '#fff',
            fontFamily: 'Manrope_500Medium'
        }
    });