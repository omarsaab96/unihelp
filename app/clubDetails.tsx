import React, { useState, useEffect } from "react";
import { View, Platform, ScrollView, Text, ActivityIndicator, StyleSheet, Dimensions, TouchableOpacity, Image, useColorScheme } from "react-native";
import { PaperProvider, MD3LightTheme as DefaultTheme } from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { fetchWithAuth } from "../src/api";
import AntDesign from '@expo/vector-icons/AntDesign';
import Octicons from '@expo/vector-icons/Octicons';

const { width } = Dimensions.get("window");

const theme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: "#2563eb",
    },
};

export default function clubDetailsScreen() {
    const router = useRouter();
    const { clubid } = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const styles = styling(colorScheme);

    const [sponsor, setSponsor] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSponsorDetails = async () => {
            try {
                const res = await fetchWithAuth(`/clubs/${clubid}`);
                const data = await res.json();
                console.log(res)
                if (res.ok) {
                    setSponsor(data);
                    console.log(data)
                } else {
                    console.error("Error fetching sponsor:", data);
                }
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        if (clubid) fetchSponsorDetails();
    }, [clubid]);

    if (loading) {
        return (
            <View style={[styles.center, { flex: 1 }]}>
                <ActivityIndicator size="small" color="#8125eb" />
            </View>
        );
    }

    if (!sponsor) {
        return (
            <View style={[styles.center, { flex: 1 }]}>
                <Text style={{ color: colorScheme === "dark" ? "#fff" : "#000" }}>Sponsor not found.</Text>
            </View>
        );
    }

    return (
        <PaperProvider theme={theme}>
            <GestureHandlerRootView style={styles.appContainer}>
                <StatusBar style="light" />
                <View style={styles.statusBar}></View>

                {/* Header */}
                <View style={[styles.header]}>
                    <View style={[styles.container, styles.purpleHeader]}>
                        <View style={[styles.paddedHeader, { marginBottom: 0 }]}>
                            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                                <Ionicons name="chevron-back" size={24} color="#fff" />
                                <Text style={styles.pageTitle}>Back to Clubs</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Content */}
                <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 100 }}>
                    <View style={[styles.container, { marginTop: 20 }]}>

                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 30, gap: 20 }}>
                            <View style={{ borderWidth: 1, borderColor: '#aaa', borderRadius: 25, width: 100, height: 100, padding: 10 }}>
                                <Image
                                    source={sponsor?.image ? { uri: sponsor.image } : colorScheme === 'dark' ? require("../assets/images/minimalLogo_white.png") : require("../assets/images/minimalLogo_black.png")}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', marginBottom: 30 }}
                                />
                            </View>
                            <View style={{ paddingRight: 30 }}>
                                <Text style={styles.offerTitle}>{sponsor.name || 'No name'} {sponsor.verified == null && <Octicons name="verified" size={16} color={colorScheme === 'dark' ? '#fff' : '#000'} style={{ marginTop: 4 }} />}</Text>

                                <Text style={styles.category}>{sponsor.category || 'No category'}</Text>


                                <Text style={styles.description}>{sponsor.description || "No description available."}</Text>
                            </View>
                        </View>

                        <Text style={styles.membersTitle}>President</Text>
                        <View style={styles.memberCard}>
                            <View style={{ width: 40, height: 40, borderRadius: 50, overflow: 'hidden' }}>
                                <Image source={{ uri: sponsor.createdBy.photo }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                            </View>

                            <View>
                                <Text style={styles.memberName}>{sponsor.createdBy.firstname} {sponsor.createdBy.lastname}</Text>
                                <Text style={styles.memberRole}>{sponsor.createdBy.email}</Text>
                            </View>
                        </View>

                        <Text style={styles.membersTitle}>{sponsor.members.length} Member{sponsor.members.length == 1 ? '' : 's'}</Text>

                        {sponsor.members.length > 0 ? (
                            sponsor.members?.map((member) => (
                                <View key={member._id} style={styles.memberCard}>
                                    <View style={{ width: 40, height: 40, borderRadius: 50, overflow: 'hidden' }}>
                                        <Image source={{ uri: member.photo }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                                    </View>

                                    <View>
                                        <Text style={styles.memberName}>{member.firstname} {member.lastname}</Text>
                                        <Text style={styles.memberRole}>{member.email}</Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.description}>No members yet</Text>
                        )}

                    </View>
                </ScrollView>
            </GestureHandlerRootView>
        </PaperProvider >
    );
}

const styling = (colorScheme) =>
    StyleSheet.create({
        appContainer: {
            flex: 1,
            backgroundColor: colorScheme === "dark" ? "#111827" : "#f4f3e9",
        },
        scrollArea: {
            flex: 1,
        },
        statusBar: {
            backgroundColor: "#8125eb",
            height: Platform.OS === "ios" ? 60 : 25,
        },
        container: {
            paddingHorizontal: 20,
        },
        purpleHeader: {
            backgroundColor: '#8125eb',
            borderBottomLeftRadius: Platform.OS == 'ios' ? 60 : 30,
            borderBottomRightRadius: Platform.OS == 'ios' ? 60 : 30,
        },
        paddedHeader: {
            paddingTop: 20,
            marginBottom: 20,
        },
        pageTitle: {
            fontFamily: "Manrope_700Bold",
            fontSize: 22,
            color: "#fff",
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
        },
        between: {
            justifyContent: "space-between",
        },
        tinyCTA: {
            width: 50,
            height: 50,
            borderWidth: 1,
            borderRadius: 25,
            alignItems: "center",
            justifyContent: "center",
            borderColor: "#fff",
        },
        bannerImage: {
            width: "100%",
            height: 200,
            borderRadius: 20,
            marginBottom: 20,
        },
        sectionTitle: {
            fontFamily: "Manrope_700Bold",
            fontSize: 18,
            color: colorScheme === "dark" ? "#fff" : "#000",
        },
        description: {
            fontFamily: "Manrope_400Regular",
            color: colorScheme === "dark" ? "#ccc" : "#333",
            lineHeight: 22,
            marginBottom: 20,
        },
        membersTitle: {
            fontFamily: "Manrope_700Bold",
            fontSize: 14,
            color: colorScheme === "dark" ? "#fff" : "#000",
            marginBottom: 10,
        },
        fullCTA: {
            borderWidth: 1,
            borderRadius: 25,
            borderColor: colorScheme === "dark" ? "#888" : "#ccc",
            padding: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        fullCTAText: {
            color: colorScheme === "dark" ? "#fff" : "#000",
        },
        offerCard: {
            backgroundColor: colorScheme === "dark" ? "#2c3854" : "#e4e4e4",
            padding: 15,
            borderRadius: 15,
            marginTop: 10,
        },
        offerTitle: {
            fontFamily: "Manrope_700Bold",
            fontSize: 18,
            color: colorScheme === "dark" ? "#fff" : "#000",
            marginBottom: 5,
        },
        offerDesc: {
            fontFamily: "Manrope_400Regular",
            color: colorScheme === "dark" ? "#ccc" : "#333",
            marginBottom: 20
        },
        center: {
            justifyContent: "center",
            alignItems: "center",
        },
        backBtn: { flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 20 },
        category: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#8125eb' : '#8125eb',
            fontFamily: 'Manrope_600SemiBold',
            marginBottom: 10
        },
        featured: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_600SemiBold',
        },
        memberCard: {
            borderBottomWidth: 1,
            paddingVertical: 8,
            borderBottomColor: '#aaa',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 20
        },
        memberName: {
            textTransform: 'capitalize',
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fff' : '#000'
        },
        memberRole: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fff' : '#000'
        }
    });
