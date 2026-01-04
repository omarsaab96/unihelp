import React, { useEffect, useCallback, useState } from 'react';
import { useFocusEffect } from "@react-navigation/native";
import { View, TouchableWithoutFeedback, ScrollView, KeyboardAvoidingView, Image, StyleSheet, TextInput, Dimensions, TouchableOpacity, Text, Platform, useColorScheme, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { getCurrentUser, fetchWithoutAuth, fetchWithAuth, logout } from "../src/api";
import { localstorage } from '../utils/localStorage';
import { ActivityIndicator } from 'react-native-paper';

const { width } = Dimensions.get('window');

export default function SupportScreen() {
    const router = useRouter();
    let colorScheme = useColorScheme();
    const styles = styling(colorScheme);
    const [user, setUser] = useState(null)
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);
    const [tickets, setTickets] = useState([]);

    useFocusEffect(
        useCallback(() => {
            const getUserInfo = async () => {
                try {
                    const data = await getCurrentUser();
                    if (data == null) {
                        console.log("no current user");
                        await logout();
                        router.replace('/login')
                    } else {
                        await localstorage.set('user', JSON.stringify(data))

                        if (data.role == "sudo" || data.role == "admin") {
                            router.replace("/admin/adminPanel")
                        } else {
                            setUser(data)
                        }
                    }
                } catch (err) {
                    if (err != null) {
                        console.log("Error", err.message);
                    }
                }
            }
            getUserInfo()
            getUserTickets()
        }, [])
    );

    const sendMessage = async () => {
        setSending(true);
        try {
            const resp = await fetchWithAuth('/support/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message
                })
            });

            if (resp.ok) {
                setSuccess(true)
                setMessage("");
                getUserTickets();
                Keyboard.dismiss();
            } else {

                console.log(resp);
            }
        } catch (err) {
            console.error("Error sending message:", err);
        } finally {
            setSending(false);
        }
    }

    const getUserTickets = async () => {
        const res = await fetchWithAuth("/support/my");

        const data = await res.json();
        setTickets(data.data);
    }

    if (!user) {
        return null;
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.appContainer}>
                <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
                <View style={styles.statusBar}></View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={[styles.header]}>
                            <View style={[styles.paddedHeader, styles.row, styles.between]}>
                                {/* <Image style={styles.minimalLogo} source={colorScheme === 'dark' ? require('../assets/images/minimalLogo_white.png') : require('../assets/images/minimalLogo_black.png')} /> */}
                                <TouchableOpacity style={[styles.row, { gap: 10, marginBottom: 30 }]} onPress={() => { router.back() }}>
                                    <Ionicons name="chevron-back" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} style={{ transform: [{ translateY: 3 }] }} />
                                    <Text style={styles.pageTitle}>Unihelp Support</Text>
                                </TouchableOpacity>
                            </View>
                            {/* {user &&
                                <View>
                                    <View style={styles.row}>
                                        <Text style={[styles.greeting, { fontFamily: 'Manrope_700Bold', textTransform: 'capitalize' }]}> </Text>
                                        <Text style={styles.greeting}>Support</Text>
                                        <Text style={styles.greeting}>!</Text>
                                    </View>
                                </View>
                            } */}
                        </View>

                        {success ? (
                            <View style={{ marginBottom: 40 }}>
                                <Text style={{ marginBottom: 20, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>Thank you for contacting support! Your message has been sent successfully. Our team will get back to you shortly.</Text>
                                <TouchableOpacity style={styles.fullCTA} onPress={() => { setSuccess(false) }}>
                                    <Text style={styles.fullCTAText}>Send another message</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={{ marginBottom: 40 }}>
                                <Text style={{ marginBottom: 40, color: colorScheme === 'dark' ? '#fff' : '#000', fontFamily: 'Manrope_400Regular' }}>If you have any questions or need assistance, please reach out to our support team.</Text>

                                <TextInput
                                    placeholder="Your message"
                                    value={message}
                                    onChangeText={setMessage}
                                    multiline={true}
                                    style={styles.input}
                                    placeholderTextColor={colorScheme === 'dark' ? '#888' : '#555'}
                                />

                                <TouchableOpacity style={styles.fullCTA} onPress={() => { sendMessage() }}>
                                    {sending && <ActivityIndicator size="small" color="#fff" />}
                                    <Text style={styles.fullCTAText}>Send{sending ? 'ing' : ''}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {tickets.length > 0 && <View>
                            <Text style={styles.sectiontTitle}>Submitted Support Tickets</Text>
                            {tickets?.map((ticket) => (
                                <View key={ticket._id} style={{ marginTop: 10, padding: 10, borderWidth: 1, borderColor: colorScheme === 'dark' ? '#444' : '#ccc', borderRadius: 10 }}>
                                    <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000', marginBottom: 5, fontFamily: 'Manrope_400Regular' }}>
                                        {ticket.message}
                                    </Text>

                                    <Text style={{ color: colorScheme === 'dark' ? '#888' : '#555', fontSize: 12, fontFamily: 'Manrope_400Regular' }}>
                                        Status: {ticket.status}
                                    </Text>

                                    <Text style={{ color: colorScheme === 'dark' ? '#888' : '#555', fontSize: 12, fontFamily: 'Manrope_400Regular' }}>
                                        Submitted on: {new Date(ticket.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                            ))}
                        </View>}
                    </ScrollView>
                </KeyboardAvoidingView >
            </View >
        </TouchableWithoutFeedback>

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
            backgroundColor: colorScheme === 'dark' ? '#111827' : '#f4f3e9',
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
            borderColor: colorScheme === 'dark' ? '#fff' : '#aaa',
        },
        fullCTA: {
            borderRadius: 25,
            paddingVertical: 15,
            paddingHorizontal: 10,
            backgroundColor: '#2563EB',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10
        },
        fullCTAText: {
            color: '#fff',
            fontFamily: 'Manrope_600SemiBold',
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
        sectiontTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 16,
            marginBottom: 5,
            color: colorScheme === 'dark' ? '#fff' : "#000"
        },
        header: {
            // marginBottom: 30,
        },
        paddedHeader: {
            paddingTop: 20,
            // marginBottom: 20
        },
        greeting: {
            fontSize: 32,
            color: colorScheme === 'dark' ? '#fff' : "#000",
            lineHeight: 44
        },
        stats: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 30
        },
        pageTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 24,
            color: colorScheme === 'dark' ? '#fff' : '#000'
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
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_700Bold'
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
        input: {
            borderWidth: 1,
            borderColor: colorScheme === 'dark' ? '#444' : '#ccc',
            paddingVertical: 15,
            paddingHorizontal: 20,
            borderRadius: 30,
            fontSize: 16,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#fff',
            minHeight: 200,
            textAlignVertical: 'top',
            marginBottom: 20
        },
    });