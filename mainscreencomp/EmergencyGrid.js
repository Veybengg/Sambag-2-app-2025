// components/EmergencyGrid.js - FIXED HEIGHT GRID WITH "I DON'T NEED HELP" AND "DISTRESS CALL" BUTTONS
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Alert, AppState } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Location from 'expo-location';

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
  emergency: '#DC2626', // Red color for emergency button
};

function AlarmButton({ onPress, onSwitchToAnnouncements, onDistressCall }) {
  const videoSource = require('../assets/alarm.mp4');

  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
    player.play();
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // When app comes back to foreground, ensure video is playing
      if (nextAppState === 'active') {
        if (player && !player.playing) {
          player.play();
        }
      }
    });

    // Ensure video starts playing when component mounts
    if (player) {
      player.play();
    }

    return () => {
      subscription.remove();
    };
  }, [player]);

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

      {/* Button container for both buttons */}
      <View style={styles.buttonContainer}>
        {/* Distress Call Button */}
        <TouchableOpacity 
          style={styles.distressButton} 
          onPress={onDistressCall}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="phone" size={16} color={CLEAN_COLORS.white} style={styles.buttonIcon} />
          <Text style={styles.distressText}>Distress Call</Text>
        </TouchableOpacity>

        {/* "I don't need help" button */}
        <TouchableOpacity 
          style={styles.noHelpButton} 
          onPress={onSwitchToAnnouncements}
          activeOpacity={0.8}
        >
          <Text style={styles.noHelpText}>I don't need help</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function EmergencyGrid({ buttons, onButtonPress, onSwitchToAnnouncements, onDistressReport }) {
  const [showGrid, setShowGrid] = useState(false);

 // Handle distress call - with option to add image
  const handleDistressCall = async () => {
    try {
      // Request location permission first
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          "Location Permission Required",
          "Location access is needed to send your distress call with your current position.",
          [{ text: "OK", style: "default" }]
        );
        return;
      }

      // Get location early
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
        maximumAge: 10000,
      });

      const locationObj = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Show options: Add Photo or Send Now
      Alert.alert(
        "Send Distress Call",
        "Choose how to send your emergency distress call:",
        [
          { 
            text: "Cancel", 
            style: "cancel" 
          },
          {
            text: "Add Photo",
            onPress: () => showImageOptions(locationObj),
          },
          { 
            text: "Send Now", 
            style: "destructive",
            onPress: () => sendDistressReport(locationObj, null),
          }
        ]
      );

    } catch (error) {
      console.error('Error in distress call:', error);
      Alert.alert(
        "Distress Call Error",
        "Unable to prepare distress call. Please try again or use manual emergency reporting.",
        [{ text: "OK", style: "default" }]
      );
    }
  };

  // Show camera/gallery options
  const showImageOptions = (locationObj) => {
    Alert.alert(
      "Add Photo to Distress Call",
      "Choose photo source:",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            // Offer to send without photo
            Alert.alert(
              "Send Without Photo?",
              "Do you want to send the distress call without a photo?",
              [
                { text: "No", style: "cancel" },
                { 
                  text: "Send Now", 
                  onPress: () => sendDistressReport(locationObj, null) 
                }
              ]
            );
          }
        },
        {
          text: "Take Photo",
          onPress: async () => {
            const imageUri = await pickImage(true);
            if (imageUri) {
              sendDistressReport(locationObj, imageUri);
            } else {
              // Photo capture cancelled, ask if they want to send anyway
              Alert.alert(
                "Send Without Photo?",
                "Photo capture was cancelled. Send distress call without photo?",
                [
                  { text: "No", style: "cancel" },
                  { 
                    text: "Send Now", 
                    onPress: () => sendDistressReport(locationObj, null) 
                  }
                ]
              );
            }
          }
        },
        {
          text: "Choose from Gallery",
          onPress: async () => {
            const imageUri = await pickImage(false);
            if (imageUri) {
              sendDistressReport(locationObj, imageUri);
            } else {
              // Gallery selection cancelled, ask if they want to send anyway
              Alert.alert(
                "Send Without Photo?",
                "Photo selection was cancelled. Send distress call without photo?",
                [
                  { text: "No", style: "cancel" },
                  { 
                    text: "Send Now", 
                    onPress: () => sendDistressReport(locationObj, null) 
                  }
                ]
              );
            }
          }
        }
      ]
    );
  };

  // Pick image from camera or gallery
  const pickImage = async (fromCamera) => {
    try {
      const ImagePicker = require('expo-image-picker');
      
      let permission;
      if (fromCamera) {
        permission = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          `Camera/gallery access is needed to add a photo to your distress call.`,
          [{ text: "OK", style: "default" }]
        );
        return null;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false });

      if (!result.canceled && result.assets && result.assets[0]) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        "Image Error",
        "Failed to capture/select image. You can still send the distress call without a photo.",
        [{ text: "OK", style: "default" }]
      );
      return null;
    }
  };

  // Actually send the distress report
  const sendDistressReport = async (locationObj, imageUri) => {
    try {
      const distressData = {
        type: 'Distress call',
        location: locationObj,
        pickedImage: imageUri,
        additionalData: {
          customText: 'Distress call'
        },
      };

      if (onDistressReport) {
        await onDistressReport(distressData);
      } else {
        console.warn('onDistressReport handler not provided');
        Alert.alert(
          "Configuration Error",
          "Distress call handler not configured. Please contact support.",
          [{ text: "OK", style: "default" }]
        );
      }

    } catch (error) {
      console.error('Error sending distress report:', error);
      Alert.alert(
        "Distress Call Failed",
        "Failed to send distress call. Please try again or use manual emergency reporting.",
        [{ text: "OK", style: "default" }]
      );
    }
  };
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
          onDistressCall={handleDistressCall}
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
  // Set a specific height for the entire component
  container: {
    height: height * 0.82, // Takes 82% of screen height
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
    marginBottom: 30, // Add spacing between alarm button and action buttons
  },
  alarmVideo: {
    width: 280,
    height: 280,
    borderRadius: 200,
  },

  // NEW: Container for both buttons
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15, // Space between buttons
    flexWrap: 'wrap', // Allow wrapping on smaller screens
  },

  // NEW: Distress Call button styles
  distressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLEAN_COLORS.emergency,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: CLEAN_COLORS.emergency,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 140, // Ensure consistent button sizing
  },
  buttonIcon: {
    marginRight: 8,
  },
  distressText: {
    color: CLEAN_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // Updated: "I don't need help" button styles
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
    minWidth: 140, // Ensure consistent button sizing
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
  
  // Add content container style for better scrolling
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