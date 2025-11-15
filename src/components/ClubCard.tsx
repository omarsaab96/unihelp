import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { transform } from '@babel/core';
import { ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Octicons from '@expo/vector-icons/Octicons';

export default function Clubcard({ club, userid, joining, onPress }) {
    const router = useRouter();
    let colorScheme = useColorScheme();
    const styles = styling(colorScheme);

    return (
        <View style={styles.card}>
            <View style={styles.content}>
                <TouchableOpacity onPress={() => { router.push(`/clubDetails?clubid=${club._id}`) }}>
                    <View style={styles.cardContent}>
                        <View style={[styles.row, styles.between, { marginBottom: 10 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                                <Image source={club?.image && club.image.trim() !== "" ? { uri: club.image } : colorScheme === 'dark' ? require("../../assets/images/minimalLogo_white.png") : require("../../assets/images/minimalLogo_black.png")} style={{ width: 50, height: 50, borderRadius: 25, objectFit: 'contain' }} />
                                <View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 }}>
                                        <Text style={styles.title}>{club.name}</Text>
                                        {club.verified != null && <Octicons name="verified" size={18} color={colorScheme === 'dark' ? '#fff' : '#000'} style={{ marginTop: 4 }} />}
                                    </View>

                                    <Text style={styles.category}>{club.category}</Text>
                                </View>
                            </View>
                        </View>
                        <Text style={styles.description}>{club.description}</Text>

                        {/* <View style={[styles.row]}>
                            <View style={{ flex: 1 }}>
                                <View style={[styles.row, { gap: 10, alignItems: 'baseline' }]}>
                                    <AntDesign name="team" size={16} color={colorScheme === 'dark' ? '#9ca3af' : "#4b5563"} />
                                    <Text style={styles.enrolled}>
                                        {club.members.length} member{club.members.length !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                                <View style={[styles.row, { gap: 10, alignItems: 'baseline' }]}>
                                    <Entypo name="time-slot" size={16} color={colorScheme === 'dark' ? '#9ca3af' : "#4b5563"} />
                                    <Text style={styles.time}>From {club.startTime} till {club.endTime}</Text>
                                </View>
                            </View>
                        </View> */}

                        {/* <Text style={styles.requirements}>{club.requirements}</Text> */}
                    </View>
                </TouchableOpacity>

                <View style={styles.cardFooter}>
                    {/* <Text style={styles.deadline}>{convertToDDMMYYYY(club.enrollementDeadline)}</Text> */}

                    <View style={[styles.row, styles.between]}>
                        {/* <View style={[styles.row, { gap: 20 }]}>
                            <View style={[styles.reward, styles.points]}>
                                <MaterialIcons name="stars" size={18}
                                    color={colorScheme === "dark" ? "#fbbf24" : "#ca8a04"}
                                    style={{ transform: [{ translateY: 1 }] }} />
                                <Text style={[styles.rewardText, styles.pointsText]}>
                                    {`${club.reward.points}`}
                                </Text>
                            </View>
                            <View style={[styles.reward, styles.money]}>
                                <Feather name="dollar-sign" size={16} color="#15803d" />
                                <FontAwesome name="money" size={16} color="#10b981"
                                    style={{ transform: [{ translateY: 1 }] }} />
                                <Text style={[styles.rewardText, styles.moneyText]}>
                                    {`${club.reward.money}${club.reward.currency}`}
                                </Text>
                            </View>
                        </View> */}
                        <View style={[styles.row, { gap: 10, alignItems: 'baseline' }]}>
                            <AntDesign name="team" size={16} color={colorScheme === 'dark' ? '#9ca3af' : "#4b5563"} />
                            <Text style={styles.enrolled}>
                                {club.members.length} member{club.members.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                        {userid != club.createdBy._id && <View>
                            {club.members?.includes(userid) ? (
                                <Text style={styles.membermsg}>
                                    You are a member
                                </Text>
                            ) : (
                                <TouchableOpacity
                                    onPress={onPress}
                                    style={styles.cardCTA}
                                    disabled={joining == club._id}
                                >
                                    <Text style={styles.cardCTAText}>
                                        {joining == club._id ? 'Joining' : 'Join'} club
                                    </Text>
                                    {joining == club._id && <ActivityIndicator size='small' color='#fff' />}
                                </TouchableOpacity>
                            )}
                        </View>}

                    </View>
                </View>
            </View>
        </View >
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
            color: colorScheme === 'dark' ? '#8125eb' : '#8125eb',
            fontFamily: 'Manrope_500Medium',
        },
        title: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 18,
            color: colorScheme === 'dark' ? '#fff' : '#1f2937',
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
            backgroundColor: '#8125eb',
            borderRadius: 20,
            paddingTop: 5,
            paddingBottom: 7,
            paddingHorizontal: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10
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
        membermsg: {
            fontStyle: 'italic',
            color: '#888'
        }
    });