import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { transform } from '@babel/core';

export default function NewsCard({ news, onPress }) {
    let colorScheme = useColorScheme();
    const styles = styling(colorScheme);

    const convertToDDMMYYYY = (date: string) => {
        let parsedate = new Date(date);
        const day = String(parsedate.getDate()).padStart(2, "0");
        const month = parsedate.toLocaleString("en-US", { month: "short" });
        const year = parsedate.getFullYear();

        return `${day} ${month} ${year}`;
    };

    return (
        <View style={styles.card}>
            <View style={styles.content}>
                <TouchableOpacity onPress={onPress}>
                    <View style={styles.cardContent}>
                        <View style={[styles.row, styles.between, { marginBottom: 10 }]}>
                            <View>
                                <Text style={styles.category}>{news.category}</Text>
                                <Text style={styles.title}>{news.title}</Text>
                            </View>
                        </View>
                        <Text style={styles.description}>{news.description}</Text>

                        {/* <View style={[styles.row, { marginBottom: 15 }]}>
                            <View style={{ flex: 1 }}>
                                <View style={[styles.row, { gap: 10, alignItems: 'baseline' }]}>
                                    <MaterialIcons name="location-pin" size={16} color={colorScheme === 'dark' ? '#9ca3af' : "#4b5563"} style={{ transform: [{ translateY: 2 }] }} />
                                    <Text style={styles.location}>{news.location}</Text>
                                </View>
                                <View style={[styles.row, { gap: 10, alignItems: 'baseline' }]}>
                                    <Entypo name="calendar" size={16} color={colorScheme === 'dark' ? '#9ca3af' : "#4b5563"} />
                                    <Text style={styles.date}>{convertToDDMMYYYY(news.date)}</Text>
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={[styles.row, { gap: 10, alignItems: 'baseline' }]}>
                                    <AntDesign name="team" size={16} color={colorScheme === 'dark' ? '#9ca3af' : "#4b5563"} />
                                    <Text style={styles.enrolled}>{news.enrolled.length}/{news.totalNeeded}</Text>
                                </View>
                                <View style={[styles.row, { gap: 10, alignItems: 'baseline' }]}>
                                    <Entypo name="time-slot" size={16} color={colorScheme === 'dark' ? '#9ca3af' : "#4b5563"} />
                                    <Text style={styles.time}>From {news.startTime} till {news.endTime}</Text>
                                </View>
                            </View>

                        </View> */}
                    </View>
                </TouchableOpacity>

                <View style={styles.cardFooter}>
                    <View style={[styles.row, styles.between]}>
                        <View style={[styles.row, { gap: 20 }]}>
                            <Text style={styles.date}>{convertToDDMMYYYY(news.date)}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
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
            fontSize: 20,
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
            marginBottom: 15,
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
            marginTop: 10,
            paddingHorizontal: 10,
            paddingVertical: 10
        },
        deadline: {
            color: colorScheme === 'dark' ? '#fff' : "#000",
            fontFamily: 'Manrope_400Regular',
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
        }
    });