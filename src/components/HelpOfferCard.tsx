import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    useColorScheme,
} from "react-native";
import AntDesign from "@expo/vector-icons/AntDesign";
import Entypo from "@expo/vector-icons/Entypo";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome from "@expo/vector-icons/FontAwesome";

export default function HelpOfferCard({offer, onPress }) {
    const colorScheme = useColorScheme();
    const styles = styling(colorScheme);

    const handleGoToProfile = (userId: string) => {
        console.log(userId)
    };

    const formatDate = (date?: string) => {
        if (!date) return "Flexible";
        const d = new Date(date);
        return d.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
            <View style={styles.cardContent}>
                {/* User */}
                <TouchableOpacity onPress={() => { handleGoToProfile(offer.user._id) }} style={[styles.row, styles.between, { marginBottom: 12 }]}>
                    <View style={[styles.row, { gap: 20, marginBottom: 10 }]}>
                        <Image style={styles.profileImage} source={{uri:offer.user.photo}} />
                        <View>
                            <Text style={styles.userName}>{offer.user.firstname} {offer.user.lastname}</Text>
                            <View style={[styles.row, styles.metaRow]}>
                                <AntDesign
                                    name="star"
                                    size={12}
                                    color={colorScheme === "dark" ? "#fbbf24" : "#ca8a04"}
                                />
                                <Text style={styles.metaText}>
                                    {offer.rating ? offer.rating.toFixed(1) : "No ratings yet"}
                                </Text>
                                <Text style={styles.metaText}>
                                    ({offer.reviews || 0} review{offer.reviews == 1 ? '' : 's'})
                                </Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Header */}
                <View style={[styles.row, styles.between, { marginBottom: 12 }]}>
                    <View>
                        <Text style={[styles.subject, { textTransform: "capitalize" }]}>
                            {offer.helpType} • {offer.subject}
                        </Text>
                        <Text style={styles.title}>{offer.title}</Text>
                    </View>
                </View>

                {/* Description */}
                <Text style={styles.description}>
                    {offer.description}
                </Text>

                {/* Meta Info */}

                <View style={[styles.row, styles.metaRow, {marginBottom:0}]}>
                    <Entypo
                        name="calendar"
                        size={16}
                        color={colorScheme === "dark" ? "#9ca3af" : "#4b5563"}

                    />
                    <Text style={styles.metaText}>Availability</Text>
                </View>
                <Text style={[styles.metaText, { marginBottom: 10, fontFamily: 'Manrope_400Regular' }]}>
                    {formatDate(offer.availability)}
                </Text>


                {/* Footer */}
                <View style={[styles.row, styles.between, { marginTop: 15 }]}>
                    {/* Price */}
                    <View style={[styles.row, styles.reward, styles.money]}>
                        <FontAwesome
                            name="money"
                            size={16}
                            color="#10b981"
                            style={{ transform: [{ translateY: 2 }] }}
                        />
                        <Text style={[styles.rewardText, styles.moneyText]}>
                            {offer.price === 0 ? "Free" : `$${offer.price}`}/hr
                        </Text>
                    </View>

                    {/* CTA */}
                    <TouchableOpacity
                        onPress={() => console.log("Enroll in", offer._id)}
                        style={styles.cardCTA}
                    >
                        <Text style={styles.cardCTAText}>Schedule now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styling = (colorScheme: string) =>
    StyleSheet.create({
        card: {
            backgroundColor: colorScheme === "dark" ? "#131d33" : "#f9f9f9",
            marginHorizontal: 16,
            marginVertical: 8,
            borderRadius: 16,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 3,
        },
        cardContent: {
            padding: 14,
        },
        subject: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#10b981' : '#7d7f81',
            fontFamily: 'Manrope_500Medium'
        },
        title: {
            fontSize: 16,
            color: colorScheme === "dark" ? "#fff" : "#111827",
            marginBottom: 5,
            fontFamily: 'Manrope_700Bold'
        },
        profileImage: {
            width: 50,
            height: 50,
            objectFit: 'cover',
            borderRadius: 30
        },
        userName: {
            fontSize: 18,
            color: colorScheme === "dark" ? "#fff" : "#111827",
            fontFamily: 'Manrope_700Bold',
            textTransform: 'capitalize'
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
        },
        between: {
            justifyContent: "space-between",
        },
        description: {
            color: colorScheme === "dark" ? "#9ca3af" : "#4b5563",
            marginBottom: 12,
            fontSize: 15,
            lineHeight: 20,
            fontFamily: 'Manrope_400Regular'
        },
        metaRow: {
            marginBottom: 6,
            gap: 8,
        },
        metaText: {
            fontSize: 14,
            color: colorScheme === "dark" ? "#9ca3af" : "#4b5563",
            fontFamily: 'Manrope_700Bold'
        },
        reward: {
            flexDirection: "row",
            alignItems: "center",
            // paddingVertical: 4,
            // paddingHorizontal: 8,
            borderRadius: 10,
            gap: 6,
        },
        money: {
            // backgroundColor: "#dcfce7",
        },
        moneyText: {
            fontSize: 16,
            color: '#10b981',
            fontFamily: 'Manrope_700Bold'
        },
        rewardText: {
            fontSize: 16,
            color: '#10b981',
            fontFamily: 'Manrope_700Bold'
        },

        cardCTA: {
            backgroundColor: "#10b981",
            borderRadius: 20,
            paddingVertical: 6,
            paddingHorizontal: 16,
        },
        cardCTAText: {
            color: colorScheme === "dark" ? "#131d33" : "#f9f9f9",
            fontSize: 15,
            fontFamily: 'Manrope_700Bold',
        },
    });
