import React, { useState, useCallback, memo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ScrollView, Dimensions, StatusBar, ImageBackground, KeyboardAvoidingView, Platform, Keyboard
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

// Generate unique user ID
const generateUserId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `USER-${timestamp}-${randomStr}`.toUpperCase();
};

// Data Privacy Modal Component
const DataPrivacyModal = memo(({ visible, onAccept, onDecline }) => {
  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.privacyModalContainer}>
        <View style={styles.privacyModalHeader}>
          <View style={styles.shieldCircle}>
            <Ionicons name="shield-checkmark" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.privacyModalTitle}>Data Privacy Notice</Text>
          <Text style={styles.privacyModalSubtitle}>Please read carefully before proceeding</Text>
        </View>

        <ScrollView 
          style={styles.privacyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.privacySection}>
            <View style={styles.privacySectionHeader}>
              <Ionicons name="information-circle" size={22} color="#667eea" />
              <Text style={styles.privacySectionTitle}>What We Collect</Text>
            </View>
            <Text style={styles.privacySectionText}>
              • Personal Information (Name, Contact){'\n'}
              • Valid ID for verification{'\n'}
              • Location data during emergency reports{'\n'}
              • Emergency report details and photos
            </Text>
          </View>

          <View style={styles.privacySection}>
            <View style={styles.privacySectionHeader}>
              <Ionicons name="shield-outline" size={22} color="#667eea" />
              <Text style={styles.privacySectionTitle}>How We Use It</Text>
            </View>
            <Text style={styles.privacySectionText}>
              • Verify you as a Barangay Sambag 2 resident{'\n'}
              • Process and respond to emergencies{'\n'}
              • Contact you regarding your reports{'\n'}
              • Improve emergency response services
            </Text>
          </View>

          <View style={styles.privacySection}>
            <View style={styles.privacySectionHeader}>
              <Ionicons name="lock-closed" size={22} color="#667eea" />
              <Text style={styles.privacySectionTitle}>Data Protection</Text>
            </View>
            <Text style={styles.privacySectionText}>
              • Encrypted database storage{'\n'}
              • Limited to authorized officials only{'\n'}
              • No third-party data sharing
            </Text>
          </View>

          <View style={styles.privacyFooterBox}>
            <Text style={styles.privacyFooterText}>
              By clicking "Accept", you acknowledge that you have read and consent to the collection and processing of your personal data as described above.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.privacyButtonGroup}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={onDecline}
            activeOpacity={0.8}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={onAccept}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

export default function RegisterScreen({ onRegistered }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showDataPrivacy, setShowDataPrivacy] = useState(false);
  const [dataPrivacyAccepted, setDataPrivacyAccepted] = useState(false);
  
  const [registrationStep, setRegistrationStep] = useState(1);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contact, setContact] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [idImage, setIdImage] = useState(null);
  const [officialName, setOfficialName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

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

const handleAcceptPrivacy = async () => {
  try {
    await AsyncStorage.setItem('data_privacy_accepted', 'true');
    setDataPrivacyAccepted(true);
    setShowDataPrivacy(false);
    // NOW switch to register screen AFTER accepting
    setIsLogin(false);
    setRegistrationStep(1);
  } catch (error) {
    console.error('Error saving privacy acceptance:', error);
    Alert.alert('Error', 'Failed to save privacy acceptance. Please try again.');
  }
};

  const handleDeclinePrivacy = () => {
    setShowDataPrivacy(false);
    setIsLogin(true);
    Alert.alert(
      'Privacy Policy Required',
      'You must accept the Data Privacy Notice to register.'
    );
  };

 const switchToRegister = () => {
  // CRITICAL FIX: Check privacy acceptance FIRST
  if (!dataPrivacyAccepted) {
    // Show modal but DON'T switch screens yet
    setShowDataPrivacy(true);
    return; // Exit early - don't change isLogin
  }
  // Only switch to register if privacy already accepted
  setIsLogin(false);
  setRegistrationStep(1);
};

  const switchToLogin = () => {
    setIsLogin(true);
    setRegistrationStep(1);
    setFirstName('');
    setLastName('');
    setContact('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setIdImage(null);
    setOfficialName('');
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
    if (username && !isLogin) {
      const timeoutId = setTimeout(() => {
        checkUsernameAvailability(username);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setUsernameError('');
      setCheckingUsername(false);
    }
  }, [username, isLogin, checkUsernameAvailability]);

  useEffect(() => {
    if (!isLogin && confirmPassword && password !== confirmPassword) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError('');
    }
  }, [password, confirmPassword, isLogin]);

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

  const validateStep = (step) => {
    switch(step) {
      case 1:
        if (!firstName.trim()) {
          Alert.alert('Required Field', 'Please enter your first name');
          return false;
        }
        if (!lastName.trim()) {
          Alert.alert('Required Field', 'Please enter your last name');
          return false;
        }
        if (!contact.trim()) {
          Alert.alert('Required Field', 'Please enter your contact number');
          return false;
        }
        if (contact.length !== 11) {
          Alert.alert('Invalid Contact', 'Contact number must be exactly 11 digits');
          return false;
        }
        return true;
      
      case 2:
        if (!username.trim()) {
          Alert.alert('Required Field', 'Please enter a username');
          return false;
        }
        if (usernameError) {
          Alert.alert('Username Error', usernameError);
          return false;
        }
        if (!password) {
          Alert.alert('Required Field', 'Please enter a password');
          return false;
        }
        if (password.length < 6) {
          Alert.alert('Weak Password', 'Password must be at least 6 characters long');
          return false;
        }
        if (!confirmPassword) {
          Alert.alert('Required Field', 'Please confirm your password');
          return false;
        }
        if (passwordError) {
          Alert.alert('Password Error', passwordError);
          return false;
        }
        return true;
      
      case 3:
        if (!idImage) {
          Alert.alert('Required Field', 'Please upload your ID photo');
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(registrationStep)) {
      setRegistrationStep(registrationStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (registrationStep > 1) {
      setRegistrationStep(registrationStep - 1);
    }
  };

  const verifyBarangayOfficial = async () => {
    if (!officialName.trim()) {
      Alert.alert('Required Field', 'Please enter a barangay official name or nickname');
      return;
    }

    setLoading(true);
    try {
      const userProfilesRef = collection(db, 'userProfiles');
      const userProfilesSnapshot = await getDocs(userProfilesRef);
      
      const barangayOfficialsRef = collection(db, 'barangay_officials');
      const barangaySnapshot = await getDocs(barangayOfficialsRef);
      
      const skOfficialsRef = collection(db, 'sk_officials');
      const skSnapshot = await getDocs(skOfficialsRef);
      
      let isValidOfficial = false;
      const inputWords = officialName.toLowerCase().trim().split(/\s+/);
      
      const checkOfficialMatch = (official) => {
        if (!official.name && !official.firstName && !official.lastName) return false;
        
        if (official.name) {
          const officialWords = official.name.toLowerCase().split(/\s+/);
          const nameMatch = inputWords.some(inputWord => 
            officialWords.some(officialWord => 
              inputWord === officialWord && inputWord.length >= 2
            )
          );
          
          if (nameMatch) return true;
        }
        
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
          
          const exactMatch = inputWords.some(inputWord => 
            inputWord === firstName || inputWord === lastName
          );
          
          if (exactMatch) return true;
        }
        
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
      
      userProfilesSnapshot.forEach((doc) => {
        const profile = doc.data();
        if (checkOfficialMatch(profile)) {
          isValidOfficial = true;
        }
      });
      
      if (!isValidOfficial) {
        barangaySnapshot.forEach((doc) => {
          const official = doc.data();
          if (checkOfficialMatch(official)) {
            isValidOfficial = true;
          }
        });
      }
      
      if (!isValidOfficial) {
        skSnapshot.forEach((doc) => {
          const official = doc.data();
          if (checkOfficialMatch(official)) {
            isValidOfficial = true;
          }
        });
      }

      if (isValidOfficial) {
        await handleFinalRegistration();
      } else {
        Alert.alert(
          'Verification Failed', 
          'The name or nickname you entered does not match any current barangay or SK official. Please try again.'
        );
        setLoading(false);
      }
    } catch (err) {
      console.error('Verification error:', err);
      Alert.alert('Error', 'Failed to verify official. Please try again.');
      setLoading(false);
    }
  };

  const handleFinalRegistration = async () => {
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

      const userId = generateUserId();
      const createdAt = new Date().toISOString();

      const hashedPassword = await hashPassword(password);
      const name = `${firstName.trim()} ${lastName.trim()}`;
      const newUser = { 
        userId,
        name, 
        contact, 
        username: username.trim(), 
        password: hashedPassword,
        idImage: idImageUrl,
        createdAt
      };
      await addDoc(collection(db, 'users'), newUser);

      await AsyncStorage.setItem('user_registered', 'true');
      await AsyncStorage.setItem('user_data', JSON.stringify({
        ...newUser,
        password: password
      }));

      Alert.alert('Success!', `Registration complete!\n\nYour User ID: ${userId}`);
      onRegistered?.();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to register. Please try again.');
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) {
      Alert.alert('Missing Info', 'Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const hashedPassword = await hashPassword(loginPassword);
      
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', loginUsername), where('password', '==', hashedPassword));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const user = userDoc.data();

        await AsyncStorage.setItem('user_registered', 'true');
        await AsyncStorage.setItem('user_data', JSON.stringify({
          ...user,
          password: loginPassword
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

  const renderProgressIndicator = () => {
    const steps = ['Info', 'Account', 'ID', 'Verify'];
    
    return (
      <View style={styles.progressWrapper}>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${(registrationStep / 4) * 100}%` }]} />
        </View>
        <View style={styles.progressSteps}>
          {steps.map((label, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === registrationStep;
            const isCompleted = stepNumber < registrationStep;
            
            return (
              <View key={stepNumber} style={styles.progressStepItem}>
                <View style={[
                  styles.stepCircle,
                  isActive && styles.stepCircleActive,
                  isCompleted && styles.stepCircleCompleted
                ]}>
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : (
                    <Text style={[
                      styles.stepNumber,
                      isActive && styles.stepNumberActive
                    ]}>
                      {stepNumber}
                    </Text>
                  )}
                </View>
                <Text style={[
                  styles.stepLabel,
                  isActive && styles.stepLabelActive
                ]}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderStepContent = () => {
    switch(registrationStep) {
      case 1:
        return (
          <View style={styles.stepWrapper}>
            <View style={styles.stepHeaderSection}>
              <Text style={styles.stepMainTitle}>Personal Information</Text>
              <Text style={styles.stepDescription}>Tell us about yourself</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>
                First Name <Text style={styles.asterisk}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color="#667eea" style={styles.icon} />
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Enter your first name"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholderTextColor="#A0AEC0"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>
                Last Name <Text style={styles.asterisk}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color="#667eea" style={styles.icon} />
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Enter your last name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholderTextColor="#A0AEC0"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>
                Contact Number <Text style={styles.asterisk}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call" size={20} color="#667eea" style={styles.icon} />
                <TextInput
                  style={styles.fieldInput}
                  placeholder="09XXXXXXXXX"
                  value={contact}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, '');
                    if (numericText.length <= 11) {
                      setContact(numericText);
                    }
                  }}
                  keyboardType="phone-pad"
                  placeholderTextColor="#A0AEC0"
                  maxLength={11}
                />
              </View>
              {contact.length > 0 && contact.length < 11 && (
                <Text style={styles.fieldHint}>
                  {contact.length}/11 digits entered
                </Text>
              )}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepWrapper}>
            <View style={styles.stepHeaderSection}>
              <Text style={styles.stepMainTitle}>Account Setup</Text>
              <Text style={styles.stepDescription}>Create your credentials</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>
                Username <Text style={styles.asterisk}>*</Text>
              </Text>
              <View style={[styles.inputContainer, usernameError && styles.inputError]}>
                <Ionicons name="at" size={20} color="#667eea" style={styles.icon} />
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Choose a unique username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  placeholderTextColor="#A0AEC0"
                />
                {checkingUsername && (
                  <Ionicons name="sync" size={18} color="#A0AEC0" />
                )}
                {!checkingUsername && username && !usernameError && (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                )}
              </View>
              {usernameError && (
                <Text style={styles.fieldError}>{usernameError}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>
                Password <Text style={styles.asterisk}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color="#667eea" style={styles.icon} />
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Create a strong password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#A0AEC0"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                  <Ionicons 
                    name={showPassword ? "eye" : "eye-off"} 
                    size={20} 
                    color="#A0AEC0" 
                  />
                </TouchableOpacity>
              </View>
              {password.length > 0 && password.length < 6 && (
                <Text style={styles.fieldHint}>
                  Minimum 6 characters required
                </Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>
                Confirm Password <Text style={styles.asterisk}>*</Text>
              </Text>
              <View style={[styles.inputContainer, passwordError && styles.inputError]}>
                <Ionicons name="lock-closed" size={20} color="#667eea" style={styles.icon} />
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor="#A0AEC0"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} activeOpacity={0.7}>
                  <Ionicons 
                    name={showConfirmPassword ? "eye" : "eye-off"} 
                    size={20} 
                    color="#A0AEC0" 
                  />
                </TouchableOpacity>
              </View>
              {passwordError && (
                <Text style={styles.fieldError}>{passwordError}</Text>
              )}
              {!passwordError && confirmPassword && password === confirmPassword && (
                <Text style={styles.fieldSuccess}>✓ Passwords match</Text>
              )}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepWrapper}>
            <View style={styles.stepHeaderSection}>
              <Text style={styles.stepMainTitle}>ID Verification</Text>
              <Text style={styles.stepDescription}>Upload a clear photo of your valid ID</Text>
            </View>

            {!idImage ? (
              <View style={styles.uploadContainer}>
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="card-outline" size={60} color="#667eea" />
                  <Text style={styles.uploadTitle}>Upload Your ID</Text>
                  <Text style={styles.uploadSubtitle}>
                    We need this to verify your identity
                  </Text>
                </View>

                <View style={styles.uploadButtons}>
                  <TouchableOpacity 
                    style={styles.uploadBtn}
                    onPress={() => pickImage(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={26} color="#667eea" />
                    <Text style={styles.uploadBtnText}>Take Photo</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.uploadBtn}
                    onPress={() => pickImage(false)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images" size={26} color="#667eea" />
                    <Text style={styles.uploadBtnText}>From Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.imagePreview}>
                <Image source={{ uri: idImage }} style={styles.uploadedImage} />
                <TouchableOpacity 
                  style={styles.changeImageBtn}
                  onPress={() => setIdImage(null)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={18} color="#FFFFFF" />
                  <Text style={styles.changeImageText}>Change Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 4:
        return (
          <View style={styles.stepWrapper}>
            <View style={styles.stepHeaderSection}>
              <View style={styles.verificationIcon}>
                <Ionicons name="shield-checkmark" size={40} color="#FFFFFF" />
              </View>
              <Text style={styles.stepMainTitle}>Barangay Verification</Text>
              <Text style={styles.stepDescription}>One last step to complete</Text>
            </View>

            <View style={styles.verificationBox}>
              <Text style={styles.verificationQuestion}>
                Who are the officers in Sambag 2?
              </Text>
              <Text style={styles.verificationHint}>
                Name any current barangay or SK official (full name or nickname)
              </Text>
              
              <View style={styles.formGroup}>
                <View style={styles.inputContainer}>
                  <Ionicons name="people" size={20} color="#667eea" style={styles.icon} />
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter official's name or nickname"
                    value={officialName}
                    onChangeText={setOfficialName}
                    placeholderTextColor="#A0AEC0"
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </View>

            <View style={styles.reviewBox}>
              <Text style={styles.reviewTitle}>Review Your Information</Text>
              
              <View style={styles.reviewRow}>
                <View style={styles.reviewIconCircle}>
                  <Ionicons name="person" size={18} color="#667eea" />
                </View>
                <View style={styles.reviewContent}>
                  <Text style={styles.reviewLabel}>Full Name</Text>
                  <Text style={styles.reviewValue}>{firstName} {lastName}</Text>
                </View>
              </View>

              <View style={styles.reviewRow}>
                <View style={styles.reviewIconCircle}>
                  <Ionicons name="call" size={18} color="#667eea" />
                </View>
                <View style={styles.reviewContent}>
                  <Text style={styles.reviewLabel}>Contact Number</Text>
                  <Text style={styles.reviewValue}>{contact}</Text>
                </View>
              </View>

              <View style={styles.reviewRow}>
                <View style={styles.reviewIconCircle}>
                  <Ionicons name="at" size={18} color="#667eea" />
                </View>
                <View style={styles.reviewContent}>
                  <Text style={styles.reviewLabel}>Username</Text>
                  <Text style={styles.reviewValue}>{username}</Text>
                </View>
              </View>

              <View style={styles.reviewRow}>
                <View style={styles.reviewIconCircle}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                </View>
                <View style={styles.reviewContent}>
                  <Text style={styles.reviewLabel}>ID Document</Text>
                  <Text style={styles.reviewValue}>Uploaded ✓</Text>
                </View>
              </View>

              <View style={[styles.reviewRow, { borderBottomWidth: 0 }]}>
                <View style={styles.reviewIconCircle}>
                  <Ionicons name="calendar" size={18} color="#667eea" />
                </View>
                <View style={styles.reviewContent}>
                  <Text style={styles.reviewLabel}>Registration Date</Text>
                  <Text style={styles.reviewValue}>
                    {new Date().toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

return (
  <View style={styles.container}>
    {isLogin ? (
      // Login Screen
      <>
        <StatusBar barStyle="light-content" backgroundColor="rgba(102, 126, 234, 0.9)" />
        <ImageBackground
          source={require('./assets/brgysambag.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.overlay} />
          
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={true}
            contentInsetAdjustmentBehavior="automatic"
          >
            <View style={styles.logoSection}>
              <View style={styles.logoWrapper}>
                <Image
                  source={require("./assets/sambaglogo.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.brandName}>Sambag 2</Text>
              <Text style={styles.brandTagline}>Emergency Response System</Text>
            </View>

            <View style={styles.loginFormCard}>
              <Text style={styles.welcomeText}>Welcome Back!</Text>
              <Text style={styles.welcomeSubtext}>Sign in to your account</Text>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Username</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person" size={20} color="#667eea" style={styles.icon} />
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter your username"
                    value={loginUsername}
                    onChangeText={setLoginUsername}
                    autoCapitalize="none"
                    placeholderTextColor="#A0AEC0"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed" size={20} color="#667eea" style={styles.icon} />
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    secureTextEntry={!showLoginPassword}
                    placeholderTextColor="#A0AEC0"
                  />
                  <TouchableOpacity onPress={() => setShowLoginPassword(!showLoginPassword)} activeOpacity={0.7}>
                    <Ionicons 
                      name={showLoginPassword ? "eye" : "eye-off"} 
                      size={20} 
                      color="#A0AEC0" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <Text style={styles.primaryBtnText}>Signing in...</Text>
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.separatorContainer}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>or</Text>
                <View style={styles.separatorLine} />
              </View>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={switchToRegister}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add" size={20} color="#667eea" />
                <Text style={styles.secondaryBtnText}>Create New Account</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ImageBackground>
      </>
    ) : (
      // Register Screen
      <>
        <StatusBar barStyle="light-content" backgroundColor="rgba(102, 126, 234, 0.9)" />
        <ImageBackground
          source={require('./assets/brgysambag.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.overlay} />
          
          <ScrollView 
            contentContainerStyle={styles.registerScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={true}
            contentInsetAdjustmentBehavior="automatic"
          >
            <View style={styles.registerTopBar}>
              <TouchableOpacity 
                style={styles.backIconBtn}
                onPress={switchToLogin}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.topBarInfo}>
                <Text style={styles.topBarTitle}>Create Account</Text>
                <Text style={styles.topBarStep}>Step {registrationStep} of 4</Text>
              </View>
            </View>

            {renderProgressIndicator()}

            <View style={styles.registerFormCard}>
              {renderStepContent()}

              <View style={styles.actionButtons}>
                {registrationStep > 1 && (
                  <TouchableOpacity
                    style={styles.backBtn}
                    onPress={handlePreviousStep}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chevron-back" size={20} color="#667eea" />
                    <Text style={styles.backBtnText}>Back</Text>
                  </TouchableOpacity>
                )}

                {registrationStep < 4 ? (
                  <TouchableOpacity
                    style={[styles.continueBtn, registrationStep === 1 && styles.continueBtnFull]}
                    onPress={handleNextStep}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.continueBtnText}>Continue</Text>
                    <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.finishBtn, loading && styles.btnDisabled]}
                    onPress={verifyBarangayOfficial}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <Text style={styles.finishBtnText}>Verifying...</Text>
                    ) : (
                      <>
                        <Text style={styles.finishBtnText}>Register</Text>
                        <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </ImageBackground>
      </>
    )}

    {/* Data Privacy Modal */}
    <DataPrivacyModal
      visible={showDataPrivacy}
      onAccept={handleAcceptPrivacy}
      onDecline={handleDeclinePrivacy}
    />
  </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(102, 126, 234, 0.85)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  registerScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  logoImage: {
    width: 75,
    height: 75,
  },
  brandName: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  brandTagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loginFormCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 15,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 6,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 30,
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  asterisk: {
    color: '#F56565',
    fontSize: 14,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minHeight: 50,
  position: 'relative',
  },
  inputError: {
    borderColor: '#F56565',
    backgroundColor: '#FFF5F5',
  },
  icon: {
    marginRight: 10,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A202C',
    fontWeight: '500',
  },
  fieldHint: {
    fontSize: 13,
    color: '#718096',
    marginTop: 8,
    fontWeight: '500',
  },
  fieldError: {
    fontSize: 13,
    color: '#F56565',
    marginTop: 8,
    fontWeight: '600',
  },
  fieldSuccess: {
    fontSize: 13,
    color: '#10B981',
    marginTop: 8,
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#667eea',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
  },
  separatorLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#E2E8F0',
  },
  separatorText: {
    paddingHorizontal: 20,
    fontSize: 14,
    color: '#A0AEC0',
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: '#C7D2FE',
  },
  secondaryBtnText: {
    color: '#667eea',
    fontSize: 17,
    fontWeight: '800',
  },
  registerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  topBarInfo: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  topBarStep: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  progressWrapper: {
    marginBottom: 30,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffffffff',
    borderRadius: 10,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  stepLabelActive: {
    color: '#FFFFFF',
  },
  registerFormCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 15,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  stepWrapper: {
    marginBottom: 20,
  },
  stepHeaderSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  stepMainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
    fontWeight: '500',
  },
  uploadContainer: {
    alignItems: 'center',
  },
  uploadPlaceholder: {
    width: '100%',
    paddingVertical: 40,
    backgroundColor: '#F7FAFC',
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3748',
    marginTop: 16,
    marginBottom: 6,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
  },
  uploadBtn: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#C7D2FE',
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#667eea',
    marginTop: 10,
  },
  imagePreview: {
    width: '100%',
    alignItems: 'center',
  },
  uploadedImage: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    resizeMode: 'cover',
    marginBottom: 16,
  },
  changeImageBtn: {
    flexDirection: 'row',
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  changeImageText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  verificationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  verificationBox: {
    backgroundColor: '#F7FAFC',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#C7D2FE',
  },
  verificationQuestion: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 8,
  },
  verificationHint: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 20,
    fontWeight: '500',
    lineHeight: 20,
  },
  reviewBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#BBF7D0',
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 20,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
  },
  reviewIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  reviewContent: {
    flex: 1,
  },
  reviewLabel: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 15,
    color: '#14532D',
    fontWeight: '800',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  backBtn: {
    flexDirection: 'row',
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#C7D2FE',
  },
  backBtnText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '800',
  },
  continueBtn: {
    flexDirection: 'row',
    flex: 2,
    backgroundColor: '#667eea',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  continueBtnFull: {
    flex: 1,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  finishBtn: {
    flexDirection: 'row',
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  // Data Privacy Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    padding: 20,
  },
  privacyModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    width: '100%',
    maxWidth: 450,
    maxHeight: height * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 30,
    overflow: 'hidden',
  },
privacyModalHeader: {
  backgroundColor: '#667eea',
  paddingTop: 30,
  paddingBottom: 20,
  paddingHorizontal: 30,
  alignItems: 'center',
},
shieldCircle: {
  width: 70,
  height: 70,
  borderRadius: 35,
  backgroundColor: 'rgba(255, 255, 255, 0.25)',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 15,
},
privacyModalTitle: {
  fontSize: 22,
  fontWeight: '800',
  color: '#FFFFFF',
  marginBottom: 6,
  textAlign: 'center',
},
privacyModalSubtitle: {
  fontSize: 13,
  color: 'rgba(255, 255, 255, 0.95)',
  fontWeight: '600',
  textAlign: 'center',
},
  privacyScrollContent: {
    maxHeight: height * 0.4,
    paddingHorizontal: 30,
    paddingVertical: 24,
  },
  privacySection: {
    marginBottom: 24,
  },
  privacySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  privacySectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A202C',
  },
  privacySectionText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 22,
    fontWeight: '500',
  },
  privacyFooterBox: {
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    borderWidth: 2,
    marginBottom: 40,
    borderColor: '#E2E8F0',
  },
  privacyFooterText: {
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 20,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  privacyButtonGroup: {
    flexDirection: 'row',
    padding: 30,
    paddingTop: 20,
    gap: 12,
    borderTopWidth: 2,
    borderTopColor: '#F7FAFC',
  },
  declineButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  declineButtonText: {
    color: '#718096',
    fontSize: 16,
    fontWeight: '800',
  },
  acceptButton: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});