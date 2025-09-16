// components/EmergencyGrid.js - FIXED HEIGHT GRID WITH "I DON'T NEED HELP" BUTTON
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width, height } = Dimensions.get('window');

const CLEAN_COLORS = {
  primary: '#4A90E2',
  background: '#F8F9FA',
  white: '#FFFFFF',
  textPrimary: '#1A202C',
  textSecondary: '#4A5568',
  border: '#E2E8F0',
  shadow: 'rgba(0,0,0,0.15)',
  cardBackground: '#FFFFFF',
  cardBorder: '#CBD5E0',
  accent: '#667eea',
  secondary: '#38B2AC',
};

function AlarmButton({ onPress, onSwitchToAnnouncements }) {
  const videoSource = require('../assets/alarm.mp4');

  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
    player.play();
  });

  return (
    <View style={styles.centerContent}>
      <Text style={styles.needhelp}>
        Need Help?
      </Text>
      <Text style={styles.instructionText}>
        Press the button below to send a report.
      </Text>

      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.alarmWrapper}>
        <VideoView player={player} style={styles.alarmVideo} nativeControls={false} />
      </TouchableOpacity>

      {/* NEW: "I don't need help" button */}
      <TouchableOpacity 
        style={styles.noHelpButton} 
        onPress={onSwitchToAnnouncements}
        activeOpacity={0.8}
      >
        <Text style={styles.noHelpText}>I don't need help</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function EmergencyGrid({ buttons, onButtonPress, onSwitchToAnnouncements }) {
  const [showGrid, setShowGrid] = useState(false);

  // Create pairs of buttons for rows
  const buttonPairs = [];
  for (let i = 0; i < buttons.length; i += 2) {
    buttonPairs.push([buttons[i], buttons[i + 1]]);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.initialScreen, { display: showGrid ? 'none' : 'flex' }]}>
        <AlarmButton 
          onPress={() => setShowGrid(true)} 
          onSwitchToAnnouncements={onSwitchToAnnouncements} 
        />
      </View>

      <View style={[styles.emergencySection, { display: showGrid ? 'flex' : 'none' }]}>
        <View style={styles.headerSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowGrid(false)}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="arrow-left" size={20} color={CLEAN_COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>Select Type</Text>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
        >
          {buttonPairs.map((pair, rowIndex) => (
            <View key={rowIndex} style={styles.buttonRow}>
              {pair[0] && (
                <TouchableOpacity
                  style={styles.emergencyCard}
                  activeOpacity={0.8}
                  onPress={() => onButtonPress(pair[0].label || pair[0].title || pair[0].id)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${pair[0].color}60` }]}>
                    {pair[0].icon ? (
                      typeof pair[0].icon === 'string' ? (
                        <FontAwesome5 name={pair[0].icon} size={26} color={pair[0].color} />
                      ) : (
                        pair[0].icon
                      )
                    ) : (
                      <FontAwesome5 name="exclamation-triangle" size={26} color={pair[0].color} />
                    )}
                  </View>
                  <Text style={styles.emergencyLabel}>
                    {pair[0].label || pair[0].title || pair[0].id}
                  </Text>
                  <View style={[styles.cardAccent, { backgroundColor: pair[0].color }]} />
                </TouchableOpacity>
              )}
              
              {pair[1] && (
                <TouchableOpacity
                  style={styles.emergencyCard}
                  activeOpacity={0.8}
                  onPress={() => onButtonPress(pair[1].label || pair[1].title || pair[1].id)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${pair[1].color}60` }]}>
                    {pair[1].icon ? (
                      typeof pair[1].icon === 'string' ? (
                        <FontAwesome5 name={pair[1].icon} size={26} color={pair[1].color} />
                      ) : (
                        pair[1].icon
                      )
                    ) : (
                      <FontAwesome5 name="exclamation-triangle" size={26} color={pair[1].color} />
                    )}
                  </View>
                  <Text style={styles.emergencyLabel}>
                    {pair[1].label || pair[1].title || pair[1].id}
                  </Text>
                  <View style={[styles.cardAccent, { backgroundColor: pair[1].color }]} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // NEW: Set a specific height for the entire component
  container: {
    height: height * 0.82, // Takes 70% of screen height
    width: '100%',
  },
  
  initialScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  centerContent: {
    alignItems: 'center',
    width: '100%',
  },
  instructionText: {
    fontSize: 18,
    fontWeight: '600',
    color: CLEAN_COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
  },
  alarmWrapper: {
    borderRadius: 200,
    overflow: 'hidden',
    marginBottom: 30, // Add spacing between alarm button and "I don't need help" button
  },
  alarmVideo: {
    width: 280,
    height: 280,
    borderRadius: 200,
  },

  // NEW: Styles for "I don't need help" button
  noHelpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLEAN_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: CLEAN_COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  noHelpIcon: {
    marginRight: 8,
  },
  noHelpText: {
    color: CLEAN_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },

  emergencySection: {
    flex: 1,
    paddingTop: 10,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20, // Reduced margin
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CLEAN_COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: CLEAN_COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: CLEAN_COLORS.textPrimary,
    flex: 1,
  },
  
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // NEW: Add content container style for better scrolling
  scrollContent: {
    paddingBottom: 20, // Extra padding at bottom
  },
  
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  
  emergencyCard: {
    width: '48%',
    backgroundColor: CLEAN_COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: CLEAN_COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: CLEAN_COLORS.cardBorder,
    overflow: 'hidden',
  },
  
  iconContainer: {
    width: 65,
    height: 65,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: CLEAN_COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 20,
  },
  cardAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  needhelp: {
    fontSize: 30,
    fontWeight: 800,
    color: CLEAN_COLORS.primary,
    marginBottom: 5,
  }
});