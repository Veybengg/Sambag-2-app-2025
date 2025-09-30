// MainScreen.js - Fixed EmergencyGrid Centering
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, ImageBackground, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { ref as rdbRef, set, get } from 'firebase/database';
import { realtimeDb, storage as firebaseStorage } from './firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FontAwesome5 } from '@expo/vector-icons';

import Header from './mainscreencomp/Header';
import EmergencyGrid from './mainscreencomp/EmergencyGrid';
import ReportModal from './mainscreencomp/ReportModal';
import SuccessModal from './mainscreencomp/SuccessModal';
import ProfileTab from './components/ProfileTab';
import Announcements from './Announcements';
import { COLORS, BUTTONS } from './mainscreencomp/theme/theme';

const { height } = require('react-native').Dimensions.get('window');
const MAX_SUBMISSIONS = 10;

export default function MainScreen({ onLogout, onGoToAnnouncements }) {
  // User state
  const [userName, setUserName] = useState('');
  const [userContact, setUserContact] = useState('');
  const [userIdImage, setUserIdImage] = useState('');
  
  // Tab state
  const [activeTab, setActiveTab] = useState('report');
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  
  // Report state
  const [selectedType, setSelectedType] = useState('');
  const [loading, setLoading] = useState(false);
  const [remainingSubmissions, setRemainingSubmissions] = useState(null);

  useEffect(() => {
    loadUser();
    refreshRemainingSubmissions();
  }, []);

  const loadUser = async () => {
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (raw) {
        const user = JSON.parse(raw);
        setUserName(user.name || '');
        setUserContact(user.contact || '');
        setUserIdImage(user.imageUrl || user.idImage || '');
      }
    } catch (e) {
      console.warn('Failed to load user data', e);
    }
  };

  const getDeviceId = async () => {
    try {
      const stored = await AsyncStorage.getItem('deviceId');
      if (stored) return stored;
      const newId = uuid.v4();
      await AsyncStorage.setItem('deviceId', newId);
      return newId;
    } catch (e) {
      console.warn('device id error', e);
      return 'unknown';
    }
  };

  const refreshRemainingSubmissions = async () => {
    try {
      const deviceId = await getDeviceId();
      const currentDay = new Date().toISOString().split('T')[0];
      const submissionsRef = rdbRef(realtimeDb, `led/submissions/${deviceId}/${currentDay}`);
      const snapshot = await get(submissionsRef);
      const count = snapshot.exists() ? snapshot.val() : 0;
      setRemainingSubmissions(MAX_SUBMISSIONS - count);
    } catch (e) {
      console.warn('Error fetching submissions count', e);
    }
  };

  const handleButtonPress = async (type) => {
    setSelectedType(type);
    setModalVisible(true);
    await refreshRemainingSubmissions();
  };

  const uploadImageToStorage = async (localUri) => {
    try {
      if (!localUri) return null;
      const response = await fetch(localUri);
      const blob = await response.blob();
      const filename = `reports/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;
      const storageReference = storageRef(firebaseStorage, filename);
      await uploadBytes(storageReference, blob);
      return await getDownloadURL(storageReference);
    } catch (e) {
      console.warn('Image upload failed', e);
      return null;
    }
  };

  const submitReport = async (reportData) => {
    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      const currentDay = new Date().toISOString().split('T')[0];
      const submissionsRef = rdbRef(realtimeDb, `led/submissions/${deviceId}/${currentDay}`);
      const submissionsSnapshot = await get(submissionsRef);
      const submissionCount = submissionsSnapshot.exists() ? submissionsSnapshot.val() : 0;
      
      if (submissionCount >= MAX_SUBMISSIONS) {
        throw new Error('You have reached daily submission limit.');
      }

      const reportId = -Date.now();

// Upload image if provided
const uploadedImageUrl = reportData.pickedImage ? 
  await uploadImageToStorage(reportData.pickedImage) : null;

const finalReportData = {
  reportId,
  name: userName,
  contact: userContact,
  type: reportData.type, // Will be "Distress call"
  location: `Latitude: ${reportData.location.latitude}, Longitude: ${reportData.location.longitude}`,
  imageUrl: uploadedImageUrl || 'No image provided', // Now handles images!
        idImage: userIdImage || 'No ID image',
        timestamp: new Date().toLocaleString(),
        deviceId,
        ...reportData.additionalData,
      };

      await set(rdbRef(realtimeDb, `led/reports/${reportId}`), finalReportData);
      await set(submissionsRef, submissionCount + 1);
      await set(rdbRef(realtimeDb, 'led/state'), 1);

      setSuccessModalVisible(true);
      setModalVisible(false);
      await refreshRemainingSubmissions();
    } catch (err) {
      throw new Error(err.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Handle distress call - sends report directly without modal
  const handleDistressReport = async (reportData) => {
    try {
      setLoading(true);
      
      // Check submission limit first
      const deviceId = await getDeviceId();
      const currentDay = new Date().toISOString().split('T')[0];
      const submissionsRef = rdbRef(realtimeDb, `led/submissions/${deviceId}/${currentDay}`);
      const submissionsSnapshot = await get(submissionsRef);
      const submissionCount = submissionsSnapshot.exists() ? submissionsSnapshot.val() : 0;
      
      if (submissionCount >= MAX_SUBMISSIONS) {
        Alert.alert(
          'Submission Limit Reached',
          'You have reached your daily submission limit. Please try again tomorrow.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      const reportId = -Date.now();

// Upload image if provided
const uploadedImageUrl = reportData.pickedImage ? 
  await uploadImageToStorage(reportData.pickedImage) : null;

const finalReportData = {
  reportId,
  name: userName,
  contact: userContact,
  type: reportData.type, // Will be "Distress call"
  location: `Latitude: ${reportData.location.latitude}, Longitude: ${reportData.location.longitude}`,
  imageUrl: uploadedImageUrl || 'No image provided', // Now handles images!
        idImage: userIdImage || 'No ID image',
        timestamp: new Date().toLocaleString(),
        deviceId,
        customText: reportData.additionalData.customText, // "Distress call"
      };

      // Submit to Firebase
      await set(rdbRef(realtimeDb, `led/reports/${reportId}`), finalReportData);
      await set(submissionsRef, submissionCount + 1);
      await set(rdbRef(realtimeDb, 'led/state'), 1);

      // Show success and refresh submissions
      setSuccessModalVisible(true);
      await refreshRemainingSubmissions();
      
      Alert.alert(
        'Distress Call Sent',
        'Your distress call has been sent successfully. Help is on the way.',
        [{ text: 'OK', style: 'default' }]
      );

    } catch (error) {
      console.error('Error sending distress call:', error);
      Alert.alert(
        'Distress Call Failed',
        'Failed to send distress call. Please try again or use manual emergency reporting.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await AsyncStorage.multiRemove(['user_registered', 'user_data']);
      
      // Reset all states
      setUserName('');
      setUserContact('');
      setUserIdImage('');
      setModalVisible(false);
      setSelectedType('');
      setRemainingSubmissions(null);
      setActiveTab('report');
      
      setLoading(false);
      if (onLogout) onLogout();
    } catch (error) {
      console.error('Logout error:', error);
      setLoading(false);
    }
  };

  // Tab button
  const TabButton = ({ tab, icon, isActive, onPress }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.activeTabButton]}
      onPress={() => onPress(tab)}
    >
      <FontAwesome5 
        name={icon} 
        size={24} 
        color={isActive ? '#FFFFFF' : '#D0E3FF'}
      />
      {isActive && <View style={styles.activeIndicator} />}
    </TouchableOpacity>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'report':
        return (
          <View style={styles.reportTabContent}>
            <EmergencyGrid 
              buttons={BUTTONS}
              onButtonPress={handleButtonPress}
              onSwitchToAnnouncements={() => setActiveTab('announcements')}
              onDistressReport={handleDistressReport} // NEW: Add distress call handler
            />
          </View>
        );
      
      case 'announcements':
        return (
          <View style={styles.tabContent}>
            <Announcements 
              onBack={() => setActiveTab('report')}
            />
          </View>
        );
      
      case 'profile':
        return (
          <ProfileTab
            userName={userName}
            userContact={userContact}
            userIdImage={userIdImage}
            onLogout={handleLogout}
            loading={loading}
            remainingSubmissions={remainingSubmissions}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <ImageBackground 
      source={require('./assets/background4.png')} 
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
      
        
        <View style={styles.contentContainer}>
          {renderTabContent()}
        </View>

        {/* Bottom Tab Navigation - Always visible */}
        <View style={styles.bottomTabNavigation}>
          <TabButton
            tab="report"
            icon="exclamation-triangle"
            isActive={activeTab === 'report'}
            onPress={setActiveTab}
          />
          <TabButton
            tab="announcements"
            icon="bullhorn"
            isActive={activeTab === 'announcements'}
            onPress={setActiveTab}
          />
          <TabButton
            tab="profile"
            icon="user"
            isActive={activeTab === 'profile'}
            onPress={setActiveTab}
          />
        </View>
      </SafeAreaView>

      <ReportModal
        visible={modalVisible}
        selectedType={selectedType}
        onClose={() => setModalVisible(false)}
        onSubmit={submitReport}
        loading={loading}
      />

      <SuccessModal
        visible={successModalVisible}
        onClose={() => setSuccessModalVisible(false)}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  backgroundImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height,
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  // NEW: Specific style for report tab to center the EmergencyGrid
  reportTabContent: {
    flex: 1,
    justifyContent: 'center', // Centers vertically
    alignItems: 'center',     // Centers horizontally
    paddingHorizontal: 20,
    paddingTop: 10,           // Reduce top padding
    paddingBottom: 80,        // Add more bottom padding to push content up
    marginTop: 50,           // Pull content up with negative margin
  },
  // Keep the original for other tabs
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  comingSoonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#7B8794',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
  },
  bottomTabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  activeTabButton: {},
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
});