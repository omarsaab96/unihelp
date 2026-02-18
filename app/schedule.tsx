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
import ScheduledSessionCard from '../src/components/ScheduledSessionCard';
import { ActivityIndicator } from 'react-native-paper';
import Entypo from '@expo/vector-icons/Entypo';

const { width } = Dimensions.get('window');

export default function ScheduleScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const styles = styling(colorScheme, insets);

    const today = new Date();
    const [user, setUser] = useState<any>(null);
    const [scheduledSessions, setScheduledSessions] = useState<any[]>([]);
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState(today);
    const [gettingSchedule, setGettingSchedule] = useState(true);

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

            const getUserSchedule = async () => {

                try {
                    const res = await fetchWithAuth(`/scheduledSessions`, { method: 'GET' });
                    if (res.ok) {
                        const data = await res.json();
                        console.warn("data:", data)
                        setScheduledSessions(data);
                        setGettingSchedule(false)
                    }
                } catch (err: any) {
                    console.error("Error", err.message);
                }
            }

            getUserInfo();
            getUserSchedule();
        }, [])
    );

    // Map sessions by date
    const sessionsByDate = scheduledSessions.reduce((acc: any, session: any) => {
        const dateStr = new Date(session.dateAndTime).toDateString();
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(session);
        return acc;
    }, {});

    // Generate calendar days
    const generateCalendar = (year: number, month: number) => {
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const days: Date[] = [];

        // Add empty slots for first week offset
        const startDay = firstDayOfMonth.getDay(); // 0-Sun ... 6-Sat
        for (let i = 0; i < startDay; i++) days.push(null as any);

        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else setCurrentMonth(prev => prev + 1);
    };

    const goToPrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else setCurrentMonth(prev => prev - 1);
    };

    const handleAddSession = async () => {
        if (!user) return;

        try {
            const body = {
                tutorID: user._id,
                studentID: user._id,
                dateAndTime: selectedDate,
                title: "New Session 2",
                category: "Category 2",
                status: 'pending',
                paid: true
            };

            const res = await fetchWithAuth(`/scheduledSessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const newSession = await res.json();
                setScheduledSessions(prev => [...prev, newSession]);
                alert("Session added successfully!");
            } else {
                const error = await res.json();
                alert("Error adding session: " + error);
            }
        } catch (err: any) {
            console.error(err);
            alert("Error adding session: " + err.message);
        }
    }

    return (
        <View style={styles.appContainer}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <View style={styles.statusBar} />

            <ScrollView style={styles.scrollArea}>
                <View style={[styles.header, styles.container]}>
                    <View style={[styles.paddedHeader, styles.row, styles.between]}>
                        <TouchableOpacity onPress={() => { router.back() }} style={[styles.row, { alignItems: 'baseline', gap: 5 }]}>
                            <Feather name="arrow-left" size={24} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                            <Text style={styles.pageTitle}>Your Schedule</Text>
                        </TouchableOpacity>
                        <View style={[styles.row, { gap: 10 }]}>
                            <TouchableOpacity style={styles.tinyCTA} onPress={() => { handleAddSession() }}>
                                <Ionicons name="add-outline" size={24} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {gettingSchedule &&
                    <View style={{ justifyContent: 'center', height: 300, backgroundColor: colorScheme === 'dark' ? '#2c3854' : '#e4e4e4' }}>
                        <ActivityIndicator size="small" color="#000" />
                    </View>
                }

                {!gettingSchedule && <View style={[styles.container, { paddingVertical: 20, marginBottom: 20, backgroundColor: colorScheme === 'dark' ? '#2c3854' : '#e4e4e4' }]}>
                    {/* Month Navigation */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <TouchableOpacity onPress={goToPrevMonth} style={styles.previousBtn}>
                            <Feather name="arrow-left" size={24} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                        </TouchableOpacity>
                        <Text style={styles.currentMonthText}>
                            {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </Text>
                        <TouchableOpacity onPress={goToNextMonth} style={styles.nextBtn}>
                            <Feather name="arrow-right" size={24} color={colorScheme === 'dark' ? "#fff" : "#000"} />
                        </TouchableOpacity>
                    </View>

                    {/* Calendar Grid */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {generateCalendar(currentYear, currentMonth).map((day: Date | null, idx) => {
                            if (!day) return <View key={idx} style={{ width: `${100 / 7}%`, padding: 10 }} />;

                            const isToday = day.toDateString() === today.toDateString();
                            const isSelected = day.toDateString() === selectedDate.toDateString();
                            const hasSession = !!sessionsByDate[day.toDateString()];

                            return (
                                <TouchableOpacity
                                    key={day.toDateString()}
                                    style={{
                                        width: `${100 / 7}%`,
                                        padding: 5,
                                        borderRadius: 10,
                                        backgroundColor: isSelected ? '#10b981' : isToday ? '#2563EB' : hasSession ? '#facc15' : 'transparent',
                                        alignItems: 'center'
                                    }}
                                    onPress={() => setSelectedDate(day)}
                                >
                                    <Text style={[styles.day, { fontFamily: isToday ? 'Manrope_700Bold' : 'Manrope_400Regular', color: isSelected || isToday ? '#fff' : colorScheme === 'dark' ? '#fff' : '#000' }]}>{day.getDate()}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>}

                {/* Sessions List */}
                {!gettingSchedule && <View style={[styles.container, {}]}>
                    <Text style={styles.title}>
                        Selected: {selectedDate.toDateString()}
                    </Text>
                    {(sessionsByDate[selectedDate.toDateString()] || []).map(session => (
                        <ScheduledSessionCard key={session._id} item={session} onPress={() => { console.log(session._id) }} />
                    ))}
                    {(!sessionsByDate[selectedDate.toDateString()] || sessionsByDate[selectedDate.toDateString()].length === 0) && <Text style={styles.empty}>Nothing scheduled</Text>}
                </View>}
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
            borderColor: colorScheme === 'dark' ? '#888' : '#ccc',
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
            color: colorScheme === 'dark' ? '#fff' : "#000"
        }
    });