import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import HeroSection from '../src/components/HeroSection';
import SubjectFilter from '../src/components/SubjectFilter';
import SessionCard from '../src/components/SessionCard';
import { sessions } from '../src/data/sessions';
import { tutors } from '../src/data/tutors';
import { useRouter } from 'expo-router';

export default function TutoringScreen() {
  const router = useRouter();
  const [selectedSubject, setSelectedSubject] = useState('All');

  const filteredSessions = sessions.filter(session => {
    if (selectedSubject === 'All') return true;
    return session.subject.includes(selectedSubject);
  });

  const getTutorById = (id) => tutors.find(tutor => tutor.id === id);

  const handleFindTutor = () => {
    router.push('/(tabs)/tutors')
  };

  const handleSessionPress = (session) => {
    // Navigate to session details
    console.log('session pressed')
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <HeroSection onFindTutorPress={handleFindTutor} />
        <SubjectFilter
          selectedSubject={selectedSubject}
          onSubjectSelect={setSelectedSubject}
        />
        <View style={styles.sessionsContainer}>
          {filteredSessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              tutor={getTutorById(session.tutorId)}
              onPress={() => handleSessionPress(session)}
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
    borderWidth: 1
  },
  scrollView: {
    flex: 1,
  },
  sessionsContainer: {
    paddingBottom: 20,
  },
});