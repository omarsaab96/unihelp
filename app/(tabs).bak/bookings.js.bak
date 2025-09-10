import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';

const upcomingSessions = [
  {
    id: '1',
    subject: 'Calculus I',
    tutor: 'Sarah Chen',
    date: '2024-01-15',
    time: '2:00 PM',
    location: 'Library Study Room 3A',
    status: 'confirmed'
  },
  {
    id: '2',
    subject: 'Python Programming',
    tutor: 'Marcus Johnson',
    date: '2024-01-16',
    time: '4:00 PM',
    location: 'Computer Lab B',
    status: 'pending'
  }
];

export default function BookingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>My Bookings</Text>
          <Text style={styles.subtitle}>
            Manage your upcoming tutoring sessions
          </Text>
        </View>
        
        <View style={styles.sessionsContainer}>
          {upcomingSessions.map(session => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <Text style={styles.subject}>{session.subject}</Text>
                <View style={[
                  styles.statusBadge,
                  session.status === 'confirmed' ? styles.confirmedBadge : styles.pendingBadge
                ]}>
                  <Text style={styles.statusText}>
                    {session.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.tutor}>with {session.tutor}</Text>
              <Text style={styles.datetime}>
                {session.date} • {session.time}
              </Text>
              <Text style={styles.location}>📍 {session.location}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  sessionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sessionCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confirmedBadge: {
    backgroundColor: '#d1fae5',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  tutor: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  datetime: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  location: {
    fontSize: 12,
    color: '#6b7280',
  },
});