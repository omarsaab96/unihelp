import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { transform } from '@babel/core';
import Fontisto from '@expo/vector-icons/Fontisto';
import { fetchWithAuth } from "../../src/api";

export default function NotificationCard({ item, onPress, onRefresh }) {
    let colorScheme = useColorScheme();
    const styles = styling(colorScheme);

    const convertToTimeAgo = (date: string) => {
        const parsedDate = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - parsedDate.getTime();

        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSeconds < 60) return "Just now";
        if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes > 1 ? "s" : ""} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

        // For dates older than a week, show full date
        const day = String(parsedDate.getDate()).padStart(2, "0");
        const month = parsedDate.toLocaleString("en-US", { month: "short" });
        const year = parsedDate.getFullYear();

        return `${day} ${month} ${year}`;
    };

    const handleNotificationRead = async (id: string) => {
        try {
            const res = await fetchWithAuth(`/notifications/${id}/read`, { method: "PATCH" });

            if (res.ok) {
                const updatedNotification = await res.json();
                console.log(`Notification ${id} marked as read`, updatedNotification);
                onRefresh();
            } else {
                const errorData = await res.json();
                console.error("Failed to mark notification as read:", errorData);
            }
        } catch (err: any) {
            console.error("Error marking notification as read:", err.message);
        }
    };

    return (
        <View style={styles.card}>
            <View style={styles.content}>
                <TouchableOpacity onPress={onPress}>
                    <View style={styles.cardContent}>
                        <View style={[styles.row, { gap: 10 }]}>
                            <Text style={styles.title}>{item.title}</Text>
                            <Text style={styles.deadline}>{convertToTimeAgo(item.dateTime)}</Text>
                        </View>
                        <Text style={styles.description}>{item.content}</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.cardFooter}>
                    {!item.read && <View style={[styles.row, styles.between]}>
                        <View style={[styles.row, { gap: 20 }]}>
                            <TouchableOpacity onPress={onPress}>
                                <Text style={styles.notificationCtaText}>
                                    View
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { handleNotificationRead(item._id) }}>
                                <Text style={styles.notificationCtaText}>
                                    Mark as read
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>}
                </View>
            </View>
        </View>
    );
}

const styling = (colorScheme: string) =>
    StyleSheet.create({
        card: {
            backgroundColor: colorScheme === "dark" ? "#131d33" : "#f9f9f9",
            marginVertical: 8,
            borderRadius: 16,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 3,
        },
        content: {
            flex: 1,
        },
        cardContent: {
            paddingTop: 10,
            paddingHorizontal: 10,
        },
        category: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#6898ffff' : '#7d7f81',
            fontFamily: 'Manrope_500Medium'
        },
        title: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 16,
            color: colorScheme === 'dark' ? '#fff' : '#1f2937',
            marginBottom: 5,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        between: {
            justifyContent: 'space-between'
        },
        status: {
            // paddingHorizontal: 5,
            // paddingBottom: 2,
            // borderRadius: 10,
            color: colorScheme === 'dark' ? '#f62a2a' : "#e70505",
            // backgroundColor: colorScheme === 'dark' ? '#f4b5b5' : "#f99d9d",
            fontFamily: 'Manrope_700Bold',
        },
        open: {
            color: colorScheme === 'dark' ? '#42fa82' : "#15803d",
            // backgroundColor: '#9af4b5',
            // paddingBottom: 3,
        },
        description: {
            color: colorScheme === 'dark' ? '#fff' : "#000",
            fontFamily: 'Manrope_400Regular',
            fontSize: 15
        },
        location: {
            color: colorScheme === "dark" ? "#9ca3af" : "#4b5563",
            fontFamily: 'Manrope_700Bold',
            marginBottom: 10,
        },
        requirements: {
            color: colorScheme === "dark" ? "#9ca3af" : "#4b5563",
            fontFamily: 'Manrope_700Bold',
        },
        date: {
            flex: 1,
            color: colorScheme === "dark" ? "#9ca3af" : "#4b5563",
            fontFamily: 'Manrope_700Bold',
        },
        time: {
            flex: 1,
            color: colorScheme === "dark" ? "#9ca3af" : "#4b5563",
            fontFamily: 'Manrope_700Bold',
        },
        cardFooter: {
            // borderTopWidth: 1,
            borderColor: colorScheme === 'dark' ? '#263047' : "#e4e4e4",
            paddingHorizontal: 10,
            paddingVertical: 10
        },
        deadline: {
            color: colorScheme === 'dark' ? '#fff' : "#aaa",
            fontFamily: 'Manrope_400Regular',
            fontSize: 14
        },
        enrolled: {
            color: colorScheme === "dark" ? "#9ca3af" : "#4b5563",
            flexDirection: 'row',
            alignItems: 'center',
            fontFamily: 'Manrope_700Bold',
            marginBottom: 10,
        },
        reward: {
            flexDirection: "row",
            alignItems: "center",
            // paddingVertical: 4,
            // paddingHorizontal: 8,
            borderRadius: 10,
            gap: 5,
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
        pointsText: {
            color: colorScheme === 'dark' ? "#fbbf24" : "#ca8a04"
        },
        cardCTA: {
            backgroundColor: '#2563EB',
            borderRadius: 20,
            paddingTop: 5,
            paddingBottom: 7,
            paddingHorizontal: 10
        },
        cardCTARed: {
            backgroundColor: 'transparent'
        },
        cardCTAText: {
            color: 'white',
            fontFamily: 'Manrope_700Bold',
            fontSize: 16
        },
        cardCTATextRed: {
            color: colorScheme === 'dark' ? '#f62a2a' : "#e70505",
        },
        notificationCtaText: {
            color: '#2563EB',
            fontFamily: 'Manrope_700Bold',
            fontSize: 16
        }
    });