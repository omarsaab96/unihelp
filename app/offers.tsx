import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, ScrollView, Image, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Dimensions, TouchableOpacity, Text, Platform, useColorScheme, TextInput } from 'react-native';
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
import SponsorsCard from '../src/components/sponsorsCard';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import { getCurrentUser, fetchWithoutAuth } from "../src/api";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as SecureStore from "expo-secure-store";

const { width } = Dimensions.get('window');

const theme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: '#2563eb',
    },
};

export default function OffersScreen() {
    const router = useRouter();
    let colorScheme = useColorScheme();
    const styles = styling(colorScheme);

    const [user, setUser] = useState(null);

    const [events, setEvents] = useState([]);
    const [keyword, setKeyword] = useState('')
    const [debounceTimeout, setDebounceTimeout] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageLimit = 10;
    const [hasMore, setHasMore] = useState(true);

    const [loading, setLoading] = useState(true);
    const [filtering, setFiltering] = useState(true);
    const [sorting, setSorting] = useState(true);

    const filterRef = useRef<BottomSheet>(null);
    const sortRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["50%", "85%"], []);

    const [filterDate, setFilterDate] = useState('');
    const [filterStartTime, setFilterStartTime] = useState('');
    const [filterEndTime, setFilterEndTime] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [sortBy, setSortBy] = useState<string | null>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const [showPicker, setShowPicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);

    useEffect(() => {
        const getUserInfo = async () => {
            try {
                const data = await getCurrentUser();
                if (data.error) {
                    console.error("Error", data.error);
                } else {
                    await SecureStore.setItem('user', JSON.stringify(data))
                    setUser(data)
                }
            } catch (err) {
                console.error("Error", err.message);
            }
        }
        getUserInfo()
        refreshSponsors()
    }, []);

    const handleSearchInput = (text: string) => {
        setKeyword(text);
        setLoading(false)

        if (debounceTimeout) clearTimeout(debounceTimeout);

        const timeout = setTimeout(async () => {
            if (text.trim().length >= 3 || text.trim().length === 0) {
                setLoading(true);
                try {
                    const res = await fetchWithoutAuth(`/universityEvents?q=${text}&page=1&limit=${pageLimit}`);

                    if (res.ok) {
                        const data = await res.json();

                        setEvents(data.data);
                        setHasMore(data.hasMore);
                        setPage(data.page + 1);
                        setTotal(data.total);
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    setFiltering(false);
                    setSorting(false);
                    setLoading(false);
                    handleCloseModalPress();
                }
            } else {
                refreshSponsors();
            }
        }, 500);

        setDebounceTimeout(timeout);
    };

    const getSetFiltersCount = () => {
        let count = 0;

        if (filterDate != '') count++;
        if (filterStartTime != '') count++;
        if (filterEndTime != '') count++;
        if (filterCategory != '') count++;

        return count;
    }

    const getSetSortsCount = () => {
        let count = 0;

        if (sortBy != 'date') count++;

        return count;
    }

    const clearFilters = async () => {
        setKeyword('');
        setFilterDate('');
        setFilterStartTime('');
        setFilterEndTime('');
        setFilterCategory('');
        setSortBy('date');

        setPage(1);
        try {
            //     const token = await SecureStore.getItemAsync('userToken');
            const res = await fetchWithoutAuth(`/universityEvents?page=1&limit=${pageLimit}`);

            if (res.ok) {
                const data = await res.json();
                setEvents(data.data);
                setHasMore(data.hasMore);
                setTotal(data.total);
                setPage(2);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setFiltering(false);
            setSorting(false);
            setRefreshing(false);
            handleCloseModalPress();
        }
    }

    const loadEvents = useCallback(async () => {
        if (loading) return;

        setLoading(true);
        try {
            const res = await fetchWithoutAuth(`/universityEvents?${buildQueryParams(page)}`);

            if (res.ok) {
                const data = await res.json();

                setEvents(prev => [...prev, ...data.data]);
                setHasMore(data.hasMore);
                setPage(data.page + 1);
                setTotal(data.total);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setFiltering(false);
            setSorting(false);
            setLoading(false);
            handleCloseModalPress();
        }
    }, [page, hasMore, loading, filterDate, filterStartTime, filterEndTime, filterCategory, sortBy, sortOrder]);

    const refreshSponsors = useCallback(async () => {
        setRefreshing(true);
        setPage(1);
        try {
            //     const token = await SecureStore.getItemAsync('userToken');
            const res = await fetchWithoutAuth(`/universityEvents?${buildQueryParams(1)}`);

            if (res.ok) {
                const data = await res.json();
                setEvents(data.data);
                setHasMore(data.hasMore);
                setTotal(data.total);
                setPage(2);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setFiltering(false);
            setSorting(false);
            setRefreshing(false);
            handleCloseModalPress();
        }
    }, [page, hasMore, loading, keyword, filterDate, filterStartTime, filterEndTime, filterCategory, sortBy, sortOrder]);

    const renderEvent = ({ item }: { item: any }) => (
        <SponsorsCard event={item} onPress={() => { console.log(item._id) }} />
    )

    const handleFilters = () => {
        filterRef.current?.snapToIndex(0);
    };

    const handleSort = () => {
        sortRef.current?.snapToIndex(0);
    };

    const handleCloseModalPress = () => {
        filterRef.current?.close();
        sortRef.current?.close();
    };

    const buildQueryParams = (pageNum: number, searchKeyword: string = keyword) => {
        const queryParams = new URLSearchParams();

        if (searchKeyword) queryParams.append("q", searchKeyword);
        if (filterDate) queryParams.append("date", filterDate);
        if (filterStartTime) queryParams.append("startTime", filterStartTime);
        if (filterEndTime) queryParams.append("endTime", filterEndTime);
        if (filterCategory) queryParams.append("category", filterCategory);

        if (sortBy) {
            queryParams.append("sortBy", sortBy);
            queryParams.append("sortOrder", sortOrder);
        }

        queryParams.append("page", String(pageNum));
        queryParams.append("limit", String(pageLimit));
        console.log(queryParams.toString())
        return queryParams.toString();
    };

    const applyFilters = async () => {
        setFiltering(true)
        setPage(1);
        await refreshSponsors();
        // filterRef.current?.close();
    };

    const applySorting = async () => {
        setSorting(true)
        setPage(1);
        await refreshSponsors();
        // sortRef.current?.close();
    };

    return (
        <PaperProvider theme={theme}>
            <GestureHandlerRootView style={styles.appContainer}>
                <StatusBar style='light' />
                <View style={styles.statusBar}></View>

                <View style={[styles.header]}>
                    <View style={[styles.container, styles.redHeader]}>
                        <View style={[styles.paddedHeader, { marginBottom: 20 }]}>
                            <Text style={styles.pageTitle}>Sponsors and Offers</Text>
                            {/* <View style={styles.filters}>
                            <View style={styles.search}>
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search"
                                    placeholderTextColor="#eee"
                                    value={keyword}
                                    onChangeText={handleSearchInput}
                                    selectionColor="#fff"
                                />
                                <Feather name="search" size={20} color="white" style={styles.searchIcon} />
                            </View>
                            <View style={[styles.filterBar, styles.row, { gap: 20 }]}>
                                <Text style={{ color: '#fff', fontFamily: 'Manrope_500Medium' }}>
                                    {`${total} offer${total !== 1 ? 's' : ''}`}
                                </Text>
                                <Text style={{ color: '#fff', fontFamily: 'Manrope_500Medium' }}>•</Text>
                                <View style={[styles.row, { gap: 20 }]}>
                                    <TouchableOpacity style={styles.filterCTA} onPress={() => handleFilters()}>
                                        <MaterialIcons name="filter-alt" size={16} color="#fff" />
                                        <Text style={styles.filterCTAText}>
                                            Filter {getSetFiltersCount() > 0 ? `(${getSetFiltersCount()})` : ''}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.filterCTA} onPress={() => handleSort()}>
                                        <FontAwesome5 name="sort" size={16} color="#fff" />
                                        <Text style={styles.filterCTAText}>
                                            Sort {getSetSortsCount() > 0 ? `(${getSetSortsCount()})` : ''}
                                        </Text>
                                    </TouchableOpacity>
                                    {(getSetFiltersCount() > 0 || getSetSortsCount() > 0) && <TouchableOpacity style={styles.filterCTA} onPress={() => clearFilters()}>
                                        <MaterialIcons name="clear" size={16} color="#fff" />
                                        <Text style={styles.filterCTAText}>
                                            Clear
                                        </Text>
                                    </TouchableOpacity>
                                    }
                                </View>
                            </View>
                        </View> */}
                        </View>
                    </View>

                </View>

                <ScrollView style={styles.scrollArea}>

                    {/* First Slider */}
                    <Text style={
                        [
                            styles.sectionTitle,
                            {
                                marginBottom: 0,
                                paddingTop: 25,
                                backgroundColor: colorScheme === 'dark' ? '#131d33' : '#fadede',
                            }
                        ]}>Featured Sponsors</Text>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        snapToAlignment="center"
                        decelerationRate="fast"
                        style={{
                            flexGrow: 0,
                            marginBottom: 20,
                            backgroundColor: colorScheme === 'dark' ? '#131d33' : '#fadede',
                            paddingBottom: 20, paddingTop: 10
                        }}
                    >
                        {events.length > 0 ? (
                            <>
                                <Text style={{ width: 15 }}></Text>
                                {events.map((item) => (
                                    <SponsorsCard key={item._id} event={item} isFeatured={true} onPress={() => console.log(item._id)} />
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
                    </ScrollView>

                    {/* Second Slider */}
                    <Text style={styles.sectionTitle}>Normal Sponsors</Text>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        snapToAlignment="center"
                        decelerationRate="fast"
                        style={{ flexGrow: 0, marginBottom: 50 }}
                    >
                        {events.length > 0 ? (
                            <>
                                <Text style={{ width: 15 }}></Text>
                                {events.map((item) => (
                                    <SponsorsCard event={item} key={item._id + "02"} onPress={() => console.log(item._id)} />
                                ))}
                                <Text style={{ width: 15 }}></Text>
                            </>
                        ) : (
                            <View style={{ width, justifyContent: "center", alignItems: "center" }}>
                                <Text style={[styles.empty, styles.container, { fontFamily: 'Manrope_400Regular' }]}>
                                    No sponsors
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Third Slider */}
                    <Text style={styles.sectionTitle}>Offers</Text>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        snapToAlignment="center"
                        decelerationRate="fast"
                        style={{ flexGrow: 0, marginBottom: 30 }}
                    >
                        {events.length > 0 ? (
                            <>
                                <Text style={{ width: 15 }}></Text>
                                {events.map((item) => (
                                    <SponsorsCard key={item._id + "03"} event={item} onPress={() => console.log(item._id)} />
                                ))}
                                <Text style={{ width: 15 }}></Text>

                            </>
                        ) : (
                            <View style={{ width, justifyContent: "center", alignItems: "center" }}>
                                <Text style={[styles.empty, styles.container, { fontFamily: 'Manrope_400Regular' }]}>
                                    No sponsors
                                </Text>
                            </View>
                        )}
                    </ScrollView>

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
                                <MaterialIcons name="local-offer" size={22} color={colorScheme === 'dark' ? '#f85151' : '#f85151'} />
                                <Text style={[styles.navBarCTAText, styles.activeText]}>Offers</Text>
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
                                    <TouchableOpacity onPress={() => { applyFilters() }} style={styles.modalButton} disabled={filtering}>
                                        <Text style={styles.modalButtonText}>Apply filters</Text>
                                        {filtering && <ActivityIndicator size='small' color={'#fff'} />}
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
                                is24Hour={true}
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
                                is24Hour={true}
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

                <BottomSheet
                    ref={sortRef}
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
                            <Text style={styles.modalTitle}>Sort</Text>
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
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                        Sort by
                                    </Text>
                                    <View>
                                        <RadioButton.Group
                                            onValueChange={(value) => setSortBy(value)}
                                            value={sortBy}
                                        >
                                            <View>
                                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setSortBy('date')}>
                                                    <RadioButton value="date" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Date
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setSortBy('enrolled')}>
                                                    <RadioButton value="enrolled" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Total enrolled
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setSortBy('reward.points')}>
                                                    <RadioButton value="reward.points" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Points Reward
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setSortBy('reward.money')}>
                                                    <RadioButton value="reward.money" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Money Reward
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </RadioButton.Group>
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                        Order by
                                    </Text>
                                    <View>
                                        <RadioButton.Group
                                            onValueChange={(value) => setSortOrder(value)}
                                            value={sortOrder}
                                        >
                                            <View>
                                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setSortOrder('asc')}>
                                                    <RadioButton value="asc" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Ascending
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setSortOrder('desc')}>
                                                    <RadioButton value="desc" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Descending
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </RadioButton.Group>
                                    </View>
                                </View>

                                <View>
                                    <TouchableOpacity onPress={() => { applySorting() }} style={styles.modalButton} disabled={sorting}>
                                        <Text style={styles.modalButtonText}>Sort</Text>
                                        {sorting && <ActivityIndicator size='small' color={'#fff'} />}
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