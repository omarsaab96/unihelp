import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet, SafeAreaView } from 'react-native';
import TutorCard from '../../src/components/TutorCard';
import SubjectFilter from '../../src/components/SubjectFilter';
import { tutors } from '../../src/data/tutors';

export default function TutorsScreen() {
  const [selectedSubject, setSelectedSubject] = useState('All');

  const filteredTutors = tutors.filter(tutor => {
    if (selectedSubject === 'All') return true;
    return tutor.subjects.some(subject => 
      subject.toLowerCase().includes(selectedSubject.toLowerCase())
    );
  });

  const handleTutorPress = (tutor) => {
    // Navigate to tutor profile
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Find Tutors</Text>
          <Text style={styles.subtitle}>
            Connect with experienced student tutors
          </Text>
        </View>
        
        <SubjectFilter 
          selectedSubject={selectedSubject}
          onSubjectSelect={setSelectedSubject}
        />
        
        <View style={styles.tutorsContainer}>
          {filteredTutors.map(tutor => (
            <TutorCard
              key={tutor.id}
              tutor={tutor}
              onPress={() => handleTutorPress(tutor)}
            />
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
  tutorsContainer: {
    paddingBottom: 20,
  },
});