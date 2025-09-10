import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, ScrollView, Image, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Dimensions, TouchableOpacity, Text, Platform, useColorScheme, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import Fontisto from '@expo/vector-icons/Fontisto';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import EventCard from '../src/components/EventCard';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import Constants from 'expo-constants';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

export default function UniversityPostsScreen() {
    const API_URL = Constants.expoConfig.extra.API_URL;
    const router = useRouter();
    let colorScheme = useColorScheme();
    const styles = styling(colorScheme);

    const [events, setEvents] = useState([]);
    const [keyword, setKeyword] = useState('')
    const [debounceTimeout, setDebounceTimeout] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const pageLimit = 10;
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const filterRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["50%", "85%"], []);

    const [filterDate, setFilterDate] = useState('');
    const [filterStartTime, setFilterStartTime] = useState('');
    const [filterEndTime, setFilterEndTime] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);


    useEffect(() => {
        refreshEvents()
    }, []);


    const handleSearchInput = (text: string) => {
        setKeyword(text);
        if (text.trim().length < 3) {
            setSearchResults([]);
            return;
        }

        // Clear previous timeout
        if (debounceTimeout) clearTimeout(debounceTimeout);

        // Set new debounce timeout
        const timeout = setTimeout(() => {
            if (text.trim().length >= 3) {
                const filtered = events.filter(e =>
                    e.title?.toLowerCase().includes(text.trim().toLowerCase())
                );

                setSearchResults(filtered);
            } else {
                setSearchResults([]);
            }
        }, 500); // delay: 500ms

        setDebounceTimeout(timeout);
    };

    const loadEvents = useCallback(async () => {
        if (!hasMore || loading) return;

        setLoading(true);
        try {
            // const token = await SecureStore.getItemAsync('userToken');
            const res = await fetch(`${API_URL}/universityEvents?page=${page}&limit=${pageLimit}`);

            if (res.ok) {
                const data = await res.json();
                setEvents(data.data);
                setHasMore(data.hasMore);
                setPage(data.page);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [page, hasMore, loading]);

    const refreshEvents = useCallback(async () => {
        setRefreshing(true);
        setPage(1);
        try {
            //     const token = await SecureStore.getItemAsync('userToken');
            const res = await fetch(`${API_URL}/universityEvents?page=1&limit=${pageLimit}`);

            if (res.ok) {
                const data = await res.json();
                setEvents(data.data);
                setHasMore(data.hasMore);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setRefreshing(false);
        }
    }, []);

    const renderEvent = ({ item }: { item: any }) => (
        <EventCard event={item} onPress={() => { console.log(item._id) }} />
    )

    const handleFilters = (chat: any) => {
        filterRef.current?.snapToIndex(0);
    };

    const handleCloseModalPress = () => {
        filterRef.current?.close();
    };

    const applyFilters = async () => {
        try {
            setLoading(true);
            setPage(1);

            const queryParams = new URLSearchParams();

            if (keyword) queryParams.append('q', keyword);
            if (filterDate) queryParams.append('date', filterDate);
            if (filterStartTime) queryParams.append('startTime', filterStartTime);
            if (filterEndTime) queryParams.append('endTime', filterEndTime);
            if (filterCategory) queryParams.append('category', filterCategory);
            queryParams.append('page', '1');
            queryParams.append('limit', String(pageLimit));

            const res = await fetch(`${API_URL}/universityEvents?${queryParams.toString()}`);

            if (res.ok) {
                const data = await res.json();
                setEvents(data.data);
                setHasMore(data.hasMore);
            } else {
                console.error('Error fetching filtered events');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            filterRef.current?.close();
        }
    };

    return (
        <GestureHandlerRootView style={styles.appContainer}>
            <StatusBar style='light' />
            <View style={styles.statusBar}></View>

            <FlatList
                style={styles.scrollArea}
                data={events}
                renderItem={renderEvent}
                keyExtractor={item => item._id}
                ListHeaderComponent={
                    <View style={[styles.header, styles.container, styles.blueHeader]}>
                        <View style={[styles.paddedHeader, { marginBottom: 20 }]}>
                            <Text style={styles.pageTitle}>University Events</Text>
                            <View style={styles.filters}>
                                <View style={styles.search}>
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search"
                                        placeholderTextColor="#ddd"
                                        value={keyword}
                                        onChangeText={handleSearchInput}
                                        selectionColor="#fff"
                                    />
                                    <Feather name="search" size={20} color="white" style={styles.searchIcon} />
                                </View>
                                <View>
                                    <TouchableOpacity onPress={() => handleFilters()}>
                                        <Text>Filters</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                }
                ListEmptyComponent={() => (
                    !loading && <Text style={[styles.empty, styles.container]}>
                        No University events
                    </Text>
                )}
                onEndReached={() => { if (hasMore && !loading) loadEvents(); }}
                onEndReachedThreshold={0.5}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshEvents} colors={['#2563EB']} tintColor="#2563EB" />}
                ListFooterComponent={
                    <View style={styles.loadingFooter}>
                        {hasMore && loading && <ActivityIndicator size="large" color="#2563EB" />}
                    </View>
                }
            />

            {/* navBar */}
            <View style={[styles.container, styles.SafeAreaPaddingBottom, { borderTopWidth: 1, paddingTop: 15, borderTopColor: colorScheme === 'dark' ? '#4b4b4b' : '#ddd' }]}>
                <View style={[styles.row, { justifyContent: 'space-between', gap: 10 }]}>
                    <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/')}>
                        <View style={{ alignItems: 'center', gap: 2 }}>
                            <MaterialIcons name="dashboard" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                            <Text style={styles.navBarCTAText}>Dashboard</Text>
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
                            <FontAwesome5 name="university" size={22} color={colorScheme === 'dark' ? '#2563EB' : '#2563EB'} />
                            <Text style={[styles.navBarCTAText, styles.activeText]}>University</Text>
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

            <BottomSheet
                ref={filterRef}
                index={-1}
                snapPoints={snapPoints}
                enableDynamicSizing={false}
                enablePanDownToClose={true}
                backgroundStyle={styles.modal}
                handleIndicatorStyle={styles.modalHandle}
                backdropComponent={props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
                // footerComponent={(footerProps) => (
                //     <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                //         <Text style={{ color: '#fff', fontWeight: 'bold' }}>Apply Filters</Text>
                //     </TouchableOpacity>
                // )}
                keyboardBehavior="interactive"
                keyboardBlurBehavior="restore"
            >
                <BottomSheetView>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Filters</Text>
                        <TouchableOpacity style={styles.modalClose} onPress={handleCloseModalPress} >
                            <Ionicons name="close" size={24} color={colorScheme === 'dark' ? '#374567' : '#888'} />
                        </TouchableOpacity>
                    </View>

                    <BottomSheetScrollView
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.modalScrollView}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={{ gap: 15 }}>
                            <View>
                                <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                    Date
                                </Text>
                                <TouchableOpacity
                                    style={[styles.filterInput, { justifyContent: 'center' }]}
                                    onPress={() => setShowPicker(true)}
                                >
                                    <Text style={{ color: filterDate ? (colorScheme === 'dark' ? '#fff' : '#000') : '#aaa' }}>
                                        {filterDate || 'Select Date'}
                                    </Text>
                                </TouchableOpacity>

                                {showPicker && (
                                    <DateTimePicker
                                        value={filterDate ? new Date(filterDate) : new Date()}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                        onChange={(event, selectedDate) => {
                                            setShowPicker(Platform.OS === 'ios'); // keep open for iOS inline
                                            if (selectedDate) setFilterDate(selectedDate.toISOString().split('T')[0]);
                                        }}
                                    />
                                )}
                            </View>

                            <View style={[styles.row, { gap: 10 }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                        Start Time
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.filterInput, { justifyContent: 'center' }]}
                                        onPress={() => setShowStartTimePicker(true)}
                                    >
                                        <Text style={{ color: filterStartTime ? (colorScheme === 'dark' ? '#fff' : '#000') : '#aaa' }}>
                                            {filterStartTime || 'Select Start Time'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flex: 1 }}>
                                    {/* End Time */}
                                    <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                        End Time
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.filterInput, { justifyContent: 'center' }]}
                                        onPress={() => setShowEndTimePicker(true)}
                                    >
                                        <Text style={{ color: filterEndTime ? (colorScheme === 'dark' ? '#fff' : '#000') : '#aaa' }}>
                                            {filterEndTime || 'Select End Time'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            
                            <View>
                                <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                    Category
                                </Text>
                                <TextInput
                                    placeholder="Category"
                                    placeholderTextColor={colorScheme === 'dark' ? '#fff' : '#000'}
                                    style={styles.filterInput}
                                    value={filterCategory}
                                    onChangeText={setFilterCategory}
                                    selectionColor='#2563EB'
                                />
                            </View>

                            <View>
                                <TouchableOpacity onPress={() => { applyFilters() }} style={styles.modalButton}>
                                    <Text style={styles.modalButtonText}>Apply filters</Text>
                                </TouchableOpacity>
                            </View>

                        </View>
                    </BottomSheetScrollView>

                    {showDatePicker && (
                        <DateTimePicker
                            value={filterDate ? new Date(filterDate) : new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'inline' : 'default'}
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(Platform.OS === 'ios'); // keep open for iOS inline
                                if (selectedDate) setFilterDate(selectedDate.toISOString().split('T')[0]);
                            }}
                        />
                    )}

                    {/* Start Time Picker */}
                    {showStartTimePicker && (
                        <DateTimePicker
                            value={filterStartTime ? new Date(`1970-01-01T${filterStartTime}`) : new Date()}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedTime) => {
                                setShowStartTimePicker(Platform.OS === 'ios');
                                if (selectedTime) {
                                    const hours = selectedTime.getHours().toString().padStart(2, '0');
                                    const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
                                    setFilterStartTime(`${hours}:${minutes}`);
                                }
                            }}
                        />
                    )}

                    {/* End Time Picker */}
                    {showEndTimePicker && (
                        <DateTimePicker
                            value={filterEndTime ? new Date(`1970-01-01T${filterEndTime}`) : new Date()}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedTime) => {
                                setShowEndTimePicker(Platform.OS === 'ios');
                                if (selectedTime) {
                                    const hours = selectedTime.getHours().toString().padStart(2, '0');
                                    const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
                                    setFilterEndTime(`${hours}:${minutes}`);
                                }
                            }}
                        />
                    )}
                </BottomSheetView>


            </BottomSheet>
        </GestureHandlerRootView>
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

        header: {
            marginBottom: 15,
        },
        blueHeader: {
            backgroundColor: '#2563EB',
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
        },
        paddedHeader: {
            paddingTop: 20,
            marginBottom: 20
        },
        pageTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 24,
            color: '#fff',
            marginBottom: 30
        },
        filters: {

        },
        search: {
            position: 'relative'
        },
        searchInput: {
            borderWidth: 1,
            borderColor: 'white',
            borderRadius: 20,
            paddingVertical: 10,
            paddingLeft: 20,
            paddingRight: 50,
            color: 'white',
            fontFamily: 'Manrope_500Medium',
        },
        filterInput: {
            borderWidth: 1,
            borderColor: colorScheme === 'dark' ? '#fff' : '#000',
            borderRadius: 20,
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
            borderRadius: 25,
            alignItems: 'center',
            marginTop: 10
        },
        modalButtonText: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 16,
            color: '#fff'
        }
    });