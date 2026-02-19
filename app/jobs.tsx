
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform, useColorScheme, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { getCurrentUser, logout } from '../src/api';
import { localstorage } from '../utils/localStorage';
import { Ionicons } from '@expo/vector-icons';

export default function JobsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const styles = styling(colorScheme);

    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'open' | 'pending' | 'completed'>(
        params?.tab === 'pending' ? 'pending' : params?.tab === 'completed' ? 'completed' : 'open'
    );

    useFocusEffect(
        useCallback(() => {
            const init = async () => {
                try {
                    const data = await getCurrentUser();
                    if (data == null) {
                        await logout();
                        router.replace('/login');
                        return;
                    }
                    await localstorage.set('user', JSON.stringify(data));
                    setUser(data);
                } catch (err: any) {
                    console.log('Error', err?.message);
                }
            };
            init();
        }, [])
    );

    const openJobs = useMemo(() => (user?.helpjobs || []).filter((j: any) => j.status === 'open'), [user]);
    const pendingJobs = useMemo(
        () => (user?.helpjobs || []).filter((j: any) => j.status === 'pending' || j.status === 'systempending'),
        [user]
    );
    const completedJobs = useMemo(() => (user?.helpjobs || []).filter((j: any) => j.status === 'completed'), [user]);

    const getJobs = (tab: 'open' | 'pending' | 'completed') => {
        const all = tab === 'open' ? openJobs : tab === 'pending' ? pendingJobs : completedJobs;
        return [...all].sort((a, b) => {
            if (tab === 'open') return new Date(b.startedAt) - new Date(a.startedAt);
            return new Date(b.completedAt) - new Date(a.completedAt);
        });
    };

    const getJobStatus = (job: any) => {
        if (job.status == 'pending') {
            if (job.survey == null) return 'Waiting for your feedback';
            return "Waiting for other person's feedback";
        }
        if (job.status == 'systempending') return 'Pending system validation';
        return 'Pending';
    };

    const handleGoToJobDetails = (offer: any) => {
        router.push({ pathname: '/jobDetails', params: { offerId: offer._id } });
    };

    if (!user) return null;

    return (
        <View style={styles.appContainer}>
            <StatusBar style='light' />
            <View style={styles.statusBar}></View>

            <View style={[styles.header, styles.container, styles.blueHeader]}>
                <View style={[styles.paddedHeader, { marginBottom: 0 }]}>
                    <View style={[styles.row, styles.between, { marginBottom: 30 }]}>
                        <TouchableOpacity style={[styles.row, { gap: 10, marginBottom: 0 }]} onPress={() => { router.back() }}>
                            <Ionicons name="chevron-back" size={24} color="#fff" style={{ transform: [{ translateY: 3 }] }} />
                            <Text style={styles.pageTitle}>My Jobs</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={[styles.container, { marginBottom: 10 }]}>
                <View style={styles.jobsTabs}>
                    <TouchableOpacity
                        style={[styles.jobsTab, activeTab === 'open' && styles.jobsTabActive]}
                        onPress={() => setActiveTab('open')}
                    >
                        <Text style={[styles.jobsTabText, activeTab === 'open' && styles.jobsTabTextActive]}>
                            OnGoing ({openJobs.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.jobsTab, activeTab === 'pending' && styles.jobsTabActive]}
                        onPress={() => setActiveTab('pending')}
                    >
                        <Text style={[styles.jobsTabText, activeTab === 'pending' && styles.jobsTabTextActive]}>
                            Pending ({pendingJobs.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.jobsTab, activeTab === 'completed' && styles.jobsTabActive]}
                        onPress={() => setActiveTab('completed')}
                    >
                        <Text style={[styles.jobsTabText, activeTab === 'completed' && styles.jobsTabTextActive]}>
                            Completed ({completedJobs.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={getJobs(activeTab)}
                keyExtractor={(item, idx) => `${item._id}-${idx}`}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
                ListEmptyComponent={<Text style={styles.infoLabel}>No jobs found</Text>}
                renderItem={({ item, index }) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.jobRow}
                        onPress={() => handleGoToJobDetails(item.offer)}
                    >
                        <View>
                            <Text style={styles.infoLabel}>{item.offer?.title || item._id}</Text>
                            {activeTab === 'open' && (
                                <Text style={styles.infoSubLabel}>Started: {new Date(item.startedAt).toLocaleDateString()}</Text>
                            )}
                            {activeTab === 'pending' && (
                                <Text style={styles.infoSubLabel}>Status: {getJobStatus(item)}</Text>
                            )}
                            {activeTab === 'completed' && (
                                <Text style={styles.infoSubLabel}>Completed: {new Date(item.completedAt).toLocaleDateString()}</Text>
                            )}
                        </View>
                        <Feather name="arrow-right-circle" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                    </TouchableOpacity>
                )}
            />

            {/* navBar */}
            <View style={[styles.container, styles.SafeAreaPaddingBottom, { borderTopWidth: 1, paddingTop: 15, borderTopColor: colorScheme === 'dark' ? '#4b4b4b' : '#ddd' }]}>
                <View style={[styles.row, { justifyContent: 'space-between', gap: 10 }]}>
                    <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/')}
                    >
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

                    <TouchableOpacity style={styles.navbarCTA} onPress={() => router.push('/home')}>
                        <View style={{ alignItems: 'center', gap: 2 }}>
                            <FontAwesome5 name="home" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                            <Text style={styles.navBarCTAText}>Home</Text>
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

const styling = (colorScheme: string) =>
    StyleSheet.create({
        appContainer: {
            flex: 1,
            backgroundColor: colorScheme === 'dark' ? '#111827' : '#f4f3e9',
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
        row: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        between: {
            justifyContent: 'space-between',
        },
        header: {
            marginBottom: 15,
        },
        paddedHeader: {
            paddingTop: 20,
        },
        blueHeader: {
            backgroundColor: '#2563EB',
            borderBottomLeftRadius: Platform.OS == 'ios' ? 60 : 30,
            borderBottomRightRadius: Platform.OS == 'ios' ? 60 : 30,
        },
        pageTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 24,
            color: '#fff',
        },
        backBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        backText: {
            color: colorScheme === 'dark' ? '#fff' : '#111827',
            fontFamily: 'Manrope_600SemiBold',
        },
        jobsTabs: {
            flexDirection: 'row',
            gap: 10,
            backgroundColor: colorScheme === 'dark' ? '#152446' : '#d7d7d7',
            padding: 5,
            borderRadius: 30,
            height: 45
        },
        jobsTab: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
            borderRadius: 30,
            backgroundColor: 'transparent',
        },
        jobsTabActive: {
            backgroundColor: '#2563EB',
        },
        jobsTabText: {
            fontSize: 12,
            fontFamily: 'Manrope_600SemiBold',
            color: colorScheme === 'dark' ? '#cbd5f5' : '#374151',
        },
        jobsTabTextActive: {
            color: '#fff',
            fontFamily: 'Manrope_700Bold'
        },
        jobRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colorScheme === 'dark' ? '#2c3854' : '#e4e4e4',
            borderRadius: 10,
            padding: 12,
            marginBottom: 10,
        },
        infoLabel: {
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_600SemiBold',
        },
        infoSubLabel: {
            color: colorScheme === 'dark' ? '#d1d5db' : '#374151',
            fontSize: 12,
            marginTop: 4,
        },
        navbarCTA: {
            flex: 1
        },
        navBarCTAText: {
            fontSize: 10,
            color: colorScheme === 'dark' ? '#fff' : '#000'
        },
    });
