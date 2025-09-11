import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function EventCard({ event, onPress }) {
    let colorScheme = useColorScheme();
    const styles = styling(colorScheme);

    const eventIsOpen = (event: any) => {
        const now = new Date();

        const eventDate = new Date(event.date);
        const deadline = new Date(event.enrollementDeadline);
        const isPastEvent = now > eventDate;
        const isPastDeadline = now > deadline;

        const isFull = event.enrolled.length >= event.totalNeeded;

        if (isPastEvent || isPastDeadline || isFull) {
            return "Closed";
        }
        return "Open";
    };

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
                                <Text style={styles.category}>{event.category}</Text>
                                <Text style={styles.title}>{event.title}</Text>
                            </View>

                            <Text style={[styles.status, eventIsOpen(event) == 'Open' && styles.open]}>
                                {eventIsOpen(event)}
                            </Text>
                        </View>
                        <Text style={styles.description}>{event.description}</Text>

                        <View style={[styles.row, { marginBottom: 15 }]}>
                            <View style={{ flex: 1 }}>
                                <View style={[styles.row, styles.location, { gap: 10 }]}>
                                    <Entypo name="location-pin" size={16} color={colorScheme === 'dark' ? '#fff' : "#000"} />
                                    <Text>{event.location}</Text>
                                </View>
                                <View style={[styles.row, styles.date, { gap: 10 }]}>
                                    <Entypo name="calendar" size={16} color={colorScheme === 'dark' ? '#fff' : "#000"} />
                                    <Text >{convertToDDMMYYYY(event.date)}</Text>
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={[styles.row, styles.enrolled, { gap: 10 }]}>
                                    <AntDesign name="team" size={16} color={colorScheme === 'dark' ? '#fff' : "#000"} />
                                    <Text>{event.enrolled.length}/{event.totalNeeded}</Text>
                                </View>
                                <View style={[styles.row, styles.time, { gap: 10 }]}>
                                    <Entypo name="time-slot" size={16} color={colorScheme === 'dark' ? '#fff' : "#000"} />
                                    <Text>From {event.startTime} till {event.endTime}</Text>
                                </View>
                            </View>

                        </View>

                        <Text style={styles.requirements}>{event.requirements}</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.cardFooter}>
                    {/* <Text style={styles.deadline}>{convertToDDMMYYYY(event.enrollementDeadline)}</Text> */}

                    <View style={[styles.row, styles.between]}>
                        <View style={[styles.row, { gap: 10 }]}>
                            <View style={[styles.reward, styles.points]}>
                                <MaterialIcons name="stars" size={18} color="#a16207" style={{ transform: [{ translateY: 1 }] }} />
                                <Text style={[styles.rewardText, styles.pointsText]}>
                                    {`${event.reward.points}`}
                                </Text>
                            </View>
                            <View style={[styles.reward, styles.money]}>
                                {/* <Feather name="dollar-sign" size={16} color="#15803d" /> */}
                                <FontAwesome name="money" size={16} color="#15803d" style={{ transform: [{ translateY: 1 }] }} />
                                <Text style={[styles.rewardText, styles.moneyText]}>
                                    {`${event.reward.money}${event.reward.currency}`}
                                </Text>
                            </View>
                        </View>
                        <View>
                            <TouchableOpacity onPress={() => { console.log("Enroll in ", event._id) }} style={styles.cardCTA}>
                                <Text style={styles.cardCTAText}>Enroll Now</Text>
                            </TouchableOpacity>
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
            flexDirection: 'row',
            backgroundColor: colorScheme === 'dark' ? '#2c3854' : '#e4e4e4',
            marginHorizontal: 16,
            marginVertical: 8,
            borderRadius: 20,
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
            color: colorScheme === 'dark' ? '#2563EB' : '#7d7f81',
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
            paddingHorizontal: 5,
            paddingBottom: 2,
            borderRadius: 10,
            color: colorScheme === 'dark' ? '#e70505' : "#e70505",
            backgroundColor: colorScheme === 'dark' ? '#f4b5b5' : "#f99d9d",
            fontFamily: 'Manrope_600SemiBold',
        },
        open: {
            color: '#15803d',
            backgroundColor: '#9af4b5',
            paddingBottom: 3,
        },
        description: {
            color: colorScheme === 'dark' ? '#fff' : "#000",
            marginBottom: 15,
            fontFamily: 'Manrope_400Regular',
            fontSize: 15
        },
        location: {
            color: colorScheme === 'dark' ? '#fff' : "#000",
            fontFamily: 'Manrope_400Regular',
            marginBottom: 10,
            opacity: 0.6
        },
        requirements: {
            color: colorScheme === 'dark' ? '#fff' : "#000",
            fontFamily: 'Manrope_400Regular',
            opacity: 0.4
        },
        date: {
            flex: 1,
            color: colorScheme === 'dark' ? '#fff' : "#000",
            fontFamily: 'Manrope_400Regular',
            opacity: 0.6
        },
        time: {
            flex: 1,
            color: colorScheme === 'dark' ? '#fff' : "#000",
            fontFamily: 'Manrope_400Regular',
            opacity: 0.6
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
            color: colorScheme === 'dark' ? '#fff' : "#000",
            flexDirection: 'row',
            alignItems: 'center',
            fontFamily: 'Manrope_400Regular',
            opacity: 0.6,
            marginBottom: 10,
        },
        reward: {
            color: colorScheme === 'dark' ? '#fff' : "#000",
            paddingHorizontal: 5,
            paddingBottom: 2,
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 10,
            gap: 5
        },
        points: {
            backgroundColor: '#f3df8b',
        },
        money: {
            backgroundColor: '#9af4b5',
        },
        pointsText: {
            color: '#a16207',
        },
        moneyText: {
            color: '#15803d',
        },
        rewardText: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 16
        },
        cardCTA: {
            backgroundColor: '#2563EB',
            borderRadius: 20,
            paddingTop: 5,
            paddingBottom: 7,
            paddingHorizontal: 10
        },
        cardCTAText: {
            color: 'white',
            fontFamily: 'Manrope_700Bold',
            fontSize: 16
        }
    });