import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, Keyboard, Image, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Dimensions, TouchableOpacity, Text, Platform, useColorScheme, TextInput } from 'react-native';
import { RadioButton } from 'react-native-paper';
import { MD3LightTheme as DefaultTheme, Provider as PaperProvider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons'; import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import HelpOfferCard from '../src/components/HelpOfferCard';
import BottomSheet, { BottomSheetTextInput, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as SecureStore from "expo-secure-store";
import { getCurrentUser, fetchWithAuth, fetchWithoutAuth } from "../src/api";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useLocalSearchParams } from 'expo-router';
import Entypo from '@expo/vector-icons/Entypo';


const { width } = Dimensions.get('window');

const theme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: '#10b981', // Emerald green instead of blue
    },
};

export default function StudentsScreen() {
    const { tab } = useLocalSearchParams();
    const router = useRouter();
    let colorScheme = useColorScheme();
    const styles = styling(colorScheme);

    const [user, setUser] = useState(null);

    const [offers, setOffers] = useState([]);
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
    const [posting, setPosting] = useState(false);


    const filterRef = useRef<BottomSheet>(null);
    const sortRef = useRef<BottomSheet>(null);
    const newHelpRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["50%", "85%"], []);

    const [newHelpType, setNewHelpType] = useState('tutoring');
    const [newHelpSubject, setNewHelpSubject] = useState('');
    const [newHelpTitle, setNewHelpTitle] = useState('');
    const [newHelpDescription, setNewHelpDescription] = useState('');
    const [newHelpRate, setNewHelpRate] = useState('');
    const [newHelpDuration, setNewHelpDuration] = useState('');
    const [newHelpSeekRateMin, setNewHelpSeekRateMin] = useState('');
    const [newHelpSeekRateMax, setNewHelpSeekRateMax] = useState('');
    const [isStartPickerVisible, setStartPickerVisible] = useState(false);
    const [isEndPickerVisible, setEndPickerVisible] = useState(false);

    const [content, setContent] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterHelpType, setFilterHelpType] = useState('');
    const [filterAvailability, setFilterAvailability] = useState('');
    const [filterPriceRange, setFilterPriceRange] = useState('');
    const [offerHelpType, setofferHelpType] = useState('');
    const [sortBy, setSortBy] = useState<string | null>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [currency, setCurrency] = useState('TL');
    const [helpTab, setHelpTab] = useState('find');

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
        refreshOffers()
    }, []);

    useEffect(() => {
        if (tab === "offerHelp") {
            setTimeout(() => {
                handleOfferHelp();
            }, 1000)
        }
        if (tab === "seekHelp") {
            setTimeout(() => {
                handleSeekHelp();
            }, 1000)
        }
    }, [tab]);

    const handleSearchInput = (text: string) => {
        setKeyword(text);
        setLoading(false)

        if (debounceTimeout) clearTimeout(debounceTimeout);

        const timeout = setTimeout(async () => {
            if (text.trim().length >= 3 || text.trim().length === 0) {
                setLoading(true);
                try {
                    const res = await fetchWithoutAuth(`/helpOffers?q=${text}&page=1&limit=${pageLimit}`);

                    if (res.ok) {
                        const data = await res.json();

                        setOffers(data.data);
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
                refreshOffers();
            }
        }, 500);

        setDebounceTimeout(timeout);
    };

    const getSetFiltersCount = () => {
        let count = 0;

        if (filterSubject != '') count++;
        if (filterHelpType != '') count++;
        if (filterAvailability != '') count++;
        if (filterPriceRange != '') count++;

        return count;
    }

    const getSetSortsCount = () => {
        let count = 0;

        if (sortBy != 'date') count++;

        return count;
    }

    const clearFilters = async () => {
        setKeyword('');
        setFilterSubject('');
        setFilterHelpType('');
        setFilterAvailability('');
        setFilterPriceRange('');
        setSortBy('date');

        setPage(1);
        try {
            const res = await fetchWithoutAuth(`/helpOffers?page=1&limit=${pageLimit}`);

            if (res.ok) {
                const data = await res.json();
                setOffers(data.data);
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

    const loadOffers = useCallback(async () => {
        if (loading) return;

        setLoading(true);
        try {
            const res = await fetchWithoutAuth(`/helpOffers?${buildQueryParams(page)}`);

            if (res.ok) {
                const data = await res.json();

                setOffers(prev => [...prev, ...data.data]);
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
    }, [page, hasMore, loading, filterSubject, filterHelpType, filterAvailability, filterPriceRange, sortBy, sortOrder]);

    const refreshOffers = useCallback(async () => {
        setRefreshing(true);
        setPage(1);
        try {
            const res = await fetchWithoutAuth(`/helpOffers?${buildQueryParams(1)}`);

            if (res.ok) {
                const data = await res.json();
                setOffers(data.data);
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
    }, [page, hasMore, loading, keyword, filterSubject, filterHelpType, filterAvailability, filterPriceRange, sortBy, sortOrder]);

    const renderOffer = ({ item }: { item: any }) => (
        <HelpOfferCard offer={item} onPress={() => { handleGoToOfferDetails(item) }} />
    )

    const handleGoToOfferDetails = (offer: any) => {
        router.push({
            pathname: '/helpOfferDetails',
            params: { data: JSON.stringify(offer) }
        });
    }

    const handleFilters = () => {
        filterRef.current?.snapToIndex(0);
    };

    const handleSort = () => {
        sortRef.current?.snapToIndex(0);
    };

    const handleCloseModalPress = () => {
        filterRef.current?.close();
        sortRef.current?.close();
        newHelpRef.current?.close();
        Keyboard.dismiss();
    };

    const buildQueryParams = (pageNum: number, searchKeyword: string = keyword) => {
        const queryParams = new URLSearchParams();

        if (searchKeyword) queryParams.append("q", searchKeyword);
        if (filterSubject) queryParams.append("subject", filterSubject);
        if (filterHelpType) queryParams.append("helpType", filterHelpType);
        if (filterAvailability) queryParams.append("availability", filterAvailability);
        if (filterPriceRange) queryParams.append("priceRange", filterPriceRange);
        if (offerHelpType) queryParams.append("type", offerHelpType);

        if (sortBy) {
            queryParams.append("sortBy", sortBy);
            queryParams.append("sortOrder", sortOrder);
        }

        queryParams.append("page", String(pageNum));
        queryParams.append("limit", String(pageLimit));
        return queryParams.toString();
    };

    const applyFilters = async () => {
        setFiltering(true)
        setPage(1);
        await refreshOffers();
    };

    const applySorting = async () => {
        setSorting(true)
        setPage(1);
        await refreshOffers();
    };

    const handleOfferHelp = async () => {
        newHelpRef.current?.snapToIndex(0);
        setHelpTab('offer')
    }

    const handleSeekHelp = async () => {
        newHelpRef.current?.snapToIndex(0);
        setHelpTab('seek')
    }

    const handlePost = async () => {
        try {
            const token = await SecureStore.getItemAsync("accessToken");
            let newOfferData = {}

            console.warn(helpTab)

            if (helpTab == 'offer') {
                newOfferData = {
                    title: newHelpTitle,
                    description: newHelpDescription,
                    subject: newHelpSubject,
                    helpType: newHelpType,
                    price: Number(newHelpRate),
                    type: 'offer'
                };
            }

            if (helpTab == 'seek') {
                newOfferData = {
                    title: newHelpTitle,
                    description: newHelpDescription,
                    subject: newHelpSubject,
                    helpType: newHelpType,
                    duration: newHelpDuration,
                    priceMin: Number(newHelpSeekRateMin),
                    priceMax: Number(newHelpSeekRateMax),
                    type: 'seek'
                };
            }


            const response = await fetchWithAuth(`/helpOffers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(newOfferData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Something went wrong");
            }

            console.log("Success", `${helpTab == 'seek' ? 'Seek' : 'Offer'} Help offer created successfully!`);
            // reset form
            setHelpTab('offer')
            setNewHelpType('tutoring');
            setNewHelpSubject('');
            setNewHelpTitle('');
            setNewHelpDescription('');
            setNewHelpRate('');
            setNewHelpDuration('');
            setNewHelpSeekRateMin('');
            setNewHelpSeekRateMax('');
            handleCloseModalPress();
            refreshOffers();
        } catch (error) {
            console.error("Error creating help offer:", error);
            console.log("Error", error.message || "Failed to create help offer");
        }
    }

    const formatTime = (date) => {
        if (!date) return "Select time";
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <PaperProvider theme={theme}>
            <GestureHandlerRootView style={styles.appContainer}>
                <StatusBar style='light' />
                <View style={styles.statusBar}></View>

                <FlatList
                    style={styles.scrollArea}
                    data={offers}
                    renderItem={renderOffer}
                    keyExtractor={item => item._id}
                    ListHeaderComponent={
                        <View>
                            <View style={[styles.header, styles.container, styles.greenHeader]}>
                                <View style={[styles.paddedHeader]}>
                                    <View style={[styles.row, styles.between, { marginBottom: 30 }]}>
                                        <Text style={styles.pageTitle}>Students</Text>
                                        <View style={[styles.row, { gap: 10 }]}>
                                            {/* <TouchableOpacity
                                                style={[
                                                    styles.tinyCTA,
                                                    { paddingHorizontal: 10, width: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5 }
                                                ]}
                                                onPress={() => { }}
                                            >
                                                <Ionicons name="refresh" size={24} color="#fff" />
                                                <Text style={{color:'#fff',fontFamily:'Manrope_600SemiBold'}}>Browse tutors</Text>
                                            </TouchableOpacity> */}
                                            <TouchableOpacity style={styles.tinyCTA} onPress={() => { handleOfferHelp() }}>
                                                <Ionicons name="add-outline" size={24} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

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
                                    </View>
                                </View>
                            </View>

                            <View style={styles.container}>
                                <View style={{ gap: 5, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={styles.sectiontTitle}>Offers</Text>

                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                        {/* <TouchableOpacity style={[styles.fullCTA, { flex: 1 / 3 }]} onPress={() => handleOfferHelp()}>
                                            <View style={{ gap: 10, alignItems: 'center', justifyContent: 'center' }}>
                                                <MaterialCommunityIcons name="offer" size={34} color='#fff' />
                                                <Text
                                                    style={[
                                                        styles.fullCTAText,
                                                        { textAlign: 'center' }
                                                    ]}>
                                                    Offer help
                                                </Text>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={[styles.fullCTA, { flex: 1 / 3 }]} onPress={() => handleSeekHelp()}>
                                            <View style={{ gap: 10, alignItems: 'center', justifyContent: 'center' }}>
                                                <FontAwesome5 name="map-signs" size={30} color='#fff' />
                                                <Text
                                                    style={[
                                                        styles.fullCTAText,
                                                        { textAlign: 'center' }
                                                    ]}>
                                                    Seek help
                                                </Text>
                                            </View>
                                        </TouchableOpacity> */}

                                        <TouchableOpacity style={[styles.fullCTA]} onPress={() => router.push('/tutors')}>
                                            <View style={{ gap: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                                <MaterialCommunityIcons name="account-search" size={24} color='#fff' />
                                                <Text style={[styles.fullCTAText, { textAlign: 'center' }]}>Browse tutors</Text>
                                            </View>
                                            {/* <Feather name="arrow-right" size={16} color='#fff' /> */}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>
                    }
                    ListEmptyComponent={() => (
                        <Text style={[styles.empty, styles.container, { fontFamily: 'Manrope_400Regular' }]}>
                            No help offers available
                        </Text>
                    )}
                    onEndReached={() => { if (hasMore && !loading) loadOffers(); }}
                    onEndReachedThreshold={0.5}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshOffers} colors={['#10b981']} tintColor="#10b981" />}
                    ListFooterComponent={
                        <View style={styles.loadingFooter}>
                            {hasMore && loading && <ActivityIndicator size="large" color="#10b981" />}
                        </View>
                    }
                />

                {/* Create New Offer Button */}
                {/* <TouchableOpacity 
                    style={styles.createButton}
                    onPress={() => router.push('/createHelpOffer')}
                >
                    <Ionicons name="add" size={24} color="white" />
                    <Text style={styles.createButtonText}>Create Offer</Text>
                </TouchableOpacity> */}

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
                                <FontAwesome6 name="people-group" size={22} color={colorScheme === 'dark' ? '#10b981' : '#10b981'} />
                                <Text style={[styles.navBarCTAText, styles.activeText]}>Students</Text>
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

                {/* Filter Bottom Sheet */}
                <BottomSheet
                    ref={filterRef}
                    index={-1}
                    snapPoints={snapPoints}
                    enableDynamicSizing={false}
                    enablePanDownToClose={true}
                    backgroundStyle={styles.modal}
                    handleIndicatorStyle={styles.modalHandle}
                    backdropComponent={props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
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
                                        Show offers:
                                    </Text>
                                    <View>
                                        <RadioButton.Group
                                            onValueChange={(value) => setofferHelpType(value)}
                                            value={offerHelpType}
                                        >
                                            <View style={styles.radioGroup}>
                                                <TouchableOpacity style={styles.radioOption} onPress={() => setofferHelpType('offer')}>
                                                    <RadioButton value="offer" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Offering help
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.radioOption} onPress={() => setofferHelpType('seek')}>
                                                    <RadioButton value="seek" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Seeking Help
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.radioOption} onPress={() => setofferHelpType('both')}>
                                                    <RadioButton value="both" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Both
                                                    </Text>
                                                </TouchableOpacity>

                                            </View>
                                        </RadioButton.Group>
                                    </View>
                                </View>
                                <View>
                                    <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                        Subject
                                    </Text>
                                    <TextInput
                                        placeholder="e.g. Mathematics, Programming"
                                        placeholderTextColor="#aaa"
                                        style={styles.filterInput}
                                        value={filterSubject}
                                        onChangeText={setFilterSubject}
                                        selectionColor='#10b981'
                                    />
                                </View>

                                <View>
                                    <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                        Help Type
                                    </Text>
                                    <View>
                                        <RadioButton.Group
                                            onValueChange={(value) => setFilterHelpType(value)}
                                            value={filterHelpType}
                                        >
                                            <View style={styles.radioGroup}>
                                                <TouchableOpacity style={styles.radioOption} onPress={() => setFilterHelpType('tutoring')}>
                                                    <RadioButton value="tutoring" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Tutoring
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.radioOption} onPress={() => setFilterHelpType('project-help')}>
                                                    <RadioButton value="project-help" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Project Help
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.radioOption} onPress={() => setFilterHelpType('homework-help')}>
                                                    <RadioButton value="homework-help" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Homework Help
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.radioOption} onPress={() => setFilterHelpType('exam-prep')}>
                                                    <RadioButton value="exam-prep" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Exam Preparation
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </RadioButton.Group>
                                    </View>
                                </View>

                                <View>
                                    <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                        Availability
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.filterInput, { justifyContent: 'center' }]}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Text style={{ color: filterAvailability ? (colorScheme === 'dark' ? '#fff' : '#000') : '#aaa' }}>
                                            {filterAvailability || 'Select Availability'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View>
                                    <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                        Price Range
                                    </Text>
                                    <View>
                                        <RadioButton.Group
                                            onValueChange={(value) => setFilterPriceRange(value)}
                                            value={filterPriceRange}
                                        >
                                            <View style={styles.radioGroup}>
                                                <TouchableOpacity style={styles.radioOption} onPress={() => setFilterPriceRange('free')}>
                                                    <RadioButton value="free" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Free
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.radioOption} onPress={() => setFilterPriceRange('0-10')}>
                                                    <RadioButton value="0-10" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        $0 - $10
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.radioOption} onPress={() => setFilterPriceRange('10-20')}>
                                                    <RadioButton value="10-20" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        $10 - $20
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.radioOption} onPress={() => setFilterPriceRange('20+')}>
                                                    <RadioButton value="20+" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        $20+
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </RadioButton.Group>
                                    </View>
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
                                value={filterAvailability ? new Date(filterAvailability) : new Date()}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(Platform.OS === 'ios');
                                    if (selectedDate) setFilterAvailability(selectedDate.toISOString().split('T')[0]);
                                }}
                            />
                        )}
                    </BottomSheetView>
                </BottomSheet>

                {/* Sort Bottom Sheet */}
                <BottomSheet
                    ref={sortRef}
                    index={-1}
                    snapPoints={snapPoints}
                    enableDynamicSizing={false}
                    enablePanDownToClose={true}
                    backgroundStyle={styles.modal}
                    handleIndicatorStyle={styles.modalHandle}
                    backdropComponent={props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
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
                                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setSortBy('price')}>
                                                    <RadioButton value="price" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Price
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setSortBy('rating')}>
                                                    <RadioButton value="rating" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Rating
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
                    </BottomSheetView>
                </BottomSheet>

                {/* New Help Bottom Sheet */}
                <BottomSheet
                    ref={newHelpRef}
                    index={-1}
                    snapPoints={["95%"]}
                    enableDynamicSizing={false}
                    enablePanDownToClose={true}
                    backgroundStyle={styles.modal}
                    handleIndicatorStyle={styles.modalHandle}
                    backdropComponent={props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
                    keyboardBehavior="extend"
                    keyboardBlurBehavior="restore"
                >
                    <BottomSheetView style={{ zIndex: 1 }}>
                        <View style={[styles.modalHeader, { paddingTop: 10, paddingBottom: 0 }]}>
                            <View style={{ flexDirection: 'row', gap: 20 }}>
                                <TouchableOpacity
                                    onPress={() => { setHelpTab('offer') }}
                                >
                                    <Text style={[styles.modalTabTitle, helpTab == 'offer' && styles.activeTab, { paddingBottom: 15 }]}>Offer Help</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => { setHelpTab('seek') }}
                                >
                                    <Text style={[styles.modalTabTitle, helpTab == 'seek' && styles.activeTab, { paddingBottom: 15 }]}>Seek Help</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={[styles.modalClose, { marginBottom: 15 }]}
                                onPress={handleCloseModalPress}
                            >
                                <Ionicons name="close" size={24} color={colorScheme === 'dark' ? '#374567' : '#888'} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ paddingHorizontal: 15, paddingVertical: 10 }}>
                            {helpTab == 'offer' && <View>
                                <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                    Help Type
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                                    <TouchableOpacity
                                        style={[styles.typeCTA, newHelpType == "tutoring" && styles.selectedTypeCTA]}
                                        onPress={() => { setNewHelpType('tutoring') }
                                        }>
                                        <Text style={[
                                            styles.typeCTAText,
                                            newHelpType == "tutoring" && styles.selectedTypeCTAText
                                        ]}>Tutoring</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.typeCTA, newHelpType == "project-help" && styles.selectedTypeCTA]}
                                        onPress={() => { setNewHelpType('project-help') }
                                        }>
                                        <Text style={[
                                            styles.typeCTAText,
                                            newHelpType == "project-help" && styles.selectedTypeCTAText
                                        ]}>Project help</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.typeCTA, newHelpType == "homework-help" && styles.selectedTypeCTA]}
                                        onPress={() => { setNewHelpType('homework-help') }
                                        }>
                                        <Text style={[
                                            styles.typeCTAText,
                                            newHelpType == "homework-help" && styles.selectedTypeCTAText
                                        ]}>Homework help</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.typeCTA, newHelpType == "exam-prep" && styles.selectedTypeCTA]}
                                        onPress={() => { setNewHelpType('exam-prep') }
                                        }>
                                        <Text style={[
                                            styles.typeCTAText,
                                            newHelpType == "exam-prep" && styles.selectedTypeCTAText
                                        ]}>Exam prep</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                    Title
                                </Text>
                                <BottomSheetTextInput
                                    placeholder="e.g. Advanced calculus 101"
                                    placeholderTextColor="#aaa"
                                    style={styles.filterInput}
                                    value={newHelpTitle}
                                    onChangeText={setNewHelpTitle}
                                    selectionColor='#10b981'
                                />

                                <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                    Subject
                                </Text>
                                <BottomSheetTextInput
                                    placeholder="e.g. Mathematics"
                                    placeholderTextColor="#aaa"
                                    style={styles.filterInput}
                                    value={newHelpSubject}
                                    onChangeText={setNewHelpSubject}
                                    selectionColor='#10b981'
                                />

                                <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                    Description
                                </Text>
                                <BottomSheetTextInput
                                    multiline
                                    placeholder="e.g. I will help you understand and solve calculus assignments and concepts"
                                    placeholderTextColor="#aaa"
                                    style={[styles.filterInput, { minHeight: 40, textAlignVertical: "top" }]}
                                    value={newHelpDescription}
                                    onChangeText={setNewHelpDescription}
                                    selectionColor='#10b981'
                                />

                                {/* <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                    Availability
                                </Text> */}

                                {/* <View
                                    style={{
                                        flexDirection: "row",
                                        gap: 10,
                                        alignItems: "baseline",
                                        flexWrap: "wrap",
                                        marginBottom: 10
                                    }}
                                >
                                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                                        <TouchableOpacity
                                            key={day}
                                            style={[
                                                styles.typeCTA,
                                                newHelpAvailabilityDays.includes(day) && styles.selectedTypeCTA,
                                            ]}
                                            onPress={() => {
                                                setNewHelpAvailabilityDays((prev) =>
                                                    prev.includes(day)
                                                        ? prev.filter((d) => d !== day) // remove if already selected
                                                        : [...prev, day] // add if not selected
                                                );
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.typeCTAText,
                                                    newHelpAvailabilityDays.includes(day) && styles.selectedTypeCTAText,
                                                ]}
                                            >
                                                {day}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View> */}

                                {/* <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                                    <View style={{ flexDirection: "row", alignItems: 'baseline', gap: 5 }}>
                                        <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                            from
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.typeCTA}
                                            onPress={() => setStartPickerVisible(true)}
                                        >
                                            <Text style={styles.typeCTAText}>
                                                {newHelpAvailabilityStartTime ? formatTime(newHelpAvailabilityStartTime) : "Start Time"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{ flexDirection: "row", alignItems: 'baseline', gap: 5 }}>
                                        <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                            till
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.typeCTA}
                                            onPress={() => setEndPickerVisible(true)}
                                        >
                                            <Text style={styles.typeCTAText}>
                                                {newHelpAvailabilityEndTime ? formatTime(newHelpAvailabilityEndTime) : "End Time"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View> */}

                                {/* Start Time Picker */}
                                <DateTimePickerModal
                                    isVisible={isStartPickerVisible}
                                    mode="time"
                                    is24Hour={true}
                                    onConfirm={(time) => {
                                        setNewHelpAvailabilityStartTime(time);
                                        setStartPickerVisible(false);
                                    }}
                                    onCancel={() => setStartPickerVisible(false)}
                                />

                                {/* End Time Picker */}
                                <DateTimePickerModal
                                    isVisible={isEndPickerVisible}
                                    mode="time"
                                    is24Hour={true}
                                    onConfirm={(time) => {
                                        setNewHelpAvailabilityEndTime(time);
                                        setEndPickerVisible(false);
                                    }}
                                    onCancel={() => setEndPickerVisible(false)}
                                />

                                <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                    Rate per hour
                                </Text>
                                <View style={[styles.filterInputWithPrefix, { paddingLeft: 20, flexDirection: 'row', gap: 15, alignItems: 'center' }]}>
                                    <Text style={styles.filterInputWithPrefixText}>₺</Text>
                                    <BottomSheetTextInput
                                        placeholder="1000"
                                        placeholderTextColor="#aaa"
                                        style={[styles.filterInput, { flex: 1, paddingLeft: 0, minHeight: 40, textAlignVertical: "top", marginBottom: 0 }]}
                                        value={newHelpRate}
                                        onChangeText={setNewHelpRate}
                                        selectionColor='#10b981'
                                        keyboardType="numeric"
                                    />
                                </View>


                            </View>}

                            {helpTab == 'seek' && <View>
                                <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                    Help Type
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                                    <TouchableOpacity
                                        style={[styles.typeCTA, newHelpType == "tutoring" && styles.selectedTypeCTA]}
                                        onPress={() => { setNewHelpType('tutoring') }
                                        }>
                                        <Text style={[
                                            styles.typeCTAText,
                                            newHelpType == "tutoring" && styles.selectedTypeCTAText
                                        ]}>Tutoring</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.typeCTA, newHelpType == "project-help" && styles.selectedTypeCTA]}
                                        onPress={() => { setNewHelpType('project-help') }
                                        }>
                                        <Text style={[
                                            styles.typeCTAText,
                                            newHelpType == "project-help" && styles.selectedTypeCTAText
                                        ]}>Project help</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.typeCTA, newHelpType == "homework-help" && styles.selectedTypeCTA]}
                                        onPress={() => { setNewHelpType('homework-help') }
                                        }>
                                        <Text style={[
                                            styles.typeCTAText,
                                            newHelpType == "homework-help" && styles.selectedTypeCTAText
                                        ]}>Homework help</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.typeCTA, newHelpType == "exam-prep" && styles.selectedTypeCTA]}
                                        onPress={() => { setNewHelpType('exam-prep') }
                                        }>
                                        <Text style={[
                                            styles.typeCTAText,
                                            newHelpType == "exam-prep" && styles.selectedTypeCTAText
                                        ]}>Exam prep</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                    Title
                                </Text>
                                <BottomSheetTextInput
                                    placeholder="e.g. I need help with calculus"
                                    placeholderTextColor="#aaa"
                                    style={styles.filterInput}
                                    value={newHelpTitle}
                                    onChangeText={setNewHelpTitle}
                                    selectionColor='#10b981'
                                />

                                <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                    Subject
                                </Text>
                                <BottomSheetTextInput
                                    placeholder="e.g. Mathematics"
                                    placeholderTextColor="#aaa"
                                    style={styles.filterInput}
                                    value={newHelpSubject}
                                    onChangeText={setNewHelpSubject}
                                    selectionColor='#10b981'
                                />

                                <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                    Description
                                </Text>
                                <BottomSheetTextInput
                                    multiline
                                    placeholder="e.g. I need help to get better grades in calculus. I am seeking someone to have a 1 on 1 sessions"
                                    placeholderTextColor="#aaa"
                                    style={[styles.filterInput, { minHeight: 40, textAlignVertical: "top" }]}
                                    value={newHelpDescription}
                                    onChangeText={setNewHelpDescription}
                                    selectionColor='#10b981'
                                />

                                {/* <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                    Availability
                                </Text> */}

                                {/* <View
                                    style={{
                                        flexDirection: "row",
                                        gap: 10,
                                        alignItems: "baseline",
                                        flexWrap: "wrap",
                                        marginBottom: 10
                                    }}
                                >
                                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                                        <TouchableOpacity
                                            key={day}
                                            style={[
                                                styles.typeCTA,
                                                newHelpAvailabilityDays.includes(day) && styles.selectedTypeCTA,
                                            ]}
                                            onPress={() => {
                                                setNewHelpAvailabilityDays((prev) =>
                                                    prev.includes(day)
                                                        ? prev.filter((d) => d !== day) // remove if already selected
                                                        : [...prev, day] // add if not selected
                                                );
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.typeCTAText,
                                                    newHelpAvailabilityDays.includes(day) && styles.selectedTypeCTAText,
                                                ]}
                                            >
                                                {day}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View> */}

                                {/* <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                                    <View style={{ flexDirection: "row", alignItems: 'baseline', gap: 5 }}>
                                        <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                            from
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.typeCTA}
                                            onPress={() => setStartPickerVisible(true)}
                                        >
                                            <Text style={styles.typeCTAText}>
                                                {newHelpAvailabilityStartTime ? formatTime(newHelpAvailabilityStartTime) : "Start Time"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{ flexDirection: "row", alignItems: 'baseline', gap: 5 }}>
                                        <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                            till
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.typeCTA}
                                            onPress={() => setEndPickerVisible(true)}
                                        >
                                            <Text style={styles.typeCTAText}>
                                                {newHelpAvailabilityEndTime ? formatTime(newHelpAvailabilityEndTime) : "End Time"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View> */}

                                {/* Start Time Picker */}
                                <DateTimePickerModal
                                    isVisible={isStartPickerVisible}
                                    mode="time"
                                    is24Hour={true}
                                    onConfirm={(time) => {
                                        setNewHelpAvailabilityStartTime(time);
                                        setStartPickerVisible(false);
                                    }}
                                    onCancel={() => setStartPickerVisible(false)}
                                />

                                {/* End Time Picker */}
                                <DateTimePickerModal
                                    isVisible={isEndPickerVisible}
                                    mode="time"
                                    is24Hour={true}
                                    onConfirm={(time) => {
                                        setNewHelpAvailabilityEndTime(time);
                                        setEndPickerVisible(false);
                                    }}
                                    onCancel={() => setEndPickerVisible(false)}
                                />


                                <View style={{ flexDirection: 'row', gap: 10, alignItems:'baseline' }}>
                                    <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                        Expected duration in hours
                                    </Text>
                                    <View style={[styles.filterInputWithPrefix, { flex: 1, flexDirection: 'row', gap: 15, alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }]}>
                                        <BottomSheetTextInput
                                            placeholder="3"
                                            placeholderTextColor="#aaa"
                                            style={[styles.filterInput, { marginBottom: 0 }]}
                                            value={newHelpDuration}
                                            onChangeText={setNewHelpDuration}
                                            selectionColor='#10b981'
                                            keyboardType="numeric"
                                        />
                                        <Text style={styles.filterInputWithSuffixText}>Hour{parseInt(newHelpDuration)==1?'':'s'}</Text>
                                    </View>
                                </View>

                                <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                    Rate per hour (min-max)
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <View style={[styles.filterInputWithPrefix, { flex: 1, paddingLeft: 20, flexDirection: 'row', gap: 15, alignItems: 'center' }]}>
                                        <Text style={styles.filterInputWithPrefixText}>₺</Text>
                                        <BottomSheetTextInput
                                            placeholder="500"
                                            placeholderTextColor="#aaa"
                                            style={[styles.filterInput, { flex: 1, paddingLeft: 0, minHeight: 40, textAlignVertical: "top", marginBottom: 0 }]}
                                            value={newHelpSeekRateMin}
                                            onChangeText={setNewHelpSeekRateMin}
                                            selectionColor='#10b981'
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={[styles.filterInputWithPrefix, { flex: 1, paddingLeft: 20, flexDirection: 'row', gap: 15, alignItems: 'center' }]}>
                                        <Text style={styles.filterInputWithPrefixText}>₺</Text>
                                        <BottomSheetTextInput
                                            placeholder="1000"
                                            placeholderTextColor="#aaa"
                                            style={[styles.filterInput, { flex: 1, paddingLeft: 0, minHeight: 40, textAlignVertical: "top", marginBottom: 0 }]}
                                            value={newHelpSeekRateMax}
                                            onChangeText={setNewHelpSeekRateMax}
                                            selectionColor='#10b981'
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>



                            </View>}

                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 20 }}>
                                <TouchableOpacity
                                    onPress={handleCloseModalPress}
                                    style={[
                                        styles.postButton,
                                        styles.postSec
                                    ]}>
                                    <Text style={styles.postSecBtnText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handlePost}
                                    style={[
                                        styles.postButton,
                                        {
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 10
                                        }
                                    ]}
                                    disabled={posting}
                                >
                                    {posting && <ActivityIndicator size={'small'} color={'#fff'} />}
                                    <Text style={styles.postBtnText}>Post{posting ? 'ing' : ''}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </BottomSheetView>
                </BottomSheet>
            </GestureHandlerRootView >
        </PaperProvider >
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
            backgroundColor: '#10b981',
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
            borderColor: colorScheme === 'dark' ? '#fff' : '#fff',
        },
        typeCTA: {
            borderRadius: 25,
            alignItems: 'center',
            paddingVertical: 5,
            paddingHorizontal: 10,
            justifyContent: 'center',
            backgroundColor: colorScheme === "dark" ? "#131d33" : "#f9f9f9",
        },
        selectedTypeCTA: {
            backgroundColor: colorScheme === "dark" ? "#10b981" : "#10b981",
        },
        typeCTAText: {
            color: '#10b981',
            fontFamily: 'Manrope_600SemiBold'
        },
        selectedTypeCTAText: {
            color: '#fff',
        },
        fullCTA: {
            borderRadius: 25,
            paddingVertical: 5,
            paddingHorizontal: 10,
            backgroundColor: colorScheme === 'dark' ? '#131d33' : '#10b981'
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
            color: '#10b981'
        },
        profileImage: {
            width: '100%',
            height: '100%',
            objectFit: 'cover'
        },
        hint: {
            fontSize: 16,
            color: colorScheme === 'dark' ? '#10b981' : '#7d7f81',
        },
        banner: {
            backgroundColor: colorScheme === 'dark' ? '#111' : '#e4e4e4',
            borderRadius: 30,
            padding: 20
        },

        header: {
            marginBottom: 15,
        },
        greenHeader: {
            backgroundColor: '#10b981',
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
            marginBottom: 10
        },
        filterInputWithPrefix: {
            backgroundColor: colorScheme === "dark" ? "#131d33" : "#f9f9f9",
            borderRadius: 10,
        },
        filterInputWithPrefixText: {
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_400Regular',
            fontSize: 18
        },
        filterInputWithSuffixText: {
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_400Regular',
            fontSize: 14,
            paddingRight: 20
        },
        radiobtnText: {
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_500Medium',
            borderWidth: 1
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
            borderBottomWidth: 3,
            borderBottomColor: 'transparent'
        },
        modalTabTitle: {
            fontSize: 18,
            fontFamily: 'Manrope_700Bold',
            color: colorScheme === 'dark' ? '#58595a' : '#888',
            borderBottomWidth: 3,
            borderBottomColor: 'transparent'
        },
        activeTab: {
            borderBottomWidth: 3,
            borderBottomColor: '#10b981',
            color: colorScheme === 'dark' ? '#ffffff' : '#000',
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
            backgroundColor: '#10b981',
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
        },
        radioGroup: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        radioOption: {
            flexDirection: 'row',
            alignItems: 'center',
            minWidth: '45%',
        },
        createButton: {
            position: 'absolute',
            bottom: 120,
            right: 10,
            backgroundColor: '#10b981',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 25,
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            zIndex: 10,
            gap: 8,
        },
        createButtonText: {
            color: 'white',
            fontFamily: 'Manrope_600SemiBold',
            fontSize: 16,
        },
        sectiontTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 18,
            // marginBottom: 5,
            color: colorScheme === 'dark' ? '#fff' : "#000"
        },
        postButton: {
            backgroundColor: "#10b981",
            borderRadius: 20,
            paddingVertical: 6,
            paddingHorizontal: 16,
        },
        postSec: {
            backgroundColor: 'transparent',
        },
        postBtnText: {
            color: colorScheme === "dark" ? "#131d33" : "#f9f9f9",
            fontSize: 15,
            fontFamily: 'Manrope_700Bold',
        },
        postSecBtnText: {
            color: colorScheme === "dark" ? "#10b981" : "#10b981",
            fontSize: 15,
            fontFamily: 'Manrope_700Bold',
        },
    });