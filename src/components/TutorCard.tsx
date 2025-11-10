import React from 'react';
import { View, useColorScheme, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Entypo from "@expo/vector-icons/Entypo";

export default function TutorCard({ tutor, onPress }) {
  const colorScheme = useColorScheme();
  const styles = styling(colorScheme);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <Image source={{ uri: tutor.user.photo }} style={styles.avatar} />

        <View>
          <Text style={styles.name}>{tutor.user.firstname} {tutor.user.lastname}</Text>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <FontAwesome name="star" size={14} color="#facc15" />
            <Text style={styles.ratingText}>
              {tutor.user.reviews==0 ? 'No ratings yet': tutor.user.rating.toFixed(1)}
              ({tutor.user.reviews} review{tutor.user.reviews != 1 && 's'})
            </Text>
          </View>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        {/* Subjects */}
        <View style={styles.subjectsContainer}>
          {tutor.subjects.map((subject) => (
            <View key={subject} style={styles.subjectBadge}>
              <Text style={styles.subjectText}>{subject}</Text>
            </View>
          ))}
        </View>

        {/* Bio */}
        <Text style={styles.description}>
          {tutor.user.bio|| "No Bio provided yet."}
        </Text>

        {/* <View style={[{ flexDirection: 'row', alignItems: 'center' }, styles.metaRow]}>
          <Entypo
            name="calendar"
            size={16}
            color={colorScheme === "dark" ? "#9ca3af" : "#4b5563"}

          />
          <Text style={styles.metaText}>Availability</Text>
        </View> */}
        {/* <Text style={[styles.metaText, { marginBottom: 10, fontFamily: 'Manrope_400Regular' }]}>
          {tutor.availability.join(', ')
          }</Text> */}

        <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }]}>
          {/* Rate & Availability */}
          {/* <View style={[{ flexDirection: 'row', alignItems: 'center' }, styles.reward, styles.money]}>
            <FontAwesome
              name="money"
              size={16}
              color="#10b981"
              style={{ transform: [{ translateY: 2 }] }}
            />
            <Text style={[styles.rewardText, styles.moneyText]}>
              ${tutor.hourlyRate}/hr
            </Text>
          </View> */}
          <View></View>

          {/* CTA */}
          <TouchableOpacity
            onPress={() => console.log("Message", tutor._id)}
            style={styles.cardCTA}
          >
            <Text style={styles.cardCTAText}>Send message</Text>
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
      borderRadius: 16,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
      marginHorizontal: 20,
      padding: 10,
      marginBottom: 10
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 36,
      marginRight: 16,
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: 18,
      color: colorScheme === "dark" ? "#f8f8f8" : "#1f2937",
      fontFamily: 'Manrope_700Bold',
      textTransform:'capitalize'

    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    ratingText: {
      fontSize: 14,
      color: '#6b7280',
      marginLeft: 4,
      fontFamily: 'Manrope_700Bold'

    },
    subjectsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 12,
    },
    subjectBadge: {
      // backgroundColor: '#e5e7eb',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingBottom: 1,
      borderWidth: 1,
      borderColor: '#10b981'
    },
    subjectText: {
      fontSize: 15,
      color: '#10b981',
      fontFamily: 'Manrope_400Regular'
    },
    description: {
      color: colorScheme === "dark" ? "#9ca3af" : "#4b5563",
      marginBottom: 12,
      fontSize: 15,
      lineHeight: 20,
      fontFamily: 'Manrope_400Regular'
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rate: {
      fontSize: 16,
      color: '#10b981',
      fontFamily: 'Manrope_700Bold'

    },
    availability: {
      fontSize: 12,
      color: '#9ca3af',
      marginBottom: 20
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
    metaRow: {
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
  });
