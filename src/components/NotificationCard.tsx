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
import { useTranslation } from '../i18n';

export default function NotificationCard({ item, onPress, onRefresh }) {
    const { t, language } = useTranslation();
    let colorScheme = useColorScheme();
    const styles = styling(colorScheme);

    const translateTitle = (title?: string) => {
        const text = title || "";
        const cleanText = text.replace(/[^\w\s:]/g, "").trim();

        const newMessageMatch = cleanText.match(/^New Message from (.+)$/);
        if (newMessageMatch) return t("notifications.newMessageFrom", { name: newMessageMatch[1] });

        const helpOfferMatch = text.match(/^Help Offer:\s*(.+)$/);
        if (helpOfferMatch) return t("notifications.helpOfferTitle", { title: helpOfferMatch[1] });

        const jobMatch = text.match(/^Job:\s*(.+)$/);
        if (jobMatch) return t("notifications.jobTitle", { title: jobMatch[1] });

        if (cleanText.includes("New Like")) return t("notifications.newLike");
        if (cleanText.includes("New Comment")) return t("notifications.newComment");
        if (cleanText.includes("New Share")) return t("notifications.newShare");
        if (cleanText.includes("New Event")) return t("notifications.newEvent");
        if (cleanText.includes("Payment Received")) return t("notifications.paymentReceived");
        if (cleanText.includes("Added as member")) return t("notifications.addedAsMember");
        if (cleanText.includes("Added as coach")) return t("notifications.addedAsCoach");

        return text;
    };

    const translateContent = (content?: string) => {
        const text = content || "";

        if (text === "Photo") return t("notifications.photo");
        if (text === "Voice message") return t("notifications.voiceMessage");
        if (text === "File") return t("notifications.file");
        if (text === "New message") return t("notifications.newMessage");
        if (text === "You are now a member of the club") return t("notifications.nowClubMember");
        if (text === "You are now the admin of the club") return t("notifications.nowClubAdmin");
        if (text === "Someone shared your post") return t("notifications.someoneSharedPost");

        const acceptedMatch = text.match(/^(.+) accepted your (request|bid)$/);
        if (acceptedMatch) {
            return t(acceptedMatch[2] === "request" ? "notifications.acceptedYourRequest" : "notifications.acceptedYourBid", { name: acceptedMatch[1] });
        }

        const placedMatch = text.match(/^(.+) placed a new (request|bid)$/);
        if (placedMatch) {
            return t(placedMatch[2] === "request" ? "notifications.placedNewRequest" : "notifications.placedNewBid", { name: placedMatch[1] });
        }

        const namedPatterns: Array<[RegExp, string]> = [
            [/^(.+) requested to close this job$/, "notifications.requestedCloseJob"],
            [/^(.+) marked the job as done$/, "notifications.markedJobDone"],
            [/^(.+) has reported a job$/, "notifications.sentReportMessage"],
            [/^(.+) opened a dispute$/, "notifications.openedDispute"],
            [/^(.+) marked the dispute as resolved$/, "notifications.resolvedDispute"],
            [/^(.+) joined the club$/, "notifications.joinedClub"],
            [/^(.+) liked your post$/, "notifications.likedPost"],
            [/^(.+) commented on your post$/, "notifications.commentedPost"],
            [/^(.+) shared your post$/, "notifications.sharedPost"],
            [/^(.+) enrolled$/, "notifications.enrolled"],
        ];

        for (const [pattern, key] of namedPatterns) {
            const match = text.match(pattern);
            if (match) return t(key, { name: match[1] });
        }

        const scheduledMatch = text.match(/^You have a new (.+) scheduled for (.+)\.$/);
        if (scheduledMatch) {
            return t("notifications.scheduledEvent", { eventType: scheduledMatch[1], date: scheduledMatch[2] });
        }

        const memberTeamMatch = text.match(/^You have been added to the team "(.+)"$/);
        if (memberTeamMatch) return t("notifications.addedTeamMember", { team: memberTeamMatch[1] });

        const coachTeamMatch = text.match(/^You have been assigned to coach the team "(.+)"$/);
        if (coachTeamMatch) return t("notifications.addedTeamCoach", { team: coachTeamMatch[1] });

        const paymentMatch = text.match(/^(.+) were transfer(?:r)?ed to your wallet from (.+)\.$/);
        if (paymentMatch) return t("notifications.paymentReceivedBody", { amount: paymentMatch[1], name: paymentMatch[2] });

        return text;
    };

    const convertToTimeAgo = (date: string) => {
        const parsedDate = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - parsedDate.getTime();

        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSeconds < 60) return t("common.justNow");
        if (diffMinutes < 60) return t(diffMinutes === 1 ? "common.minAgo" : "common.minsAgo", { count: diffMinutes });
        if (diffHours < 24) return t(diffHours === 1 ? "common.hourAgo" : "common.hoursAgo", { count: diffHours });
        if (diffDays < 7) return t(diffDays === 1 ? "common.dayAgo" : "common.daysAgo", { count: diffDays });

        // For dates older than a week, show full date
        const day = String(parsedDate.getDate()).padStart(2, "0");
        const month = parsedDate.toLocaleString(language === "tr" ? "tr-TR" : "en-US", { month: "short" });
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

    const handlePressed = async (id: string) => {
        onPress()
    }

    return (
        <View style={styles.card}>
            <View style={styles.content}>
                <TouchableOpacity onPress={() => { handlePressed(item._id) }}>
                    <View style={styles.cardContent}>
                        <View style={[styles.row, { gap: 10 }]}>
                            <Text style={styles.title}>{translateTitle(item.title)}</Text>
                            <Text style={styles.deadline}>{convertToTimeAgo(item.dateTime)}</Text>
                        </View>
                        <Text style={styles.description}>{translateContent(item.content)}</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.cardFooter}>
                    {!item.read && <View style={[styles.row, styles.between]}>
                        <View style={[styles.row, { gap: 20 }]}>
                            <TouchableOpacity onPress={() => { handlePressed(item._id) }}>
                                <Text style={styles.notificationCtaText}>
                                    {t("notifications.view")}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { handleNotificationRead(item._id) }}>
                                <Text style={styles.notificationCtaText}>
                                    {t("notifications.markAsRead")}
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
