// components/Header.js
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS } from './theme/theme';

export default function Header() {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.logoSection}>
        <Image
          source={require("../assets/sambaglogo.png")}
          style={styles.logoImage}
        />
        <Text style={styles.appName}>Sambag 2</Text>
        <Text style={styles.appSubtitle}>Emergency Reporting System</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  logoSection: {
    alignItems: 'center',
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.9,
  },
});