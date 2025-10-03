// MainScreen.js - Cross-Platform (Web + Mobile)
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, Alert, Platform } from 'react-native';
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
import AIChatbot from './AIChatbot'; 
import WaveBackground from './WaveBackground';
import { COLORS, BUTTONS } from './mainscreencomp/theme/theme';

const MAX_SUBMISSIONS = 10;

// Cross-platform alert function
const showAlert = (title, message, buttons = null) => {
  if (Platform.OS === 'web') {
    if (buttons) {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed && buttons) {
        const okButton = buttons.find(btn => btn.text === 'OK');
        if (okButton && okButton.onPress) {
          okButton.onPress();
        }
      }
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

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

  const tabs = ['report', 'announcements', 'chatbot', 'profile'];

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

  const uploadImageToStorage = async (localUri, imageFile = null) => {
    try {
      if (!localUri) return null;
      
      let blob;
      
      if (Platform.OS === 'web' && imageFile) {
        // On web, use the File object directly
        blob = imageFile;
      } else {
        // On mobile, fetch the URI
        const response = await fetch(localUri);
        blob = await response.blob();
      }
      
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

      // Pass imageFile for web upload
      const uploadedImageUrl = reportData.pickedImage ? 
        await uploadImageToStorage(reportData.pickedImage, reportData.imageFile) : null;

      const finalReportData = {
        reportId,
        name: userName,
        contact: userContact,
        type: reportData.type,
        location: `Latitude: ${reportData.location.latitude}, Longitude: ${reportData.location.longitude}`,
        imageUrl: uploadedImageUrl || 'No image provided',
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

  const handleDistressReport = async (reportData) => {
    try {
      setLoading(true);
      
      const deviceId = await getDeviceId();
      const currentDay = new Date().toISOString().split('T')[0];
      const submissionsRef = rdbRef(realtimeDb, `led/submissions/${deviceId}/${currentDay}`);
      const submissionsSnapshot = await get(submissionsRef);
      const submissionCount = submissionsSnapshot.exists() ? submissionsSnapshot.val() : 0;
      
      if (submissionCount >= MAX_SUBMISSIONS) {
        showAlert(
          'Submission Limit Reached',
          'You have reached your daily submission limit. Please try again tomorrow.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      const reportId = -Date.now();

      // Pass imageFile for web upload
      const uploadedImageUrl = reportData.pickedImage ? 
        await uploadImageToStorage(reportData.pickedImage, reportData.imageFile) : null;

      const finalReportData = {
        reportId,
        name: userName,
        contact: userContact,
        type: reportData.type,
        location: `Latitude: ${reportData.location.latitude}, Longitude: ${reportData.location.longitude}`,
        imageUrl: uploadedImageUrl || 'No image provided',
        idImage: userIdImage || 'No ID image',
        timestamp: new Date().toLocaleString(),
        deviceId,
        customText: reportData.additionalData.customText,
      };

      await set(rdbRef(realtimeDb, `led/reports/${reportId}`), finalReportData);
      await set(submissionsRef, submissionCount + 1);
      await set(rdbRef(realtimeDb, 'led/state'), 1);

      setSuccessModalVisible(true);
      await refreshRemainingSubmissions();
      
      showAlert(
        'Distress Call Sent',
        'Your distress call has been sent successfully. Help is on the way.',
        [{ text: 'OK', style: 'default' }]
      );

    } catch (error) {
      console.error('Error sending distress call:', error);
      showAlert(
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

  const TabButton = ({ tab, icon, label, isActive, onPress }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
      activeOpacity={0.7}
    >
      <View style={[styles.tabIconContainer, isActive && styles.activeTabIconContainer]}>
        <FontAwesome5 
          name={icon} 
          size={22} 
          color={isActive ? '#FFFFFF' : '#B8D4F1'}
        />
      </View>
      <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
        {label}
      </Text>
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
              onDistressReport={handleDistressReport}
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
      
      case 'chatbot':
        return (
          <View style={styles.tabContent}>
            <AIChatbot />
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
    <WaveBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contentContainer}>
          {renderTabContent()}
        </View>

        <View style={styles.bottomTabNavigation}>
          <TabButton
            tab="report"
            icon="exclamation-triangle"
            label="Report"
            isActive={activeTab === 'report'}
            onPress={setActiveTab}
          />
          <TabButton
            tab="announcements"
            icon="bullhorn"
            label="News"
            isActive={activeTab === 'announcements'}
            onPress={setActiveTab}
          />
          <TabButton
            tab="chatbot"
            icon="robot"
            label="AI Help"
            isActive={activeTab === 'chatbot'}
            onPress={setActiveTab}
          />
          <TabButton
            tab="profile"
            icon="user"
            label="Profile"
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
    </WaveBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  reportTabContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 80,
    marginTop: 50,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  bottomTabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#3A7BC8',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    position: 'relative',
    borderRadius: 16,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  tabIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeTabIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B8D4F1',
    marginTop: 2,
  },
  activeTabLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    top: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
});