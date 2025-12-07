import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, Keyboard, Alert, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Dimensions, TouchableOpacity, Text, Platform, useColorScheme, TextInput } from 'react-native';
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
import BottomSheet, { BottomSheetTextInput, BottomSheetFooter, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as SecureStore from "expo-secure-store";
import { getCurrentUser, fetchWithAuth, fetchWithoutAuth } from "../src/api";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useLocalSearchParams } from 'expo-router';
import Entypo from '@expo/vector-icons/Entypo';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EventCard from '../src/components/EventCard';


const { width } = Dimensions.get('window');

const theme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: '#2563EB',
    },
};

export default function UniversityStaff() {
    const { tab } = useLocalSearchParams();
    const router = useRouter();
    let colorScheme = useColorScheme();
    const insets = useSafeAreaInsets();

    const styles = styling(colorScheme, insets);
    const [activeTab, setActiveTab] = useState('offer');


    const [user, setUser] = useState(null);

    const [offers, setOffers] = useState([]);
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
    const [posting, setPosting] = useState(false);


    const filterRef = useRef<BottomSheet>(null);
    const sortRef = useRef<BottomSheet>(null);
    const newHelpRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["55%", "90%"], []);

    const [newHelpType, setNewHelpType] = useState('tutoring');
    const [newHelpSubject, setNewHelpSubject] = useState('');
    const [newHelpSkills, setNewHelpSkills] = useState('');
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


    const [filterDate, setFilterDate] = useState('');
    const [filterStartTime, setFilterStartTime] = useState('');
    const [filterEndTime, setFilterEndTime] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [eventsSortBy, setEventsSortBy] = useState<string | null>('date');
    const [eventsSortOrder, setEventsSortOrder] = useState<'asc' | 'desc'>('desc');
    const loadingRef = useRef(false);
    const [showPicker, setShowPicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const createRef = useRef<BottomSheet>(null);
    const [newEventName, setNewEventName] = useState('');
    const [newEventDescription, setNewEventDescription] = useState('');
    const [newEventCategory, setNewEventCategory] = useState('');
    const [newEventLocation, setNewEventLocation] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventStartTime, setNewEventStartTime] = useState('');
    const [newEventEndTime, setNewEventEndTime] = useState('');
    const [newEventTotalNeeded, setNewEventTotalNeeded] = useState('');
    const [newEventEnrollmentDeadline, setNewEventEnrollmentDeadline] = useState('');
    const [newEventRequirements, setNewEventRequirements] = useState('');
    const [newEventRewardPoints, setNewEventRewardPoints] = useState('');
    const [newEventRewardMoney, setNewEventRewardMoney] = useState('');
    const [showNewEventPicker, setShowNewEventPicker] = useState(false);
    const [showNewEventEnrollementPicker, setShowNewEventEnrollementPicker] = useState(false);
    const [showNewEventStartTimePicker, setShowNewEventStartTimePicker] = useState(false);
    const [showNewEventEndTimePicker, setShowNewEventEndTimePicker] = useState(false);
    const [creatingEvent, setCreatingEvent] = useState(false);

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
    }, []);

    useEffect(() => {
        if (!user) return;
        refreshOffers()
    }, [user]);

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
    }, [user, page, hasMore, loading, filterSubject, filterHelpType, filterAvailability, filterPriceRange, sortBy, sortOrder]);

    const refreshOffers = useCallback(async () => {
        if (!user) return;
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
    }, [user, page, hasMore, loading, keyword, filterSubject, filterHelpType, filterAvailability, filterPriceRange, sortBy, sortOrder]);

    const renderOffer = ({ item }: { item: any }) => (
        <HelpOfferCard offer={item} color={'#2563EB'} onPress={() => { handleGoToOfferDetails(item) }} />
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
        createRef.current?.close();
        Keyboard.dismiss();
    };

    const buildQueryParams = (pageNum: number, searchKeyword: string = keyword) => {
        if (!user) return "";
        const queryParams = new URLSearchParams();

        queryParams.append("userRole", "staff");
        queryParams.append("university", user?.university._id);
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

        // console.log(queryParams.toString())
        return queryParams.toString();
    };

    const buildEventsQueryParams = (pageNum: number, searchKeyword: string = keyword) => {
        if (!user) return "";
        const queryParams = new URLSearchParams();

        queryParams.append("userRole", "staff");
        queryParams.append("university", user?.university._id);
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
        // console.log(queryParams.toString())
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
        if (newHelpSeekRateMax < newHelpSeekRateMin) {
            Alert.alert("Error", " Max rate cannot be less the min rate");
            return;
        }

        if (helpTab == 'offer' && (parseInt(newHelpRate) < 100)) {
            Alert.alert("Error", "Min rate cannot be less than 100");
            return;
        }

        if (helpTab == 'seek' && (parseInt(newHelpSeekRateMin) < 100)) {
            Alert.alert("Error", "Min rate cannot be less than 100");
            return;
        }

        setPosting(true)

        try {

            const token = await SecureStore.getItemAsync("accessToken");
            let newOfferData = {}

            console.warn(helpTab)

            if (helpTab == 'offer') {
                newOfferData = {
                    title: newHelpTitle,
                    description: newHelpDescription,
                    subject: newHelpSubject,
                    skills: newHelpSkills,
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
                    skills: newHelpSkills,
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
            setNewHelpSkills('');
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
            Alert.alert("Error", error.message)
        } finally {
            setPosting(false)
        }
    }

    const formatTime = (date) => {
        if (!date) return "Select time";
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const loadEvents = useCallback(async () => {
        if (loadingRef.current) return;
        if (!user) return;

        loadingRef.current = true;
        setLoading(true);
        try {
            const res = await fetchWithoutAuth(`/staffEvents/${user.university._id}?${buildEventsQueryParams(page)}`);

            if (res.ok) {
                const data = await res.json();
                console.log("here")
                console.log(data)
                setEvents(prev => [...prev, ...data.data]);
                setHasMore(data.hasMore);
                setPage(prev => prev + 1);
                setTotal(data.total);
            }
        } catch (err) {
            console.error(err);
        } finally {
            loadingRef.current = false;
            setFiltering(false);
            setSorting(false);
            setLoading(false);
            handleCloseModalPress();
        }
    }, [user, page, hasMore, loading, filterDate, filterStartTime, filterEndTime, filterCategory, eventsSortBy, eventsSortOrder]);

    const refreshEvents = useCallback(async () => {
        if (!user) return;
        setRefreshing(true);
        setPage(1);
        try {
            //     const token = await SecureStore.getItemAsync('userToken');
            const res = await fetchWithoutAuth(`/staffEvents/${user.university._id}?${buildEventsQueryParams(1)}`);

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
            setLoading(false)
        }
    }, [user, page, hasMore, loading, keyword, filterDate, filterStartTime, filterEndTime, filterCategory, eventsSortBy, eventsSortOrder]);

    const renderEvent = ({ item }: { item: any }) => (
        <EventCard event={item} isEnrolled={item.enrolled.some(x => x == user._id)} onPress={() => { handleEnrollUser(item._id) }} />
    );

    const handleEnrollUser = async (eventId) => {
        if (!user) return;

        const payload = {
            enrollingUserId: user._id
        };

        try {
            const res = await fetchWithoutAuth(`/staffEvents/${eventId}/enroll`, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Failed to enroll");
                return;
            }

            console.log("Enroll success:", data);

            // Refresh your events or the specific event card
            refreshEvents?.();
        } catch (err) {
            console.error("Enroll error:", err);
            alert("Something went wrong while enrolling.");
        }
    };

    const handleCreateEvent = () => {
        createRef.current?.snapToIndex(0);
    }

    const createEvent = async () => {
        if (!user) return;

        setCreatingEvent(true);

        const newEvent = {
            title: newEventName,
            description: newEventDescription,
            category: newEventCategory,
            location: newEventLocation,
            date: newEventDate,
            startTime: newEventStartTime,
            endTime: newEventEndTime,
            university: user.university._id,
            totalNeeded: newEventTotalNeeded,
            enrollementDeadline: newEventEnrollmentDeadline,
            requirements: newEventRequirements,
            reward: {
                points: newEventRewardPoints,
                money: newEventRewardMoney,
                currency: '₺'
            }
        }

        try {
            const res = await fetchWithoutAuth(`/staffEvents`, {
                method: "POST",
                body: JSON.stringify(newEvent),
            });

            const data = await res.json();

            if (!res.ok) {
                console.log("Error:", data);
                alert(data.error || "Failed to create event");
                return;
            }

            console.log("Created Event:", data);

            // Refresh list after creation
            await refreshEvents();

            alert("Event created successfully!");
        } catch (err) {
            console.error("Create event error:", err);
            alert("Something went wrong while creating the event.");
        } finally {
            setCreatingEvent(false);
        }
    }

    return (
        <PaperProvider theme={theme}>
            <GestureHandlerRootView style={styles.appContainer}>
                <StatusBar style='light' />
                <View style={styles.statusBar}></View>

                <View>
                    <View style={[styles.header, styles.container, styles.greenHeader]}>
                        <View style={[styles.paddedHeader]}>
                            <View style={[styles.row, styles.between, { marginBottom: 30 }]}>
                                <View style={[styles.row, styles.between, { marginBottom: 0 }]}>
                                    <TouchableOpacity style={[styles.row, { gap: 10, marginBottom: 0 }]} onPress={() => { router.back() }}>
                                        <Ionicons name="chevron-back" size={24} color="#fff" style={{ transform: [{ translateY: 3 }] }} />
                                        <Text style={styles.pageTitle}>Staff Help Offers</Text>
                                    </TouchableOpacity>
                                </View>
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
                                    {user && user.role == "staff" && <TouchableOpacity style={styles.tinyCTA} onPress={() => {
                                        if (activeTab == "events") {
                                            handleCreateEvent()
                                        } else {
                                            handleOfferHelp()
                                        }
                                    }}>
                                        <Ionicons name="add-outline" size={24} color="#fff" />
                                    </TouchableOpacity>}
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
                                <View style={[styles.filterBar, styles.row, { gap: 20, justifyContent: 'center' }]}>
                                    <Text style={{ color: '#fff', fontFamily: 'Manrope_500Medium' }}>
                                        {`${total} offer${total !== 1 ? 's' : ''}`}
                                        {/* {`${hasMore?'T':'F'}`} */}
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

                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                <View style={styles.tabs}>
                                    <TouchableOpacity onPress={() => { setActiveTab('offer') }} style={[styles.tab, activeTab == 'offer' && styles.activeHeaderTab]}>
                                        <Text style={styles.tabText}>Offer</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { setActiveTab('seek') }} style={[styles.tab, activeTab == 'seek' && styles.activeHeaderTab]}>
                                        <Text style={styles.tabText}>Seek</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { setActiveTab('events') }} style={[styles.tab, activeTab == 'events' && styles.activeHeaderTab]}>
                                        <Text style={styles.tabText}>Staff Events</Text>
                                    </TouchableOpacity>
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

                                <TouchableOpacity style={[styles.fullCTA]} onPress={() => router.push('/staff')}>
                                    <View style={{ gap: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                        <MaterialCommunityIcons name="account-search" size={24} color='#fff' />
                                        <Text style={[styles.fullCTAText, { textAlign: 'center' }]}>Browse staff</Text>
                                    </View>
                                    {/* <Feather name="arrow-right" size={16} color='#fff' /> */}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {activeTab == 'seek' && <FlatList
                    style={styles.scrollArea}
                    data={offers.filter(offer => offer.type == 'seek')}
                    renderItem={renderOffer}
                    keyExtractor={item => item._id}
                    ListEmptyComponent={() => (
                        <Text style={[styles.empty, styles.container, { fontFamily: 'Manrope_400Regular' }]}>
                            No help offers available
                        </Text>
                    )}
                    onEndReached={() => { if (hasMore && !loading) loadOffers(); }}
                    onEndReachedThreshold={0.5}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshOffers} colors={['#2563EB']} tintColor="#2563EB" />}
                    ListFooterComponent={
                        <View style={styles.loadingFooter}>
                            {hasMore && loading && <ActivityIndicator size="small" color="#2563EB" />}
                        </View>
                    }
                />}

                {activeTab == 'offer' && <FlatList
                    style={styles.scrollArea}
                    data={offers.filter(offer => offer.type == 'offer')}
                    renderItem={renderOffer}
                    keyExtractor={item => item._id}
                    ListEmptyComponent={() => (
                        <Text style={[styles.empty, styles.container, { fontFamily: 'Manrope_400Regular' }]}>
                            No help offers available
                        </Text>
                    )}
                    onEndReached={() => { if (hasMore && !loading) loadOffers(); }}
                    onEndReachedThreshold={0.5}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshOffers} colors={['#2563EB']} tintColor="#2563EB" />}
                    ListFooterComponent={
                        <View style={styles.loadingFooter}>
                            {hasMore && loading && <ActivityIndicator size="small" color="#2563EB" />}
                        </View>
                    }
                />}

                {activeTab == 'events' && <FlatList
                    style={styles.scrollArea}
                    data={events}
                    renderItem={renderEvent}
                    keyExtractor={item => item._id}
                    ListEmptyComponent={() => (
                        <Text style={[styles.empty, styles.container, { fontFamily: 'Manrope_400Regular' }]}>
                            No staff events
                        </Text>
                    )}
                    onEndReached={() => { if (hasMore && !loading) loadEvents(); }}
                    onEndReachedThreshold={0.1}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshEvents} colors={['#2563EB']} tintColor="#2563EB" />}
                    ListFooterComponent={
                        <View style={styles.loadingFooter}>
                            {hasMore && loading && <ActivityIndicator size="small" color="#2563EB" />}
                        </View>
                    }
                />}

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
                    keyboardBehavior="extend"
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
                                {/* <View>
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
                                            </View>
                                        </RadioButton.Group>
                                    </View>
                                </View> */}

                                <View>
                                    <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                        Subject
                                    </Text>
                                    <BottomSheetTextInput
                                        placeholder="e.g. Mathematics, Programming"
                                        placeholderTextColor="#aaa"
                                        style={styles.filterInput}
                                        value={filterSubject}
                                        onChangeText={setFilterSubject}
                                        selectionColor='#2563EB'
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

                                {/* <View>
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
                                </View> */}

                                {/* <View>
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
                                </View> */}

                                <View>
                                    <TouchableOpacity onPress={() => { applyFilters() }} style={styles.modalButton} disabled={filtering}>
                                        <Text style={styles.modalButtonText}>Apply filters</Text>
                                        {filtering && <ActivityIndicator size='small' color={'#fff'} />}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </BottomSheetScrollView>

                        {/* {showDatePicker && (
                            <DateTimePicker
                                value={filterAvailability ? new Date(filterAvailability) : new Date()}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(Platform.OS === 'ios');
                                    if (selectedDate) setFilterAvailability(selectedDate.toISOString().split('T')[0]);
                                }}
                            />
                        )} */}
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
                    keyboardBehavior="extend"
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
                    snapPoints={["90%"]}
                    enableDynamicSizing={false}
                    enablePanDownToClose={true}
                    backgroundStyle={styles.modal}
                    handleIndicatorStyle={styles.modalHandle}
                    backdropComponent={props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
                    keyboardBehavior="extend"
                    keyboardBlurBehavior="restore"
                    enableContentPanningGesture={false}
                >
                    <View style={[styles.modalHeader, { paddingTop: 10, paddingBottom: 10 }]}>
                        <View style={{ flexDirection: 'row', gap: 20 }}>
                            <TouchableOpacity onPress={() => setHelpTab('offer')}>
                                <Text style={[styles.modalTabTitle, helpTab === 'offer' && styles.activeTab]}>
                                    Offer Help
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setHelpTab('seek')}>
                                <Text style={[styles.modalTabTitle, helpTab === 'seek' && styles.activeTab]}>
                                    Seek Help
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={handleCloseModalPress} style={styles.modalClose}>
                            <Ionicons name="close" size={24} color={colorScheme === 'dark' ? '#374567' : '#888'} />
                        </TouchableOpacity>
                    </View>
                    <BottomSheetScrollView
                        style={{ flex: 1, paddingHorizontal: 15, paddingTop: 20 }}
                        keyboardShouldPersistTaps="handled"
                        simultaneousHandlers={newHelpRef}
                    >
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
                                selectionColor='#2563EB'
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
                                selectionColor='#2563EB'
                            />

                            <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                Your skills
                            </Text>
                            <BottomSheetTextInput
                                placeholder="e.g. Algebra, Trigonometry, Derivatives,..."
                                placeholderTextColor="#aaa"
                                style={styles.filterInput}
                                value={newHelpSkills}
                                onChangeText={setNewHelpSkills}
                                selectionColor='#2563EB'
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
                                selectionColor='#2563EB'
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
                                    selectionColor='#2563EB'
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
                                selectionColor='#2563EB'
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
                                selectionColor='#2563EB'
                            />

                            <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                Skills needed
                            </Text>
                            <BottomSheetTextInput
                                placeholder="e.g. Algebra, Trigonometry, Derivatives,..."
                                placeholderTextColor="#aaa"
                                style={styles.filterInput}
                                value={newHelpSkills}
                                onChangeText={setNewHelpSkills}
                                selectionColor='#2563EB'
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
                                selectionColor='#2563EB'
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


                            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'baseline' }}>
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
                                        selectionColor='#2563EB'
                                        keyboardType="numeric"
                                    />
                                    <Text style={styles.filterInputWithSuffixText}>Hour{parseInt(newHelpDuration) == 1 ? '' : 's'}</Text>
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
                                        selectionColor='#2563EB'
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
                                        selectionColor='#2563EB'
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>



                        </View>}

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 20, marginBottom: 40 }}>
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
                                    styles.postButton
                                ]}
                                disabled={posting}
                            >
                                <Text style={styles.postBtnText}>Post{posting ? 'ing' : ''}</Text>
                                {posting && <ActivityIndicator size={'small'} color={colorScheme === "dark" ? "#131d33" : "#f9f9f9"} />}
                            </TouchableOpacity>
                        </View>
                    </BottomSheetScrollView>

                </BottomSheet>

                <BottomSheet
                    ref={filterRef}
                    index={-1}
                    snapPoints={snapPoints}
                    enableDynamicSizing={false}
                    enablePanDownToClose={true}
                    enableContentPanningGesture={(Platform.OS === 'ios' && showPicker) ? false : true}
                    backgroundStyle={styles.modal}
                    handleIndicatorStyle={styles.modalHandle}
                    backdropComponent={props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
                    // footerComponent={(footerProps) => (
                    //     <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                    //         <Text style={{ color: '#fff', fontWeight: 'bold' }}>Apply Filters</Text>
                    //     </TouchableOpacity>
                    // )}
                    keyboardBehavior="extend"
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
                                        onPress={() => {
                                            setShowPicker(true)
                                            setShowStartTimePicker(false);
                                            setShowEndTimePicker(false)
                                            if (Platform.OS == 'ios') { filterRef.current?.expand() }
                                        }}
                                    >
                                        <Text style={{ color: filterDate ? (colorScheme === 'dark' ? '#fff' : '#000') : '#aaa' }}>
                                            {filterDate || 'Select Date'}
                                        </Text>

                                        {showPicker && (
                                            <DateTimePicker
                                                value={filterDate ? new Date(filterDate) : new Date()}
                                                mode="date"
                                                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                                onChange={(event, selectedDate) => {
                                                    setShowPicker(false); // keep open for iOS inline
                                                    if (selectedDate) setFilterDate(selectedDate.toISOString().split('T')[0]);
                                                }}
                                            />
                                        )}
                                    </TouchableOpacity>

                                    {/* {showPicker && (
                                        <DateTimePicker
                                            style={Platform.OS === 'ios' && {opacity:0.5,position:'absolute', top:0,left:0,right:0}}
                                            value={filterDate ? new Date(filterDate) : new Date()}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'compact' : 'default'}
                                            onChange={(event, selectedDate) => {
                                                setShowPicker(Platform.OS === 'ios'); // keep open for iOS inline
                                                if (selectedDate) setFilterDate(selectedDate.toISOString().split('T')[0]);
                                            }}
                                        />
                                    )} */}
                                </View>

                                <View style={[styles.row, { gap: 10 }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                            Start Time
                                        </Text>
                                        <TouchableOpacity
                                            style={[styles.filterInput, { justifyContent: 'center' }]}
                                            onPress={() => {
                                                setShowPicker(false);
                                                setShowStartTimePicker(true);
                                                setShowEndTimePicker(false);
                                                if (Platform.OS == 'ios') { filterRef.current?.expand() }
                                            }}
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
                                            onPress={() => {
                                                setShowPicker(false);
                                                setShowStartTimePicker(false);
                                                setShowEndTimePicker(true)
                                                if (Platform.OS == 'ios') { filterRef.current?.expand() }
                                            }}
                                        >
                                            <Text style={{ color: filterEndTime ? (colorScheme === 'dark' ? '#fff' : '#000') : '#aaa' }}>
                                                {filterEndTime || 'Select End Time'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {showStartTimePicker && (
                                    <DateTimePicker
                                        value={filterStartTime ? new Date(`1970-01-01T${filterStartTime}`) : new Date()}
                                        mode="time"
                                        is24Hour={true}
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(event, selectedTime) => {
                                            setShowStartTimePicker(Platform.OS == 'ios');
                                            if (selectedTime) {
                                                const hours = selectedTime.getHours().toString().padStart(2, '0');
                                                const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
                                                setFilterStartTime(`${hours}:${minutes}`);
                                            }
                                        }}
                                    />
                                )}

                                {showEndTimePicker && (
                                    <DateTimePicker
                                        value={filterEndTime ? new Date(`1970-01-01T${filterEndTime}`) : new Date()}
                                        mode="time"
                                        is24Hour={true}
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(event, selectedTime) => {
                                            setShowEndTimePicker(Platform.OS == 'ios');
                                            if (selectedTime) {
                                                const hours = selectedTime.getHours().toString().padStart(2, '0');
                                                const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
                                                setFilterEndTime(`${hours}:${minutes}`);
                                            }
                                        }}
                                    />
                                )}

                                <View>
                                    <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                        Category
                                    </Text>
                                    <BottomSheetTextInput
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
                    keyboardBehavior="extend"
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
                                            onValueChange={(value) => setEventsSortBy(value)}
                                            value={eventsSortBy}
                                        >
                                            <View>
                                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setEventsSortBy('date')}>
                                                    <RadioButton value="date" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Date
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setEventsSortBy('enrolled')}>
                                                    <RadioButton value="enrolled" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Total enrolled
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setEventsSortBy('reward.points')}>
                                                    <RadioButton value="reward.points" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Points Reward
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setEventsSortBy('reward.money')}>
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
                                            onValueChange={(value) => setEventsSortOrder(value)}
                                            value={eventsSortOrder}
                                        >
                                            <View>
                                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setEventsSortOrder('asc')}>
                                                    <RadioButton value="asc" />
                                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                                                        Ascending
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setEventsSortOrder('desc')}>
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
                                    <TouchableOpacity onPress={() => { applyEventsSorting() }} style={styles.modalButton} disabled={sorting}>
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

                {/* create event */}
                <BottomSheet
                    ref={createRef}
                    index={-1}
                    snapPoints={["90%"]}
                    enableDynamicSizing={false}
                    enablePanDownToClose={true}
                    backgroundStyle={styles.modal}
                    handleIndicatorStyle={styles.modalHandle}
                    backdropComponent={props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
                    keyboardBehavior="extend"
                    keyboardBlurBehavior="restore"
                    enableContentPanningGesture={false}
                >
                    <View style={[styles.modalHeader, { paddingTop: 10, paddingBottom: 10 }]}>
                        <Text style={styles.modalTitle}>Create a new event</Text>

                        <TouchableOpacity onPress={handleCloseModalPress} style={styles.modalClose}>
                            <Ionicons name="close" size={24} color={colorScheme === 'dark' ? '#374567' : '#888'} />
                        </TouchableOpacity>
                    </View>

                    <BottomSheetScrollView
                        style={{ flex: 1, paddingHorizontal: 15, paddingTop: 20 }}
                        keyboardShouldPersistTaps="handled"
                        simultaneousHandlers={createRef}
                    >
                        <View style={{ marginBottom: 15 }}>
                            <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                Event Name
                            </Text>
                            <BottomSheetTextInput
                                placeholder="Name"
                                placeholderTextColor={colorScheme === 'dark' ? '#fff' : '#000'}
                                style={styles.filterInput}
                                value={newEventName}
                                onChangeText={setNewEventName}
                                selectionColor='#2563EB'
                            />
                        </View>
                        <View style={{ marginBottom: 15 }}>
                            <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                Event Description
                            </Text>
                            <BottomSheetTextInput
                                placeholder="Description"
                                placeholderTextColor={colorScheme === 'dark' ? '#fff' : '#000'}
                                style={styles.filterInput}
                                value={newEventDescription}
                                onChangeText={setNewEventDescription}
                                selectionColor='#2563EB'
                            />
                        </View>
                        <View style={{ marginBottom: 15 }}>
                            <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                Event Category
                            </Text>
                            <BottomSheetTextInput
                                placeholder="Category"
                                placeholderTextColor={colorScheme === 'dark' ? '#fff' : '#000'}
                                style={styles.filterInput}
                                value={newEventCategory}
                                onChangeText={setNewEventCategory}
                                selectionColor='#2563EB'
                            />
                        </View>
                        <View style={{ marginBottom: 15 }}>
                            <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                Event Location
                            </Text>
                            <BottomSheetTextInput
                                placeholder="Location"
                                placeholderTextColor={colorScheme === 'dark' ? '#fff' : '#000'}
                                style={styles.filterInput}
                                value={newEventLocation}
                                onChangeText={setNewEventLocation}
                                selectionColor='#2563EB'
                            />
                        </View>
                        <View style={{ marginBottom: 15 }}>
                            <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                Event Requirements
                            </Text>
                            <BottomSheetTextInput
                                placeholder="Requirements"
                                placeholderTextColor={colorScheme === 'dark' ? '#fff' : '#000'}
                                style={styles.filterInput}
                                value={newEventRequirements}
                                onChangeText={setNewEventRequirements}
                                selectionColor='#2563EB'
                            />
                        </View>

                        <View style={{ marginBottom: 15 }}>
                            <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                Event Date
                            </Text>
                            <TouchableOpacity
                                style={[styles.filterInput, { justifyContent: 'center' }]}
                                onPress={() => {
                                    setShowNewEventPicker(true)
                                    setShowNewEventStartTimePicker(false);
                                    setShowNewEventEndTimePicker(false)
                                    if (Platform.OS == 'ios') { createRef.current?.expand() }
                                }}
                            >
                                <Text style={{ color: newEventDate ? (colorScheme === 'dark' ? '#fff' : '#000') : '#aaa' }}>
                                    {newEventDate || 'Select Date'}
                                </Text>

                                {showNewEventPicker && (
                                    <DateTimePicker
                                        value={newEventDate ? new Date(newEventDate) : new Date()}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                        onChange={(event, selectedDate) => {
                                            setShowNewEventPicker(false); // keep open for iOS inline
                                            if (selectedDate) setNewEventDate(selectedDate.toISOString().split('T')[0]);
                                        }}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.row, { gap: 10, marginBottom: 15 }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                    Start Time
                                </Text>
                                <TouchableOpacity
                                    style={[styles.filterInput, { justifyContent: 'center' }]}
                                    onPress={() => {
                                        setShowNewEventPicker(false);
                                        setShowNewEventStartTimePicker(true);
                                        setShowNewEventEndTimePicker(false);
                                        if (Platform.OS == 'ios') { createRef.current?.expand() }
                                    }}
                                >
                                    <Text style={{ color: newEventStartTime ? (colorScheme === 'dark' ? '#fff' : '#000') : '#aaa' }}>
                                        {newEventStartTime || 'Select Start Time'}
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
                                    onPress={() => {
                                        setShowNewEventPicker(false);
                                        setShowNewEventStartTimePicker(false);
                                        setShowNewEventEndTimePicker(true)
                                        if (Platform.OS == 'ios') { createRef.current?.expand() }
                                    }}
                                >
                                    <Text style={{ color: newEventEndTime ? (colorScheme === 'dark' ? '#fff' : '#000') : '#aaa' }}>
                                        {newEventEndTime || 'Select End Time'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {showNewEventStartTimePicker && (
                            <DateTimePicker
                                value={newEventStartTime ? new Date(`1970-01-01T${newEventStartTime}`) : new Date()}
                                mode="time"
                                is24Hour={true}
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, selectedTime) => {
                                    setShowNewEventStartTimePicker(Platform.OS == 'ios');
                                    if (selectedTime) {
                                        const hours = selectedTime.getHours().toString().padStart(2, '0');
                                        const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
                                        setNewEventStartTime(`${hours}:${minutes}`);
                                    }
                                }}
                            />
                        )}

                        {showNewEventEndTimePicker && (
                            <DateTimePicker
                                value={newEventEndTime ? new Date(`1970-01-01T${newEventEndTime}`) : new Date()}
                                mode="time"
                                is24Hour={true}
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, selectedTime) => {
                                    setShowNewEventEndTimePicker(Platform.OS == 'ios');
                                    if (selectedTime) {
                                        const hours = selectedTime.getHours().toString().padStart(2, '0');
                                        const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
                                        setNewEventEndTime(`${hours}:${minutes}`);
                                    }
                                }}
                            />
                        )}

                        <View style={{ marginBottom: 15 }}>
                            <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                Event Total needed students
                            </Text>
                            <BottomSheetTextInput
                                keyboardType='numeric'
                                placeholder="25"
                                placeholderTextColor={colorScheme === 'dark' ? '#fff' : '#000'}
                                style={styles.filterInput}
                                value={newEventTotalNeeded}
                                onChangeText={setNewEventTotalNeeded}
                                selectionColor='#2563EB'
                            />
                        </View>
                        <View style={{ marginBottom: 15 }}>
                            <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                Point rewards
                            </Text>
                            <BottomSheetTextInput
                                keyboardType='numeric'
                                placeholder="120"
                                placeholderTextColor={colorScheme === 'dark' ? '#fff' : '#000'}
                                style={styles.filterInput}
                                value={newEventRewardPoints}
                                onChangeText={setNewEventRewardPoints}
                                selectionColor='#2563EB'
                            />
                        </View>
                        <View style={{ marginBottom: 15 }}>
                            <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                Money rewards
                            </Text>
                            <BottomSheetTextInput
                                keyboardType='numeric'
                                placeholder="1000"
                                placeholderTextColor={colorScheme === 'dark' ? '#fff' : '#000'}
                                style={styles.filterInput}
                                value={newEventRewardMoney}
                                onChangeText={setNewEventRewardMoney}
                                selectionColor='#2563EB'
                            />
                        </View>
                        <View style={{ marginBottom: 15 }}>
                            <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                                Event Enrollement deadline
                            </Text>
                            <TouchableOpacity
                                style={[styles.filterInput, { justifyContent: 'center' }]}
                                onPress={() => {
                                    setShowNewEventEnrollementPicker(true)
                                    if (Platform.OS == 'ios') { createRef.current?.expand() }
                                }}
                            >
                                <Text style={{ color: newEventEnrollmentDeadline ? (colorScheme === 'dark' ? '#fff' : '#000') : '#aaa' }}>
                                    {newEventEnrollmentDeadline || 'Select Date'}
                                </Text>

                                {showNewEventEnrollementPicker && (
                                    <DateTimePicker
                                        value={newEventEnrollmentDeadline ? new Date(newEventEnrollmentDeadline) : new Date()}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                        onChange={(event, selectedDate) => {
                                            setShowNewEventEnrollementPicker(false); // keep open for iOS inline
                                            if (selectedDate) setNewEventEnrollmentDeadline(selectedDate.toISOString().split('T')[0]);
                                        }}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={{ gap: 10, paddingTop: 20, marginBottom: 80 }}>
                            <TouchableOpacity onPress={() => { createEvent() }} style={styles.modalButton} disabled={creatingEvent}>
                                <Text style={styles.modalButtonText}>{creatingEvent ? 'Creating' : 'Create'} Event</Text>
                                {creatingEvent && <ActivityIndicator size='small' color={'#fff'} />}
                            </TouchableOpacity>
                        </View>
                    </BottomSheetScrollView>

                </BottomSheet>
            </GestureHandlerRootView >
        </PaperProvider >
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
            backgroundColor: colorScheme === "dark" ? "#2563EB" : "#2563EB",
        },
        typeCTAText: {
            color: '#2563EB',
            fontFamily: 'Manrope_600SemiBold'
        },
        selectedTypeCTAText: {
            color: '#fff',
        },
        fullCTA: {
            borderRadius: 25,
            paddingVertical: 5,
            paddingHorizontal: 10,
            backgroundColor: colorScheme === 'dark' ? '#152446' : '#2563EB'
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
        greenHeader: {
            backgroundColor: '#2563EB',
            borderBottomLeftRadius: Platform.OS == 'ios' ? 60 : 30,
            borderBottomRightRadius: Platform.OS == 'ios' ? 60 : 30,
        },
        paddedHeader: {
            paddingTop: 20,
        },
        pageTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 24,
            color: '#fff',
        },
        filters: {
            marginBottom: 20
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
            borderBottomColor: '#2563EB',
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
            backgroundColor: '#2563EB',
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
            backgroundColor: "#2563EB",
            borderRadius: 30,
            paddingTop: 10,
            paddingBottom: 14,
            paddingHorizontal: 16,
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10
        },
        postSec: {
            backgroundColor: '#aaa'
        },
        postBtnText: {
            color: colorScheme === "dark" ? "#131d33" : "#f9f9f9",
            fontSize: 16,
            fontFamily: 'Manrope_700Bold',
        },
        postSecBtnText: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 16,
            color: '#fff'
        },
        tabs: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
        },
        tab: {
            paddingVertical: 5,
            paddingHorizontal: 15,
            borderBottomWidth: 5,
            borderBottomColor: "#2563EB",
            opacity: 0.5
        },
        activeHeaderTab: {
            borderBottomColor: "#ffffff",
            opacity: 1
        },
        tabText: {
            color: "#fff", fontFamily: "Manrope_600SemiBold",
            fontSize: 18
        },
    });