// components/WelcomeCard.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from './theme/theme';

export default function WelcomeCard({ userName, remainingSubmissions }) {
  return (
    <View style={styles.welcomeCard}>
      <View style={styles.welcomeContent}>
        <View>
          <Text style={styles.welcomeText}>
            Welcome, {userName || 'User'}!
          </Text>
          <Text style={styles.submissionCount}>
            {remainingSubmissions != null
              ? `Reports remaining today: ${remainingSubmissions}`
              : 'Loading...'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => {/* Profile action */}}
        >
          <FontAwesome name="user-circle" size={32} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  submissionCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  profileButton: {
    padding: 8,
  },
});