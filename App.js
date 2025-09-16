import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RegisterScreen from './RegisterScreen';
import MainScreen from './MainScreen';
import Announcements from './Announcements';
import SplashScreen from './SplashScreen'; // ✅ added

export default function App() {
  const [isRegistered, setIsRegistered] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('main'); // 'main' or 'announcements'
  const [showSplash, setShowSplash] = useState(true); // ✅ new splash state

  useEffect(() => {
    const checkRegistration = async () => {
      const registered = await AsyncStorage.getItem('user_registered');
      setIsRegistered(registered === 'true');
    };
    checkRegistration();
  }, []);

  const handleRegistrationComplete = () => setIsRegistered(true);
  const handleLogout = () => setIsRegistered(false);

  // ⏳ While checking AsyncStorage
  if (isRegistered === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 🎬 Show splashscreen first
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // 📝 If not registered, show Register
  if (!isRegistered) {
    return <RegisterScreen onRegistered={handleRegistrationComplete} />;
  }

  // 📢 Announcements screen
  if (currentScreen === 'announcements') {
    return <Announcements onBack={() => setCurrentScreen('main')} />;
  }

  // 🏠 Main screen
  return (
    <MainScreen
      onLogout={handleLogout}
      onGoToAnnouncements={() => setCurrentScreen('announcements')}
    />
  );
}
