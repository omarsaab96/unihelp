import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

export default function Card({ tutor, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image source={{ uri: tutor.avatar }} style={styles.avatar} />
      <View style={styles.content}>
        <Text style={styles.name}>{tutor.name}</Text>
        <View style={styles.ratingRow}>
          <Text style={styles.rating}>⭐ {tutor.rating}</Text>
          <Text style={styles.reviews}>({tutor.reviewCount} reviews)</Text>
        </View>
        <Text style={styles.subjects}>{tutor.subjects.join(', ')}</Text>
        <Text style={styles.rate}>${tutor.hourlyRate}/hour</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    color: '#f59e0b',
    marginRight: 8,
  },
  reviews: {
    fontSize: 14,
    color: '#6b7280',
  },
  subjects: {
    fontSize: 14,
    color: '#2563eb',
    marginBottom: 4,
  },
  rate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
});