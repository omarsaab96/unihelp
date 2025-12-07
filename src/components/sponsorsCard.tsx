import React from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions, StyleSheet, useColorScheme } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { transform } from '@babel/core';

const { width } = Dimensions.get('window');

export default function SponsorsCard({ event, isFeatured = false, onPress }) {
    let colorScheme = useColorScheme();
    const styles = styling(colorScheme);

    return (
        <View>
            <View style={styles.content}>
                <TouchableOpacity onPress={onPress}>
                    <View style={[styles.card, isFeatured && styles.featuredCard]}>
                        <Image style={styles.sponsorLogo} source={{ uri: event.logo }} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={styles.category}>{event.category || 'No category'}</Text>
                        <Text style={styles.title}>{event.name}</Text>
                        <Text
                            style={styles.description}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                        >{event.description}</Text>
                    </View>
                </TouchableOpacity>

                {/* <View style={styles.cardFooter}>
                    <View style={[styles.row, styles.between]}>
                        <View>
                        </View>
                        <View style={styles.reward}>
                            <MaterialIcons
                                name="local-offer"
                                size={18}
                                color={colorScheme === "dark" ? "#fbbf24" : "#ca8a04"}
                                style={{ transform: [{ translateY: 1 }] }}
                            />
                            <Text style={[styles.rewardText, styles.pointsText]}>
                                Check offers
                            </Text>
                        </View>
                    </View>
                </View> */}
            </View>
        </View>
    );
}

const styling = (colorScheme: string) =>
    StyleSheet.create({
        card: {
            backgroundColor: colorScheme === "dark" ? "#131d33" : "#f9f9f9",
            marginHorizontal: 5,
            marginVertical: 8,
            borderRadius: 16,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 3,
            width: width * 0.5,
            borderWidth: 3,
            borderColor: 'transparent',
            height: 100,
            justifyContent: 'center',
            alignContent: 'center',
            overflow: 'hidden'
        },
        featuredCard: {
            borderColor: '#fbbf24',
            // width:width-40
        },
        content: {
            // flex: 1,
        },
        cardContent: {
            paddingHorizontal: 10,
            position: 'relative',
            width: width * 0.52,
        },
        sponsorLogo: {
            height: '100%',
            width: '100%',
            objectFit: 'cover',
        },
        featuredBadge: {
            position: 'absolute',
            backgroundColor: '#fbbf24',
            color: '#6c5524',
            paddingHorizontal: 5,
            fontFamily: 'Manrope_500Medium',
            fontSize: 12,
            right: 5,
            top: 5,
            borderRadius: 20
        },
        category: {
            fontSize: 12,
            color: colorScheme === 'dark' ? '#f85151' : '#f85151',
            fontFamily: 'Manrope_600SemiBold'
        },
        title: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 16,
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
            borderRadius: 20,
            overflow: 'hidden',
            gap: 5,
            flex: 1,
            backgroundColor: colorScheme === 'dark' ? '#4f4323' : '#fede8d',
            justifyContent: 'center',
            paddingBottom: 2,
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
            fontSize: 14,
            color: '#10b981',
            fontFamily: 'Manrope_700Bold',
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