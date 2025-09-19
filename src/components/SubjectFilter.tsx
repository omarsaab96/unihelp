import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useColorScheme } from 'react-native';

const subjects = [
  'All', 'Mathematics', 'Physics', 'Computer Science', 
  'Chemistry', 'Biology', 'Spanish', 'English', 'History'
];

export default function SubjectFilter({ selectedSubject, onSubjectSelect }) {
  const colorScheme = useColorScheme();
  const styles = styling(colorScheme);

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

const styling = (colorScheme: string) => StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterButton: {
    backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeFilter: {
    backgroundColor: '#10b981', // Emerald green
  },
  filterText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    color: colorScheme === 'dark' ? '#d1d5db' : '#374151',
  },
  activeFilterText: {
    color: '#ffffff',
  },
});
