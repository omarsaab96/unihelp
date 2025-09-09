import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

const subjects = [
  'All', 'Mathematics', 'Physics', 'Computer Science', 
  'Chemistry', 'Biology', 'Spanish', 'English', 'History'
];

export default function SubjectFilter({ selectedSubject, onSubjectSelect }) {
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {subjects.map((subject) => (
          <TouchableOpacity
            key={subject}
            style={[
              styles.filterButton,
              selectedSubject === subject && styles.activeFilter
            ]}
            onPress={() => onSubjectSelect(subject)}
          >
            <Text style={[
              styles.filterText,
              selectedSubject === subject && styles.activeFilterText
            ]}>
              {subject}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  filterButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
  },
});