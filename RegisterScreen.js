import React, { useState, useCallback, memo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ScrollView, Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Separate Modal Component to prevent re-renders
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
            To complete your registration, please name one current barangay official serving in Barangay Sambag 2.
          </Text>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Official's Name
            <Text style={styles.required}> *</Text>
          </Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter any barangay official's name"
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
  const [mode, setMode] = useState('register'); // 'login' or 'register'

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contact, setContact] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [idImage, setIdImage] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // States for barangay officials verification
  const [showVerification, setShowVerification] = useState(false);
  const [verificationPassed, setVerificationPassed] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);

  // States for username validation
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);

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

  // Debounced username check using useEffect
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

  const verifyBarangayOfficial = useCallback(async (officialName) => {
    if (!officialName.trim()) {
      Alert.alert('Missing Name', 'Please enter a barangay official name.');
      return;
    }

    setVerificationLoading(true);
    try {
      // Get all barangay officials
      const officialsRef = collection(db, 'brgyofficials');
      const snapshot = await getDocs(officialsRef);
      
      let isValidOfficial = false;
      const inputWords = officialName.toLowerCase().trim().split(/\s+/);
      
      snapshot.forEach((doc) => {
        const official = doc.data();
        if (official.name) {
          const officialWords = official.name.toLowerCase().split(/\s+/);
          
          // Check if any input word matches any word in the official's name
          const hasMatch = inputWords.some(inputWord => 
            officialWords.some(officialWord => 
              inputWord === officialWord && inputWord.length > 2 // Avoid matching very short words
            )
          );
          
          if (hasMatch) {
            isValidOfficial = true;
          }
        }
      });

      if (isValidOfficial) {
        setVerificationPassed(true);
        setShowVerification(false);
        Alert.alert('Verification Passed!', 'You can now proceed with registration.');
      } else {
        Alert.alert(
          'Verification Failed', 
          'The name you entered does not match any current barangay official. Please try again.'
        );
      }
    } catch (err) {
      console.error('Verification error:', err);
      Alert.alert('Error', 'Failed to verify official. Please try again.');
    }
    setVerificationLoading(false);
  }, []);

  const startRegistration = () => {
    if (!firstName || !lastName || !contact || !username || !password || !idImage) {
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

    if (!verificationPassed) {
      setShowVerification(true);
      return;
    }

    handleRegister();
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      // Double-check username availability before final registration
      const isUsernameAvailable = await checkUsernameAvailability(username);
      if (!isUsernameAvailable) {
        Alert.alert('Username taken', 'Please choose a different username.');
        setLoading(false);
        return;
      }

      // Combine first and last name
      const name = `${firstName.trim()} ${lastName.trim()}`;
      const newUser = { name, contact, username: username.trim(), password, idImage };
      await addDoc(collection(db, 'users'), newUser);

      await AsyncStorage.setItem('user_registered', 'true');
      await AsyncStorage.setItem('user_data', JSON.stringify(newUser));

      Alert.alert('Success', 'Registration complete!');
      onRegistered?.();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to register. Try again.');
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
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username), where('password', '==', password));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const user = userDoc.data();

        await AsyncStorage.setItem('user_registered', 'true');
        await AsyncStorage.setItem('user_data', JSON.stringify(user));

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

  // Helper function to get button text for registration mode
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
        {/* App Header */}
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

        {/* Mode Toggle */}
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

        {/* Form Card */}
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
              {/* First Name and Last Name Row */}
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
                      // Only allow numbers and limit to 11 digits
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
              <Ionicons name="at-outline" size={20} color="#6B7280" style={styles.inputIcon} />
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
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {mode === 'register' && (
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
          )}

          {/* Verification Status Indicator for Registration */}
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

        {/* Bottom spacing */}
        <View style={{ height: 30 }} />
      </ScrollView>

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
    // Removed - no longer needed
  },
  nameInputContainer: {
    // Removed - no longer needed
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
    transition: 'border-color 0.2s ease',
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
  // Modal styles
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
});