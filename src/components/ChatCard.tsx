import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { transform } from '@babel/core';
import Fontisto from '@expo/vector-icons/Fontisto';
import { getCurrentUser, fetchWithAuth } from "../../src/api";
import { localstorage } from '../../utils/localStorage';

export default function ChatCard({ item, onPress, onRefresh }) {
    let colorScheme = useColorScheme();
    const styles = styling(colorScheme);

    const [user, setUser] = useState(null);
    const [receiver, setReceiver] = useState(null);
    const [expanded, setExpanded] = useState(false);

    // console.log(item)

    useEffect(() => {
        const getUserInfo = async () => {
            try {
                const data = await getCurrentUser();
                if (data.error) console.error("Error", data.error);
                else {
                    await localstorage.set('user', JSON.stringify(data))
                    setUser(data)

                    let receiver = item.participants.find(p => p._id !== data._id)

                    setReceiver(receiver == undefined ? {
                        "firstname": "Unknown",
                        "lastname": "User",
                        "photo": null
                    } : receiver);
                }
            } catch (err: any) {
                console.error("Error", err.message);
            }
        }

        getUserInfo();
    }, [])

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

    // const handleNotificationRead = async (id: string) => {
    //     try {
    //         const res = await fetchWithAuth(`/notifications/${id}/read`, { method: "PATCH" });

    //         if (res.ok) {
    //             const updatedNotification = await res.json();
    //             console.log(`Notification ${id} marked as read`, updatedNotification);
    //             onRefresh();
    //         } else {
    //             const errorData = await res.json();
    //             console.error("Failed to mark notification as read:", errorData);
    //         }
    //     } catch (err: any) {
    //         console.error("Error marking notification as read:", err.message);
    //     }
    // };

    const threads = item.threads?.length ? item.threads : [{
        chatId: item._id,
        helpOfferId: item.helpOffer?._id || null,
        title: item.helpOffer?.title || "Direct chat",
        type: item.helpOffer?.type || "direct",
        lastMessage: item.lastMessage,
        lastMessageSenderId: item.lastMessageSenderId,
        lastMessageAt: item.lastMessageAt,
    }];

    const getThreadLabel = (thread: any) => {
        if (thread.type === "direct") return "Direct";
        return thread.type === "offer" ? "Offer" : "Request";
    };

    const visibleThreads = expanded ? threads : threads.slice(0, 1);
    const hasMultipleThreads = threads.length > 1;

    return (
        <View style={styles.card}>
            <View style={styles.content}>
                {user != null && receiver != null && <View>
                    <View style={styles.cardContent}>
                        <View>
                            <Image source={receiver.photo == null ? require("../../assets/images/defaultavatar.png") : { uri: receiver.photo }} style={styles.avatar} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={[styles.row, styles.between, { gap: 10 }]}>
                                <TouchableOpacity onPress={() => onPress(threads[0])} style={{ flex: 1 }}>
                                    <View style={[styles.row, { gap: 8 }]}>
                                        <Text style={styles.title}>{receiver.firstname} {receiver.lastname}</Text>
                                        {(item.unreadCount || 0) > 0 && <View style={styles.unreadDot} />}
                                    </View>
                                </TouchableOpacity>
                                {hasMultipleThreads && (
                                    <TouchableOpacity
                                        onPress={() => setExpanded((prev) => !prev)}
                                        style={styles.threadToggle}
                                    >
                                        <Text style={styles.threadCount}>
                                            {threads.length} threads
                                        </Text>
                                        <Feather
                                            name={expanded ? "chevron-up" : "chevron-down"}
                                            size={16}
                                            color={colorScheme === 'dark' ? '#d1d5db' : '#4b5563'}
                                            style={{marginRight:-5}}
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={styles.threadList}>
                                {visibleThreads.map((thread: any) => (
                                    <TouchableOpacity key={thread.chatId || thread.helpOfferId || thread.title} style={styles.threadRow} onPress={() => onPress(thread)}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.threadLabel} numberOfLines={1}>
                                                {getThreadLabel(thread)}
                                                {thread.type !== "direct" && thread.title ? `: ${thread.title}` : ""}
                                            </Text>
                                            <Text style={styles.description} numberOfLines={1}>
                                                {thread.lastMessageSenderId == user._id && 'You: '}
                                                {thread.lastMessage || "No messages yet"}
                                            </Text>
                                        </View>
                                        <View style={styles.threadMeta}>
                                            {(thread.unreadCount || 0) > 0 && (
                                                <View style={styles.unreadBadge}>
                                                    <Text style={styles.unreadBadgeText}>
                                                        {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                                                    </Text>
                                                </View>
                                            )}
                                            <Text style={styles.deadline}>
                                                {convertToTimeAgo(thread.lastMessageAt)}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>}

                {/* <View style={styles.cardFooter}>
                    {!item.read && <View style={[styles.row, styles.between]}>
                        <View style={[styles.row, { gap: 20 }]}>
                            <TouchableOpacity onPress={() => { handleNotificationRead(item._id) }}>
                                <Text style={styles.notificationCtaText}>
                                    Mark as read
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>}
                </View> */}
            </View>
        </View>
    );
}

const styling = (colorScheme: string) =>
    StyleSheet.create({
        card: {
            borderBottomWidth: 1,
            borderBottomColor: colorScheme === 'dark' ? '#2c3854' : '#ccc',
            paddingHorizontal: 20
        },
        content: {
            flex: 1,
        },
        cardContent: {
            paddingVertical: 12,
            // paddingHorizontal: 10,
            flexDirection: 'row',
            gap: 15,
            alignItems: 'flex-start'
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
            textTransform: 'capitalize'
        },
        threadList: {
            marginTop: 8,
            gap: 8,
        },
        threadRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
        },
        threadLabel: {
            fontFamily: 'Manrope_500Medium',
            fontSize: 12,
            color: colorScheme === 'dark' ? '#d1d5db' : '#4b5563',
        },
        threadCount: {
            fontFamily: 'Manrope_500Medium',
            fontSize: 12,
            color: colorScheme === 'dark' ? '#d1d5db' : '#4b5563',
        },
        threadToggle: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 4,
            paddingLeft: 8,
        },
        avatar: {
            width: 40,
            height: 40,
            borderRadius: 50,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        unreadDot: {
            width: 9,
            height: 9,
            borderRadius: 999,
            backgroundColor: '#10b981',
        },
        threadMeta: {
            alignItems: 'flex-end',
            gap: 4,
        },
        unreadBadge: {
            minWidth: 20,
            height: 20,
            borderRadius: 999,
            paddingHorizontal: 6,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#10b981',
        },
        unreadBadgeText: {
            color: '#fff',
            fontFamily: 'Manrope_700Bold',
            fontSize: 11,
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
            color: colorScheme === 'dark' ? '#9ca3af' : "#777",
            fontFamily: 'Manrope_400Regular',
            fontSize: 12,
            minWidth: 72,
            textAlign: 'right',
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
