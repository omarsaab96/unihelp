import React, { useState, useEffect } from "react";
import { View, TextInput, Platform, ScrollView, Text, ActivityIndicator, StyleSheet, Dimensions, TouchableOpacity, Image, useColorScheme } from "react-native";
import { PaperProvider, MD3LightTheme as DefaultTheme } from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { fetchWithoutAuth } from "../../src/api";
import AntDesign from '@expo/vector-icons/AntDesign';
import { getCurrentUser, fetchWithAuth } from "../../src/api";

const { width } = Dimensions.get("window");

const theme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: "#2563eb",
    },
};

export default function offerDetailsScreen() {
    const router = useRouter();
    const { sponsorId } = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const styles = styling(colorScheme);

    const [sponsor, setSponsor] = useState(null);
    const [loading, setLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        name: "",
        description: "",
        sponsorId: "",
        photo: null,
        deadline: null,
        universities: null,
        priceMoney:0,
        pricePoints:0,
        totalCodes:0
    });

    useEffect(() => {
        if (sponsorId) fetchSponsorDetails();
    }, [sponsorId]);

    const fetchSponsorDetails = async () => {
        try {
            const res = await fetchWithoutAuth(`/sponsors/${sponsorId}`);
            const data = await res.json();
            console.log(res)
            if (res.ok) {
                setSponsor(data.data);
                console.log(data.data)
            } else {
                console.error("Error fetching sponsor:", data);
            }
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const saveOffer = async () => {
        if (!form.name || !form.description) {
            alert("Name and description are required");
            return;
        }

        if (form.deadline && isNaN(new Date(form.deadline).getTime())) {
            alert("Invalid deadline date format. Use YYYY-MM-DD");
            return;
        }

        try {
            const payload = {
                name: form.name,
                description: form.description,
                photo: form.photo,
                deadline: form.deadline ? new Date(form.deadline) : null,

                sponsor: sponsorId,

                universities: form.universities
                    ? form.universities
                        .split(',')
                        .map(u => u.trim())
                        .filter(u => u.length > 0)
                    : []
            };

            console.log("PAYLOAD BEING SENT:", payload);

            const res = await fetchWithAuth('/offers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                console.log("SERVER ERROR:", err);
            } else {
                await fetchSponsorDetails();
                setShowForm(false);
                setForm({
                    name: "",
                    description: "",
                    photo: null,
                    deadline: null,
                    universities: null,
                    priceMoney:0,
                    pricePoints:0,
                    totalCodes:0
                });
            }

        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <View style={[styles.center, { flex: 1 }]}>
                <ActivityIndicator size="small" color="#f85151" />
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
                    <View style={[styles.container, styles.redHeader]}>
                        <View style={[styles.paddedHeader, { marginBottom: 0 }]}>
                            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                                <Ionicons name="chevron-back" size={24} color="#fff" />
                                <Text style={styles.pageTitle}>Back</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {showForm ? (
                    <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 100 }}>

                        <Text style={styles.sectionTitle}>Add New Offer</Text>

                        <TextInput
                            placeholder="Offer Name"
                            placeholderTextColor="#999"
                            style={styles.filterInput}
                            value={form.name}
                            onChangeText={(text) => setForm({ ...form, name: text })}
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
                            placeholder="Photo URL"
                            placeholderTextColor="#999"
                            style={styles.filterInput}
                            value={form.photo}
                            onChangeText={(text) => setForm({ ...form, photo: text })}
                        />

                        <TextInput
                            placeholder="Price in points"
                            placeholderTextColor="#999"
                            style={styles.filterInput}
                            value={form.pricePoints+""}
                            onChangeText={(text) => setForm({ ...form, pricePoints: parseInt(text) })}
                        />

                        <TextInput
                            placeholder="Price in TRY"
                            placeholderTextColor="#999"
                            style={styles.filterInput}
                            value={form.priceMoney+""}
                            onChangeText={(text) => setForm({ ...form, priceMoney: parseInt(text) })}
                        />

                        <TextInput
                            placeholder="How many codes"
                            placeholderTextColor="#999"
                            style={styles.filterInput}
                            value={form.totalCodes+""}
                            onChangeText={(text) => setForm({ ...form, totalCodes: parseInt(text) })}
                        />

                        <TextInput
                            placeholder="Deadline (YYYY-MM-DD)"
                            placeholderTextColor="#999"
                            style={styles.filterInput}
                            value={form.deadline}
                            onChangeText={(text) => setForm({ ...form, deadline: text })}
                        />

                        <TextInput
                            placeholder="Universities (comma separated)"
                            placeholderTextColor="#999"
                            style={styles.filterInput}
                            value={form.universities}
                            onChangeText={(text) => setForm({ ...form, universities: text })}
                        />


                        {/* Buttons */}
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 30 }}>
                            <TouchableOpacity
                                style={[styles.fullCTA, { flex: 1, backgroundColor: "#2563eb" }]}
                                onPress={saveOffer}
                            >
                                <Text style={{ color: "#fff", fontFamily: "Manrope_700Bold", fontSize: 16 }}>
                                    Save
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.fullCTA, { flex: 1, backgroundColor: "#888" }]}
                                onPress={() => setShowForm(false)}
                            >
                                <Text style={{ color: "#fff", fontFamily: "Manrope_700Bold", fontSize: 16 }}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 80 }} />
                    </ScrollView>
                ) : (
                    <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 100 }}>
                        <View style={[styles.container, { marginTop: 20 }]}>

                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
                                <Text style={styles.category}>{sponsor.category || 'No category'}</Text>

                                {sponsor.featured && <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                                    <AntDesign name="star" size={20} color="#fbbf24" />
                                    <Text style={styles.featured}>Featured</Text>

                                </View>}
                            </View>

                            {/* Sponsor Banner */}
                            {sponsor.logo && (
                                <Image source={{ uri: sponsor.logo }} style={styles.bannerImage} resizeMode="cover" />
                            )}

                            <Text style={styles.sectionTitle}>{sponsor?.name}</Text>
                            <Text style={styles.description}>{sponsor.description || "No description available."}</Text>

                            {sponsor.website && (
                                <TouchableOpacity
                                    onPress={() => router.push(sponsor.website)}
                                    style={[styles.fullCTA, { marginTop: 20 }]}
                                >
                                    <Text style={styles.fullCTAText}>Visit Website</Text>
                                    <MaterialIcons name="open-in-new" size={20} color="#fff" />
                                </TouchableOpacity>
                            )}


                            {sponsor.offers.length > 0 ? (
                                <View style={{ marginTop: 40 }}>
                                    <View style={[styles.row,{justifyContent:'space-between',marginBottom:20}]}>
                                        <Text style={[styles.sectionTitle, { fontSize: 14 }]}>Available Offers</Text>
                                        <TouchableOpacity
                                            style={[styles.tinyCTA]}
                                            onPress={() => setShowForm(true)}
                                        >
                                            <Ionicons name="add-outline" size={24} color="#fff" />
                                        </TouchableOpacity>
                                    </View>


                                    {sponsor.offers.map((offer) => (
                                        <TouchableOpacity
                                            key={offer._id}
                                            style={[styles.offer, { marginBottom: 15 }]}
                                            onPress={() => router.push(`/offer/${offer._id}`)}
                                        >
                                            {/* <Image
                                                source={{ uri: offer.photo }}
                                                style={{ width: 50, height: 50, borderRadius: 10 }}
                                            /> */}

                                            <View style={{ flex: 1, marginLeft: 15,marginBottom:10 }}>
                                                <Text style={[styles.fullCTAText, { fontSize: 16, fontWeight: "600" }]}>
                                                    {offer.name}
                                                </Text>

                                                {offer.deadline && (
                                                    <Text style={{ color: "#bbb", marginTop: 3 }}>
                                                        Deadline: {new Date(offer.deadline).toLocaleDateString()}
                                                    </Text>
                                                )}
                                            </View>

                                            <View style={[styles.fullCTA,{borderWidth:0}]}>
                                                <Text>Claim</Text>
                                            </View>

                                            {/* <MaterialIcons name="open-in-new" size={22} color="#fff" /> */}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <View style={{ marginTop: 40 }}>
                                    <Text style={[styles.sectionTitle, { fontSize: 14 }]}>Available Offers</Text>
                                    <TouchableOpacity
                                        style={[styles.tinyCTA, { position: 'absolute', right: 20, top: 0 }]}
                                        onPress={() => setShowForm(true)}
                                    >
                                        <Ionicons name="add-outline" size={24} color="#fff" />
                                    </TouchableOpacity>
                                    <Text style={[styles.description]}>No offers available</Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                )}
            </GestureHandlerRootView>
        </PaperProvider>
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
            backgroundColor: "#f85151",
            height: Platform.OS === "ios" ? 60 : 25,
        },
        container: {
            paddingHorizontal: 20,
        },
        redHeader: {
            backgroundColor: "#f85151",
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
            marginBottom: 10,
        },
        description: {
            fontFamily: "Manrope_400Regular",
            color: colorScheme === "dark" ? "#ccc" : "#333",
            lineHeight: 22,
        },
        fullCTA: {
            borderWidth: 1,
            borderRadius: 25,
            padding: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f85151",
            gap: 5
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
            fontSize: 16,
            color: colorScheme === "dark" ? "#fff" : "#000",
            marginBottom: 5,
        },
        offerDesc: {
            fontFamily: "Manrope_400Regular",
            color: colorScheme === "dark" ? "#ccc" : "#333",
        },
        center: {
            justifyContent: "center",
            alignItems: "center",
        },
        backBtn: { flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 20 },
        category: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#f85151' : '#f85151',
            fontFamily: 'Manrope_600SemiBold',
        },
        featured: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fbbf24' : '#fbbf24',
            fontFamily: 'Manrope_600SemiBold',
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
        offer:{
            borderRadius: 30,
            padding: 20,
            backgroundColor: colorScheme === 'dark' ? '#2c3854' : '#e4e4e4',
        }
    });
