import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, ScrollView, Keyboard, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Dimensions, TouchableOpacity, Text, Platform, useColorScheme, TextInput } from 'react-native';
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
import TutorCard from '../src/components/TutorCard';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput, BottomSheetView } from "@gorhom/bottom-sheet";
import { getCurrentUser, fetchWithoutAuth } from "../src/api";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import * as SecureStore from "expo-secure-store";
import Entypo from '@expo/vector-icons/Entypo';


const { width } = Dimensions.get('window');

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#10b981', // Emerald green instead of blue
  },
};

export default function TutorsScreen() {
  const router = useRouter();
  let colorScheme = useColorScheme();
  const styles = styling(colorScheme);

  const [user, setUser] = useState(null);
  const [gettingRating, setGettingRating] = useState(false)
  const [ratingsData, setRatingsData] = useState([])

  const [tutors, setTutors] = useState([]);
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
  const MAX_HOURLY_RATE = 250;

  const [filterSubject, setFilterSubject] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState(0);
  const [filterMaxPrice, setFilterMaxPrice] = useState(MAX_HOURLY_RATE);
  const [sortBy, setSortBy] = useState<string | null>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const data = await getCurrentUser();
        if (data.error) {
          console.error("Error", data.error);
        } else {
          await SecureStore.setItem('user', JSON.stringify(data))
          setUser(data)
          refreshTutors()
        }
      } catch (err) {
        console.error("Error", err.message);
      }
    }
    getUserInfo()
  }, []);

  // const getUserRating = async () => {
  //   setGettingRating(true);
  //   try {
  //     const res = await fetchWithoutAuth(`/tutors/ratings`);

  //     if (res.ok) {
  //       const data = await res.json();
  //       setRatingsData(data.data);
  //     }
  //   } catch (err) {
  //     console.error(err);
  //   } finally {
  //     setGettingRating(false);
  //   }
  // }

  const handleSearchInput = (text: string) => {
    setKeyword(text);
    setLoading(false)

    if (debounceTimeout) clearTimeout(debounceTimeout);

    const timeout = setTimeout(async () => {
      if (text.trim().length >= 3 || text.trim().length === 0) {
        setLoading(true);
        try {
          const res = await fetchWithoutAuth(`/tutors?q=${text}&page=1&limit=${pageLimit}`);

          if (res.ok) {
            const data = await res.json();

            setTutors(data.data);
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
        refreshTutors();
      }
    }, 500);

    setDebounceTimeout(timeout);
  };

  const getSetFiltersCount = () => {
    let count = 0;

    if (filterSubject != '') count++;
    if (filterAvailability != '') count++;
    if (filterMinPrice != 0) count++;
    if (filterMaxPrice != MAX_HOURLY_RATE) count++;

    return count;
  }

  const getSetSortsCount = () => {
    let count = 0;

    if (sortBy != 'price') count++;

    return count;
  }

  const clearFilters = async () => {
    setKeyword('');
    setFilterSubject('');
    setFilterMinPrice(0);
    setFilterMaxPrice(MAX_HOURLY_RATE);
    setFilterAvailability('');
    setSortBy('price');

    setPage(1);
    try {
      const res = await fetchWithoutAuth(`/tutors?page=1&limit=${pageLimit}`);

      if (res.ok) {
        const data = await res.json();
        setTutors(data.data);
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

  const loadTutors = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetchWithoutAuth(`/tutors?${buildQueryParams(page)}`);

      if (res.ok) {
        const data = await res.json();

        setTutors(prev => [...prev, ...data.data]);
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
  }, [page, hasMore, loading, filterSubject, filterAvailability, filterMinPrice, filterMaxPrice, sortBy, sortOrder]);

  const refreshTutors = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    // getUserRating();
    try {
      const res = await fetchWithoutAuth(`/tutors?${buildQueryParams(1)}`);

      if (res.ok) {
        const data = await res.json();
        setTutors(data.data);
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
  }, [page, hasMore, loading, keyword, filterSubject, filterAvailability, filterMinPrice, filterMaxPrice, sortBy, sortOrder]);

  const renderTutor = ({ item }: { item: any }) => (
    <TutorCard tutor={item} onPress={() => { console.log(item._id) }} />
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
    Keyboard.dismiss()
  };

  const buildQueryParams = (pageNum: number, searchKeyword: string = keyword) => {
    const userStr = SecureStore.getItem('user');
    const user = JSON.parse(userStr);
    const universityId = user?.university?._id;

    const queryParams = new URLSearchParams();

    queryParams.append("userRole", "student");
    queryParams.append("university", universityId);
    if (searchKeyword) queryParams.append("q", searchKeyword);
    if (filterSubject) queryParams.append("subject", filterSubject);

    if (filterMinPrice != 0) queryParams.append('minRate', "" + filterMinPrice);
    if (filterMaxPrice != MAX_HOURLY_RATE) queryParams.append('maxRate', "" + filterMaxPrice);

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
    await refreshTutors();
  };

  const applySorting = async () => {
    setSorting(true)
    setPage(1);
    await refreshTutors();
  };

  return (
    <PaperProvider theme={theme}>
      <GestureHandlerRootView style={styles.appContainer}>
        <StatusBar style='light' />
        <View style={styles.statusBar}></View>

        <FlatList
          style={styles.scrollArea}
          data={tutors}
          renderItem={renderTutor}
          keyExtractor={item => item._id}
          ListHeaderComponent={
            <View style={[styles.header, styles.container, styles.greenHeader]}>
              <View style={[styles.paddedHeader, { marginBottom: 20 }]}>
                <TouchableOpacity style={[styles.row, { gap: 10, marginBottom: 30 }]} onPress={() => { router.back() }}>
                  <Ionicons name="chevron-back" size={24} color="#fff" style={{ transform: [{ translateY: 3 }] }} />
                  <Text style={styles.pageTitle}>Back to Students</Text>
                </TouchableOpacity>
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
                      {`${total} tutor${total !== 1 ? 's' : ''}`}
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
          }
          ListEmptyComponent={() => (
            <Text style={[styles.empty, styles.container, { fontFamily: 'Manrope_400Regular' }]}>
              No tutors available
            </Text>
          )}
          onEndReached={() => { if (hasMore && !loading) loadTutors(); }}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshTutors} colors={['#10b981']} tintColor="#10b981" />}
          ListFooterComponent={
            <View style={styles.loadingFooter}>
              {hasMore && loading && <ActivityIndicator size="small" color="#10b981" />}
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
                    Subject
                  </Text>
                  <BottomSheetTextInput
                    placeholder="e.g. Mathematics, Programming"
                    placeholderTextColor="#aaa"
                    style={styles.filterInput}
                    value={filterSubject}
                    onChangeText={setFilterSubject}
                    selectionColor='#10b981'
                  />
                </View>

                {/* <View>
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
                </View> */}

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

                <View>
                  <Text style={{ marginBottom: 5, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_600SemiBold' }}>
                    Price Range ($/hour)
                  </Text>
                  <View style={{ alignItems: 'center', marginVertical: 10 }}>
                    <MultiSlider
                      values={[filterMinPrice, filterMaxPrice]}
                      min={0}
                      max={MAX_HOURLY_RATE}
                      step={1}
                      onValuesChange={(values) => {
                        setFilterMinPrice(values[0]);
                        setFilterMaxPrice(values[1]);
                      }}
                      selectedStyle={{ backgroundColor: '#10b981' }}
                      unselectedStyle={{ backgroundColor: '#ccc' }}
                      markerStyle={{ width: 20, height: 20, backgroundColor: '#10b981', borderWidth: 0 }}
                      containerStyle={{ width: '100%' }}
                      sliderLength={width - 80}
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: width - 80, marginTop: 5 }}>
                      <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000' }}>${filterMinPrice}</Text>
                      <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000' }}>${filterMaxPrice}</Text>
                    </View>
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
                        {/* <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setSortBy('date')}>
                          <RadioButton value="date" />
                          <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>
                            Date
                          </Text>
                        </TouchableOpacity> */}
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
      borderColor: colorScheme === 'dark' ? '#888' : '#ccc',
    },
    fullCTA: {
      borderRadius: 25,
      padding: 10,
      backgroundColor: colorScheme === 'dark' ? '#131d33' : '#10b981'
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
      // borderWidth: 1,
      // borderColor: colorScheme === 'dark' ? '#fff' : '#000',
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
      fontSize: 16,
      marginBottom: 5,
      color: colorScheme === 'dark' ? '#fff' : "#000"
    },
  });