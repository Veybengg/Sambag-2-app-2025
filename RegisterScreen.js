import React, { useState, useCallback, memo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ScrollView, Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, storage } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';

const { width, height } = Dimensions.get('window');

// Data Privacy Modal Component
const DataPrivacyModal = memo(({ visible, onAccept, onDecline }) => {
  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.privacyModalContainer}>
        <ScrollView 
          style={styles.privacyScrollView}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.privacyHeader}>
            <Ionicons name="shield-checkmark" size={48} color="#6366F1" />
            <Text style={styles.privacyTitle}>Data Privacy Notice</Text>
          </View>

          <View style={styles.privacyContent}>
            <Text style={styles.privacySection}>
              <Text style={styles.privacySectionTitle}>Welcome to Sambag 2 Emergency Reporting System</Text>
              {'\n\n'}
              Before you proceed with registration, please read and understand how we collect, use, and protect your personal information.
            </Text>

            <Text style={styles.privacySection}>
              <Text style={styles.privacySectionTitle}>Information We Collect:</Text>
              {'\n\n'}
              • <Text style={styles.privacyBold}>Personal Information:</Text> Your first name, last name, and contact number
              {'\n'}
              • <Text style={styles.privacyBold}>Identification:</Text> A photo of your valid ID for verification purposes
              {'\n'}
              • <Text style={styles.privacyBold}>Location Data:</Text> Your real-time location when you submit an emergency report
              {'\n'}
              • <Text style={styles.privacyBold}>Photos (Optional):</Text> Images you choose to attach to your emergency reports
              {'\n'}
              • <Text style={styles.privacyBold}>Report Details:</Text> Information about the emergency incidents you report
            </Text>

            <Text style={styles.privacySection}>
              <Text style={styles.privacySectionTitle}>How We Use Your Information:</Text>
              {'\n\n'}
              • Verify your identity as a resident of Barangay Sambag 2
              {'\n'}
              • Process and respond to your emergency reports
              {'\n'}
              • Contact you regarding your submitted reports
              {'\n'}
              • Locate the emergency incident using your location data
              {'\n'}
              • Maintain records for safety and accountability purposes
              {'\n'}
              • Improve our emergency response services
            </Text>

            <Text style={styles.privacySection}>
              <Text style={styles.privacySectionTitle}>Data Protection:</Text>
              {'\n\n'}
              • Your personal information is stored securely in encrypted databases
              {'\n'}
              • Access to your data is limited to authorized barangay officials only
              {'\n'}
              • Your ID photo is used solely for verification and is not shared with third parties
              {'\n'}
              • Location data is only collected when you submit a report
              {'\n'}
              • We implement industry-standard security measures to protect your information
            </Text>

            <Text style={styles.privacySection}>
              <Text style={styles.privacySectionTitle}>Your Rights:</Text>
              {'\n\n'}
              • You have the right to access your personal information
              {'\n'}
              • You can request correction of inaccurate data
              {'\n'}
              • You may withdraw consent at any time (though this may limit app functionality)
              {'\n'}
              • You can request deletion of your account and associated data
            </Text>

            <Text style={styles.privacySection}>
              <Text style={styles.privacySectionTitle}>Data Retention:</Text>
              {'\n\n'}
              Your personal information and report history will be retained as long as your account is active and for a reasonable period thereafter as required by barangay records management policies.
            </Text>

            <Text style={styles.privacySection}>
              <Text style={styles.privacySectionTitle}>Contact Us:</Text>
              {'\n\n'}
              If you have questions or concerns about how we handle your data, please contact the Barangay Sambag 2 office.
            </Text>

            <Text style={styles.privacyFooter}>
              By clicking "I Accept", you acknowledge that you have read and understood this Data Privacy Notice and consent to the collection, use, and processing of your personal information as described above.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.privacyButtonContainer}>
          <TouchableOpacity
            style={styles.privacyDeclineButton}
            onPress={onDecline}
          >
            <Text style={styles.privacyDeclineText}>Decline</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.privacyAcceptButton}
            onPress={onAccept}
          >
            <Text style={styles.privacyAcceptText}>I Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// Verification Modal Component
const VerificationModal = memo(({ 
  visible, 
  onClose, 
  onVerify, 
  loading 
}) => {
  const [localOfficialName, setLocalOfficialName] = useState('');

  const handleVerify = () => {
    onVerify(localOfficialName);
  };

  const handleClose = () => {
    setLocalOfficialName('');
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View style={styles.modalIconContainer}>
            <Ionicons name="shield-checkmark" size={32} color="#6366F1" />
          </View>
          <Text style={styles.modalTitle}>Barangay Verification</Text>
          <Text style={styles.modalSubtitle}>
            To complete your registration, please name one current barangay or SK official serving in Barangay Sambag 2. You can use their full name, first name, last name, or nickname.
          </Text>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Official's Name or Nickname
            <Text style={styles.required}> *</Text>
          </Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter any official's name or nickname"
              value={localOfficialName}
              onChangeText={setLocalOfficialName}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              blurOnSubmit={false}
              returnKeyType="done"
              onSubmitEditing={handleVerify}
              autoFocus={true}
            />
          </View>
        </View>

        <View style={styles.modalButtonContainer}>
          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={handleClose}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.modalVerifyButton, loading && styles.submitButtonDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            <Text style={styles.modalVerifyText}>
              {loading ? 'Verifying...' : 'Verify'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

export default function RegisterScreen({ onRegistered }) {
  const [mode, setMode] = useState('register');
  const [showDataPrivacy, setShowDataPrivacy] = useState(false);
  const [dataPrivacyAccepted, setDataPrivacyAccepted] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contact, setContact] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [idImage, setIdImage] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [showVerification, setShowVerification] = useState(false);
  const [verificationPassed, setVerificationPassed] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);

  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Check if user has accepted data privacy on component mount
  useEffect(() => {
    const checkDataPrivacyAcceptance = async () => {
      try {
        const accepted = await AsyncStorage.getItem('data_privacy_accepted');
        if (accepted === 'true') {
          setDataPrivacyAccepted(true);
        }
      } catch (error) {
        console.error('Error checking data privacy acceptance:', error);
      }
    };
    
    checkDataPrivacyAcceptance();
  }, []);

  // Show data privacy modal when in register mode and not accepted
  useEffect(() => {
    console.log('Mode:', mode, 'Privacy accepted:', dataPrivacyAccepted, 'Show modal:', showDataPrivacy);
    if (mode === 'register' && !dataPrivacyAccepted) {
      setShowDataPrivacy(true);
    } else {
      setShowDataPrivacy(false);
    }
  }, [mode, dataPrivacyAccepted]);

  const handleAcceptPrivacy = async () => {
    try {
      await AsyncStorage.setItem('data_privacy_accepted', 'true');
      setDataPrivacyAccepted(true);
      setShowDataPrivacy(false);
    } catch (error) {
      console.error('Error saving privacy acceptance:', error);
      Alert.alert('Error', 'Failed to save privacy acceptance. Please try again.');
    }
  };

  const handleDeclinePrivacy = () => {
    setShowDataPrivacy(false);
    setMode('login'); // Switch to login mode if user declines
    Alert.alert(
      'Privacy Policy Required',
      'You must accept the Data Privacy Notice to register. Switch back to the Register tab if you change your mind.'
    );
  };

  const pickImage = async (fromCamera = false) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission required', 'Please grant permission to access camera or gallery.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: false, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ base64: false, quality: 0.7 });

    if (!result.canceled) {
      setIdImage(result.assets[0].uri);
    }
  };

  const checkUsernameAvailability = useCallback(async (usernameToCheck) => {
    if (!usernameToCheck.trim()) {
      setUsernameError('');
      return true;
    }

    setCheckingUsername(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', usernameToCheck.trim()));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setUsernameError('This username is already taken');
        return false;
      } else {
        setUsernameError('');
        return true;
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameError('Error checking username availability');
      return false;
    } finally {
      setCheckingUsername(false);
    }
  }, []);

  useEffect(() => {
    if (username && mode === 'register') {
      const timeoutId = setTimeout(() => {
        checkUsernameAvailability(username);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setUsernameError('');
      setCheckingUsername(false);
    }
  }, [username, mode, checkUsernameAvailability]);

  useEffect(() => {
    if (mode === 'register' && confirmPassword && password !== confirmPassword) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError('');
    }
  }, [password, confirmPassword, mode]);

  const hashPassword = async (plainPassword) => {
    try {
      const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        plainPassword,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      return digest;
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  };

  const uploadImageToStorage = async (imageUri) => {
    if (!imageUri) return null;
    
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const filename = `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const storageRef = ref(storage, `user_ids/${filename}`);
      
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  };

  const verifyBarangayOfficial = useCallback(async (officialName) => {
    if (!officialName.trim()) {
      Alert.alert('Missing Name', 'Please enter a barangay official name or nickname.');
      return;
    }

    setVerificationLoading(true);
    try {
      // Get user profiles from ManageUsers (userProfiles collection)
      const userProfilesRef = collection(db, 'userProfiles');
      const userProfilesSnapshot = await getDocs(userProfilesRef);
      
      // Get barangay officials
      const barangayOfficialsRef = collection(db, 'barangay_officials');
      const barangaySnapshot = await getDocs(barangayOfficialsRef);
      
      // Get SK officials
      const skOfficialsRef = collection(db, 'sk_officials');
      const skSnapshot = await getDocs(skOfficialsRef);
      
      let isValidOfficial = false;
      const inputWords = officialName.toLowerCase().trim().split(/\s+/);
      
      // Helper function to check if input matches official data
      const checkOfficialMatch = (official) => {
        if (!official.name && !official.firstName && !official.lastName) return false;
        
        // For barangay_officials and sk_officials (with 'name' field)
        if (official.name) {
          const officialWords = official.name.toLowerCase().split(/\s+/);
          const nameMatch = inputWords.some(inputWord => 
            officialWords.some(officialWord => 
              inputWord === officialWord && inputWord.length >= 2
            )
          );
          
          if (nameMatch) return true;
        }
        
        // For userProfiles (with 'firstName' and 'lastName' fields)
        if (official.firstName || official.lastName) {
          const firstName = (official.firstName || '').toLowerCase();
          const lastName = (official.lastName || '').toLowerCase();
          const fullName = `${firstName} ${lastName}`.trim();
          const nameWords = fullName.split(/\s+/);
          
          const nameMatch = inputWords.some(inputWord => 
            nameWords.some(nameWord => 
              inputWord === nameWord && inputWord.length >= 2
            )
          );
          
          if (nameMatch) return true;
          
          // Check if input matches first name or last name exactly
          const exactMatch = inputWords.some(inputWord => 
            inputWord === firstName || inputWord === lastName
          );
          
          if (exactMatch) return true;
        }
        
        // Check against nicknames if they exist
        if (official.nicknames && Array.isArray(official.nicknames)) {
          const nicknameMatch = official.nicknames.some(nickname => {
            const nicknameWords = nickname.toLowerCase().split(/\s+/);
            return inputWords.some(inputWord =>
              nicknameWords.some(nicknameWord =>
                inputWord === nicknameWord && inputWord.length >= 2
              )
            );
          });
          
          if (nicknameMatch) return true;
          
          const exactNicknameMatch = official.nicknames.some(nickname =>
            nickname.toLowerCase() === officialName.toLowerCase().trim()
          );
          
          if (exactNicknameMatch) return true;
        }
        
        return false;
      };
      
      // Check user profiles from ManageUsers
      userProfilesSnapshot.forEach((doc) => {
        const profile = doc.data();
        if (checkOfficialMatch(profile)) {
          isValidOfficial = true;
        }
      });
      
      // Check barangay officials if not found in user profiles
      if (!isValidOfficial) {
        barangaySnapshot.forEach((doc) => {
          const official = doc.data();
          if (checkOfficialMatch(official)) {
            isValidOfficial = true;
          }
        });
      }
      
      // Check SK officials if still not found
      if (!isValidOfficial) {
        skSnapshot.forEach((doc) => {
          const official = doc.data();
          if (checkOfficialMatch(official)) {
            isValidOfficial = true;
          }
        });
      }

      if (isValidOfficial) {
        setVerificationPassed(true);
        setShowVerification(false);
        Alert.alert('Verification Passed!', 'You can now proceed with registration.');
      } else {
        Alert.alert(
          'Verification Failed', 
          'The name or nickname you entered does not match any current barangay or SK official. Please try again with a different name or nickname.'
        );
      }
    } catch (err) {
      console.error('Verification error:', err);
      Alert.alert('Error', 'Failed to verify official. Please try again.');
    }
    setVerificationLoading(false);
  }, []);

  const startRegistration = () => {
    if (!dataPrivacyAccepted) {
      Alert.alert('Privacy Policy Required', 'Please accept the Data Privacy Notice to continue.');
      setShowDataPrivacy(true);
      return;
    }

    if (!firstName || !lastName || !contact || !username || !password || !confirmPassword || !idImage) {
      Alert.alert('Missing Info', 'Please fill out all fields and upload your ID.');
      return;
    }

    if (contact.length !== 11) {
      Alert.alert('Invalid Contact Number', 'Contact number must be exactly 11 digits.');
      return;
    }

    if (usernameError) {
      Alert.alert('Username Error', usernameError);
      return;
    }

    if (passwordError) {
      Alert.alert('Password Error', passwordError);
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }

    if (!verificationPassed) {
      setShowVerification(true);
      return;
    }

    handleRegister();
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const isUsernameAvailable = await checkUsernameAvailability(username);
      if (!isUsernameAvailable) {
        Alert.alert('Username taken', 'Please choose a different username.');
        setLoading(false);
        return;
      }

      let idImageUrl = null;
      if (idImage) {
        try {
          idImageUrl = await uploadImageToStorage(idImage);
        } catch (error) {
          Alert.alert('Upload Error', 'Failed to upload ID image. Please try again.');
          setLoading(false);
          return;
        }
      }

      const hashedPassword = await hashPassword(password);
      const name = `${firstName.trim()} ${lastName.trim()}`;
      const newUser = { 
        name, 
        contact, 
        username: username.trim(), 
        password: hashedPassword,
        idImage: idImageUrl
      };
      await addDoc(collection(db, 'users'), newUser);

      await AsyncStorage.setItem('user_registered', 'true');
      await AsyncStorage.setItem('user_data', JSON.stringify({
        ...newUser,
        password: password
      }));

      Alert.alert('Success', 'Registration complete! Your ID has been securely uploaded.');
      onRegistered?.();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to register. Please try again.');
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Missing Info', 'Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const hashedPassword = await hashPassword(password);
      
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username), where('password', '==', hashedPassword));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const user = userDoc.data();

        await AsyncStorage.setItem('user_registered', 'true');
        await AsyncStorage.setItem('user_data', JSON.stringify({
          ...user,
          password: password
        }));

        Alert.alert('Welcome back!', `Hello ${user.name}`);
        onRegistered?.();
      } else {
        Alert.alert('Invalid login', 'Username or password is incorrect.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to log in. Try again.');
    }
    setLoading(false);
  };

  const getRegisterButtonText = () => {
    if (loading) return 'Please wait...';
    if (!verificationPassed) return 'Verify';
    return 'Create Account';
  };

  return (
    <View style={styles.container}>
      <View style={styles.gradientBackground} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <View style={styles.logoContainer}>
            <Image
              source={require("./assets/sambaglogo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>Sambag 2</Text>
          <Text style={styles.appSubtitle}>Emergency Reporting System</Text>
        </View>

        <View style={styles.modeToggleContainer}>
          <TouchableOpacity 
            style={[styles.modeToggle, mode === 'register' && styles.activeModeToggle]}
            onPress={() => setMode('register')}
          >
            <Text style={[styles.modeToggleText, mode === 'register' && styles.activeModeToggleText]}>
              Register
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modeToggle, mode === 'login' && styles.activeModeToggle]}
            onPress={() => setMode('login')}
          >
            <Text style={[styles.modeToggleText, mode === 'login' && styles.activeModeToggleText]}>
              Login
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {mode === 'register' ? 'Create Your Account' : 'Welcome Back!'}
          </Text>
          <Text style={styles.formSubtitle}>
            {mode === 'register' 
              ? 'Join our emergency response community' 
              : 'Sign in to your account'}
          </Text>

          {mode === 'register' && (
            <>
              <View style={styles.nameRowContainer}>
                <View style={styles.nameInputContainer}>
                  <Text style={styles.label}>
                    First Name
                    <Text style={styles.required}> *</Text>
                  </Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="First name"
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.nameInputContainer}>
                  <Text style={styles.label}>
                    Last Name
                    <Text style={styles.required}> *</Text>
                  </Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Last name"
                      value={lastName}
                      onChangeText={setLastName}
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Contact Number
                  <Text style={styles.required}> *</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your 11-digit contact number"
                    value={contact}
                    onChangeText={(text) => {
                      const numericText = text.replace(/[^0-9]/g, '');
                      if (numericText.length <= 11) {
                        setContact(numericText);
                      }
                    }}
                    keyboardType="phone-pad"
                    placeholderTextColor="#9CA3AF"
                    maxLength={11}
                  />
                </View>
                {contact.length > 0 && contact.length < 11 && (
                  <Text style={styles.validationText}>
                    Contact number must be exactly 11 digits ({contact.length}/11)
                  </Text>
                )}
              </View>
            </>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Username
              <Text style={styles.required}> *</Text>
            </Text>
            <View style={[styles.inputWrapper, usernameError && styles.inputWrapperError]}>
              <Ionicons name="person-circle-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />
              {checkingUsername && (
                <Ionicons name="refresh-outline" size={20} color="#6B7280" style={styles.loadingIcon} />
              )}
              {!checkingUsername && username && !usernameError && mode === 'register' && (
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              )}
            </View>
            {usernameError && mode === 'register' && (
              <Text style={styles.errorText}>{usernameError}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Password
              <Text style={styles.required}> *</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#6B7280" 
                />
              </TouchableOpacity>
            </View>
            {mode === 'register' && password.length > 0 && password.length < 6 && (
              <Text style={styles.validationText}>
                Password must be at least 6 characters long
              </Text>
            )}
          </View>

          {mode === 'register' && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Confirm Password
                  <Text style={styles.required}> *</Text>
                </Text>
                <View style={[styles.inputWrapper, passwordError && styles.inputWrapperError]}>
                  <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    placeholderTextColor="#9CA3AF"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                      size={20} 
                      color="#6B7280" 
                    />
                  </TouchableOpacity>
                </View>
                {passwordError && (
                  <Text style={styles.errorText}>{passwordError}</Text>
                )}
                {!passwordError && confirmPassword && password === confirmPassword && (
                  <Text style={styles.successText}>Passwords match!</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  ID Photo
                  <Text style={styles.required}> *</Text>
                </Text>
                <Text style={styles.labelSubtext}>Upload a clear photo of your ID for verification</Text>
                
                {!idImage ? (
                  <View style={styles.imageUploadContainer}>
                    <TouchableOpacity 
                      style={styles.imageUploadButton} 
                      onPress={() => pickImage(true)}
                    >
                      <Ionicons name="camera-outline" size={24} color="#6366F1" />
                      <Text style={styles.imageUploadText}>Take Photo</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.imageUploadButton} 
                      onPress={() => pickImage(false)}
                    >
                      <Ionicons name="image-outline" size={24} color="#6366F1" />
                      <Text style={styles.imageUploadText}>From Gallery</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: idImage }} style={styles.imagePreview} />
                    <TouchableOpacity 
                      style={styles.changeImageButton}
                      onPress={() => setIdImage(null)}
                    >
                      <Ionicons name="refresh-outline" size={16} color="#FFFFFF" style={{ marginRight: 5 }} />
                      <Text style={styles.changeImageText}>Change Image</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}

          {mode === 'register' && (
            <View style={[styles.verificationStatus, verificationPassed && styles.verificationPassed]}>
              <Ionicons 
                name={verificationPassed ? "checkmark-circle" : "alert-circle-outline"} 
                size={20} 
                color={verificationPassed ? "#10B981" : "#F59E0B"} 
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.verificationStatusText, verificationPassed && styles.verificationPassedText]}>
                Barangay Verification: {verificationPassed ? 'Completed' : 'Required'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={mode === 'register' ? startRegistration : handleLogin}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {mode === 'register' ? getRegisterButtonText() : (loading ? 'Please wait...' : 'Sign In')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Data Privacy Modal */}
      <DataPrivacyModal
        visible={showDataPrivacy}
        onAccept={handleAcceptPrivacy}
        onDecline={handleDeclinePrivacy}
      />

      {/* Verification Modal */}
      <VerificationModal
        visible={showVerification}
        onClose={() => setShowVerification(false)}
        onVerify={verifyBarangayOfficial}
        loading={verificationLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  logo: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  modeToggle: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeModeToggle: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  modeToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeModeToggleText: {
    color: '#FFFFFF',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  nameRowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  nameInputContainer: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  labelSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    minHeight: 56,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  loadingIcon: {
    marginLeft: 8,
  },
  eyeButton: {
    padding: 4,
  },
  successText: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
    fontWeight: '500',
  },
  validationText: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 4,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
  imageUploadContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  imageUploadButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  imageUploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginTop: 8,
  },
  imagePreviewContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    resizeMode: 'cover',
    marginBottom: 16,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#6366F1',
    borderRadius: 12,
  },
  changeImageText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  verificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  verificationPassed: {
    backgroundColor: '#D1FAE5',
    borderLeftColor: '#10B981',
  },
  verificationStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    flex: 1,
  },
  verificationPassedText: {
    color: '#065F46',
  },
  submitButton: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    marginHorizontal: 24,
    width: width - 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  modalVerifyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  modalVerifyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Data Privacy Modal Styles
  privacyModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 20,
    width: width - 40,
    maxHeight: height * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 24,
  },
  privacyScrollView: {
    maxHeight: height * 0.65,
  },
  privacyHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  privacyTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 16,
  },
  privacyContent: {
    padding: 24,
  },
  privacySection: {
    marginBottom: 20,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  privacySectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  privacyBold: {
    fontWeight: '600',
    color: '#374151',
  },
  privacyFooter: {
    marginTop: 8,
    marginBottom: 16,
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  privacyButtonContainer: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  privacyDeclineButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  privacyDeclineText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '700',
  },
  privacyAcceptButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  privacyAcceptText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});