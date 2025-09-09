import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function SessionCard({ session, tutor, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.subject}>{session.subject}</Text>
        <Text style={styles.price}>${session.price}</Text>
      </View>
      <Text style={styles.title}>{session.title}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {session.description}
      </Text>
      <View style={styles.details}>
        <Text style={styles.tutor}>with {tutor?.name}</Text>
        <Text style={styles.datetime}>
          {session.date} • {session.time}
        </Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.location}>📍 {session.location}</Text>
        <Text style={styles.duration}>{session.duration} min</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  details: {
    marginBottom: 8,
  },
  tutor: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  datetime: {
    fontSize: 14,
    color: '#6b7280',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  location: {
    fontSize: 12,
    color: '#6b7280',
  },
  duration: {
    fontSize: 12,
    color: '#6b7280',
  },
});