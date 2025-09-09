import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

export default function HeroSection({ onFindTutorPress }) {
  return (
    <View style={styles.container}>
      <Image 
        source={{ uri: 'https://d64gsuwffb70l.cloudfront.net/68be449406608c444de4bfdf_1757299918086_8f934ede.webp' }}
        style={styles.heroImage}
      />
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Find Your Perfect Tutor</Text>
          <Text style={styles.subtitle}>
            Connect with fellow students for personalized learning sessions
          </Text>
          <TouchableOpacity style={styles.ctaButton} onPress={onFindTutorPress}>
            <Text style={styles.ctaText}>Browse Tutors</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(37, 99, 235, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e5e7eb',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  ctaButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});