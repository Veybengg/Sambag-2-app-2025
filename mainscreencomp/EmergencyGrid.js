// components/EmergencyGrid.js - Cross-Platform with Custom Web Modal
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Alert, AppState, Platform, Modal } from 'react-native';
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
  emergency: '#DC2626',
};

// Custom Modal for Web Distress Options
function DistressOptionsModal({ visible, onClose, onTakePhoto, onUploadPhoto, onSendNow }) {
  if (!visible) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <FontAwesome5 name="exclamation-circle" size={28} color={CLEAN_COLORS.emergency} />
            <Text style={styles.modalTitle}>Send Distress Call</Text>
          </View>
          
          <Text style={styles.modalSubtitle}>
            Choose how to send your emergency distress call:
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={onTakePhoto}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="camera" size={20} color={CLEAN_COLORS.primary} />
              <Text style={styles.modalButtonText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalButton}
              onPress={onUploadPhoto}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="image" size={20} color={CLEAN_COLORS.primary} />
              <Text style={styles.modalButtonText}>Upload Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonEmergency]}
              onPress={onSendNow}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="paper-plane" size={20} color={CLEAN_COLORS.white} />
              <Text style={[styles.modalButtonText, styles.modalButtonTextWhite]}>
                Send Without Photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Cross-platform alert function (for mobile only now)
const showAlert = (title, message, buttons = null) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message, buttons);
  }
};

function AlarmButton({ onPress, onSwitchToAnnouncements, onDistressCall }) {
  const videoSource = require('../assets/alarm.mp4');

  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
    player.play();
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        if (player && !player.playing) {
          player.play();
        }
      }
    });

    if (player) {
      player.play();
    }

    return () => {
      subscription.remove();
    };
  }, [player]);

  return (
    <View style={styles.centerContent}>
      <Text style={styles.needhelp}>Need Help?</Text>
      <Text style={styles.instructionText}>
        Press the button below to send a report.
      </Text>

      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.alarmWrapper}>
        <VideoView player={player} style={styles.alarmVideo} nativeControls={false} />
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.distressButton} 
          onPress={onDistressCall}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="phone" size={16} color={CLEAN_COLORS.white} style={styles.buttonIcon} />
          <Text style={styles.distressText}>Distress Call</Text>
        </TouchableOpacity>

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
  const [showDistressModal, setShowDistressModal] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const pendingLocationRef = useRef(null);

  // Handle file selection for web
  const handleWebFileSelect = (event, isCamera) => {
    const file = event.target.files[0];
    if (file && pendingLocationRef.current) {
      const imageUrl = URL.createObjectURL(file);
      sendDistressReport(pendingLocationRef.current, imageUrl, file);
      pendingLocationRef.current = null;
    }
  };

  const handleDistressCall = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web: Use browser geolocation
        if (!navigator.geolocation) {
          showAlert('Not Supported', 'Geolocation is not supported. Please use manual emergency reporting.');
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const locationObj = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            
            // Show modal with location
            pendingLocationRef.current = locationObj;
            setShowDistressModal(true);
          },
          (error) => {
            console.warn('Browser location error:', error);
            let errorMessage = 'Could not get your location. ';
            
            if (error.code === 1) {
              errorMessage += 'Location permission was denied. Please enable location in your browser settings or use manual emergency reporting.';
            } else {
              errorMessage += 'Please try again or use manual emergency reporting.';
            }
            
            showAlert('Location Error', errorMessage);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000
          }
        );
      } else {
        // Mobile app: Use expo-location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          showAlert(
            "Location Permission Required",
            "Location access is needed to send your distress call with your current position."
          );
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 15000,
          maximumAge: 10000,
        });

        const locationObj = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        // Show modal with location
        pendingLocationRef.current = locationObj;
        setShowDistressModal(true);
      }

    } catch (error) {
      console.error('Error in distress call:', error);
      showAlert(
        "Distress Call Error",
        "Unable to prepare distress call. Please try again or use manual emergency reporting."
      );
    }
  };

  // Modal handlers (for both web and mobile)
  const handleModalTakePhoto = async () => {
    setShowDistressModal(false);
    
    if (Platform.OS === 'web') {
      // Web: trigger file input
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    } else {
      // Mobile: use expo-image-picker
      const imageUri = await pickImage(true);
      if (imageUri && pendingLocationRef.current) {
        sendDistressReport(pendingLocationRef.current, imageUri);
        pendingLocationRef.current = null;
      } else if (pendingLocationRef.current) {
        // Ask if they want to send without photo
        Alert.alert(
          "Send Without Photo?",
          "Photo capture was cancelled. Send distress call without photo?",
          [
            { text: "No", style: "cancel" },
            { 
              text: "Send Now", 
              onPress: () => {
                sendDistressReport(pendingLocationRef.current, null);
                pendingLocationRef.current = null;
              }
            }
          ]
        );
      }
    }
  };

  const handleModalUploadPhoto = async () => {
    setShowDistressModal(false);
    
    if (Platform.OS === 'web') {
      // Web: trigger file input
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } else {
      // Mobile: use gallery picker
      const imageUri = await pickImage(false);
      if (imageUri && pendingLocationRef.current) {
        sendDistressReport(pendingLocationRef.current, imageUri);
        pendingLocationRef.current = null;
      } else if (pendingLocationRef.current) {
        // Ask if they want to send without photo
        Alert.alert(
          "Send Without Photo?",
          "Photo selection was cancelled. Send distress call without photo?",
          [
            { text: "No", style: "cancel" },
            { 
              text: "Send Now", 
              onPress: () => {
                sendDistressReport(pendingLocationRef.current, null);
                pendingLocationRef.current = null;
              }
            }
          ]
        );
      }
    }
  };

  const handleModalSendNow = () => {
    setShowDistressModal(false);
    if (pendingLocationRef.current) {
      sendDistressReport(pendingLocationRef.current, null);
      pendingLocationRef.current = null;
    }
  };

  const handleModalClose = () => {
    setShowDistressModal(false);
    pendingLocationRef.current = null;
  };

  // Mobile image options - REMOVED, using modal for both platforms now

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
        Alert.alert('Permission Required', 'Camera/gallery access is needed to add a photo to your distress call.');
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
      Alert.alert("Image Error", "Failed to capture/select image. You can still send the distress call without a photo.");
      return null;
    }
  };

  const sendDistressReport = async (locationObj, imageUri, imageFile = null) => {
    try {
      const distressData = {
        type: 'Distress call',
        location: locationObj,
        pickedImage: imageUri,
        imageFile: imageFile,
        additionalData: {
          customText: 'Distress call'
        },
      };

      if (onDistressReport) {
        await onDistressReport(distressData);
      } else {
        console.warn('onDistressReport handler not provided');
        showAlert("Configuration Error", "Distress call handler not configured. Please contact support.");
      }

    } catch (error) {
      console.error('Error sending distress report:', error);
      showAlert("Distress Call Failed", "Failed to send distress call. Please try again or use manual emergency reporting.");
    }
  };

  const buttonPairs = [];
  for (let i = 0; i < buttons.length; i += 2) {
    buttonPairs.push([buttons[i], buttons[i + 1]]);
  }

  return (
    <View style={styles.container}>
      {/* Hidden file inputs for web */}
      {Platform.OS === 'web' && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleWebFileSelect(e, false)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => handleWebFileSelect(e, true)}
          />
        </>
      )}

      {/* Custom Distress Modal for Both Web and Mobile */}
      <DistressOptionsModal
        visible={showDistressModal}
        onClose={handleModalClose}
        onTakePhoto={handleModalTakePhoto}
        onUploadPhoto={handleModalUploadPhoto}
        onSendNow={handleModalSendNow}
      />

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
  container: {
    height: height * 0.82,
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
    marginBottom: 30,
  },
  alarmVideo: {
    width: 280,
    height: 280,
    borderRadius: 200,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    flexWrap: 'wrap',
  },
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
    minWidth: 140,
  },
  buttonIcon: {
    marginRight: 8,
  },
  distressText: {
    color: CLEAN_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
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
    minWidth: 140,
  },
  noHelpText: {
    color: CLEAN_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: CLEAN_COLORS.white,
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: CLEAN_COLORS.textPrimary,
    flex: 1,
  },
  modalSubtitle: {
    fontSize: 16,
    color: CLEAN_COLORS.textSecondary,
    marginBottom: 25,
    lineHeight: 22,
  },
  modalButtons: {
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLEAN_COLORS.background,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: CLEAN_COLORS.primary,
    gap: 12,
  },
  modalButtonEmergency: {
    backgroundColor: CLEAN_COLORS.emergency,
    borderColor: CLEAN_COLORS.emergency,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: CLEAN_COLORS.textPrimary,
    flex: 1,
  },
  modalButtonTextWhite: {
    color: CLEAN_COLORS.white,
  },
  modalCancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: CLEAN_COLORS.textSecondary,
  },
  emergencySection: {
    flex: 1,
    paddingTop: 10,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  scrollContent: {
    paddingBottom: 20,
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
    fontWeight: '800',
    color: CLEAN_COLORS.primary,
    marginBottom: 5,
  }
});