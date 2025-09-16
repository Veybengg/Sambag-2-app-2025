import React, { useState, useCallback, memo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ScrollView, Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import {
  PhoneAuthProvider,
  signInWithPhoneNumber
} from 'firebase/auth';

const { width, height } = Dimensions.get('window');

// SMS Verification Modal Component
const SMSVerificationModal = memo(({ 
  visible, 
  onClose, 
  onVerify, 
  loading,
  phoneNumber,
  onResend,
  resendLoading
}) => {
  const [verificationCode, setVerificationCode] = useState('');

  const handleVerify = () => {
    if (!verificationCode.trim()) {
      Alert.alert('Missing Code', 'Please enter the verification code.');
      return;
    }
    onVerify(verificationCode);
  };

  const handleClose = () => {
    setVerificationCode('');
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>SMS Verification</Text>
        <Text style={styles.modalSubtitle}>
          We've sent a verification code to {phoneNumber}. Please enter the 6-digit code below.
        </Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Verification Code</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>🔢</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={6}
              autoFocus={true}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.resendButton, resendLoading && styles.submitButtonDisabled]}
          onPress={onResend}
          disabled={resendLoading}
        >
          <Text style={styles.resendButtonText}>
            {resendLoading ? 'Sending...' : 'Resend Code'}
          </Text>
        </TouchableOpacity>

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

// Barangay Verification Modal Component
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
        <Text style={styles.modalTitle}>Barangay Verification</Text>
        <Text style={styles.modalSubtitle}>
          To complete your registration, please name one current barangay official serving in Barangay Sambag 2.
        </Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Official's Name</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter any barangay official's name"
              value={localOfficialName}
              onChangeText={setLocalOfficialName}
              placeholderTextColor="#999"
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

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [idImage, setIdImage] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Barangay verification states
  const [showVerification, setShowVerification] = useState(false);
  const [verificationPassed, setVerificationPassed] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);

  // SMS verification states
  const [showSMSVerification, setShowSMSVerification] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [smsLoading, setSmsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const formatPhoneNumber = (phone) => {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Handle Philippine phone numbers
    if (cleaned.startsWith('0')) {
      return '+63' + cleaned.substring(1);
    } else if (cleaned.startsWith('63')) {
      return '+' + cleaned;
    } else if (cleaned.startsWith('+63')) {
      return cleaned;
    } else {
      return '+63' + cleaned;
    }
  };

  const sendSMSVerification = async () => {
    if (!contact.trim()) {
      Alert.alert('Missing Phone Number', 'Please enter your phone number.');
      return;
    }

    setSmsLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(contact);
      console.log('Sending SMS to:', formattedPhone);
      
      // For React Native, use signInWithPhoneNumber directly
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone);
      
      setConfirmationResult(confirmation);
      setShowSMSVerification(true);
      Alert.alert('Code Sent', 'Verification code has been sent to your phone.');
    } catch (error) {
      console.error('SMS verification error:', error);
      let errorMessage = 'Failed to send verification code. Please check your phone number and try again.';
      
      // Handle specific error cases
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format. Please check and try again.';
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = 'SMS quota exceeded. Please try again later.';
      }
      
      Alert.alert('Error', errorMessage);
    }
    setSmsLoading(false);
  };

  const resendSMSCode = async () => {
    setResendLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(contact);
      console.log('Resending SMS to:', formattedPhone);
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone);
      
      setConfirmationResult(confirmation);
      Alert.alert('Code Sent', 'New verification code has been sent to your phone.');
    } catch (error) {
      console.error('Resend SMS error:', error);
      Alert.alert('Error', 'Failed to resend verification code. Please try again.');
    }
    setResendLoading(false);
  };

  const verifySMSCode = async (code) => {
    if (!confirmationResult) {
      Alert.alert('Error', 'No verification session found. Please try again.');
      return;
    }

    setSmsLoading(true);
    try {
      // Confirm the verification code
      const result = await confirmationResult.confirm(code);
      
      console.log('SMS Verification successful:', result.user.uid);
      
      // Sign out immediately as we don't want to keep the user signed in with phone auth
      await auth.signOut();
      
      setShowSMSVerification(false);
      Alert.alert('Phone Verified!', 'Your phone number has been verified. Completing registration...');
      
      // Proceed with registration
      handleRegister();
    } catch (error) {
      console.error('SMS verification error:', error);
      let errorMessage = 'The verification code is invalid or has expired. Please try again.';
      
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'Verification code has expired. Please request a new code.';
      }
      
      Alert.alert('Invalid Code', errorMessage);
    }
    setSmsLoading(false);
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

  const verifyBarangayOfficial = useCallback(async (officialName) => {
    if (!officialName.trim()) {
      Alert.alert('Missing Name', 'Please enter a barangay official name.');
      return;
    }

    setVerificationLoading(true);
    try {
      const officialsRef = collection(db, 'brgyofficials');
      const snapshot = await getDocs(officialsRef);
      
      let isValidOfficial = false;
      const inputWords = officialName.toLowerCase().trim().split(/\s+/);
      
      snapshot.forEach((doc) => {
        const official = doc.data();
        if (official.name) {
          const officialWords = official.name.toLowerCase().split(/\s+/);
          
          const hasMatch = inputWords.some(inputWord => 
            officialWords.some(officialWord => 
              inputWord === officialWord && inputWord.length > 2
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
        Alert.alert('Verification Passed!', 'You can now proceed with SMS verification.');
        
        // Proceed to SMS verification
        sendSMSVerification();
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
  }, [contact]);

  const startRegistration = () => {
    if (!name || !contact || !username || !password || !idImage) {
      Alert.alert('Missing Info', 'Please fill out all fields and upload your ID.');
      return;
    }

    if (!verificationPassed) {
      setShowVerification(true);
      return;
    }

    // If barangay verification passed, proceed to SMS verification
    sendSMSVerification();
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      // Check if username already exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const existingUsers = await getDocs(q);

      if (!existingUsers.empty) {
        Alert.alert('Username taken', 'Please choose a different username.');
        setLoading(false);
        return;
      }

      // Store user data in Firestore (no Firebase Auth needed)
      const newUser = { 
        name, 
        contact: formatPhoneNumber(contact),
        phoneNumber: formatPhoneNumber(contact),
        username, 
        password,
        idImage,
        phoneVerified: true, // Mark as phone verified
        createdAt: new Date().toISOString()
      };

      await addDoc(usersRef, newUser);

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

  return (
    <View style={styles.container}>
      <View style={styles.gradientBackground} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* App Header */}
        <View style={styles.headerContainer}>
          <Image
            source={require("./assets/sambaglogo.png")}
            style={{ width: 100, height: 100 }}
          />
          <Text style={styles.appName}>Sambag 2</Text>
          <Text style={styles.appSubtitle}>App of Barangay Sambag 2</Text>
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
              ? 'Join our emergency reporters' 
              : 'Sign in to existing account'}
          </Text>

          {mode === 'register' && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Contact Number</Text>
                <Text style={styles.labelSubtext}>This will be verified via SMS</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>📱</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                    value={contact}
                    onChangeText={setContact}
                    keyboardType="phone-pad"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            </>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🏷️</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {mode === 'register' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>ID Photo</Text>
              <Text style={styles.labelSubtext}>Upload a clear photo of your ID for verification</Text>
              
              {!idImage ? (
                <View style={styles.imageUploadContainer}>
                  <TouchableOpacity 
                    style={styles.imageUploadButton} 
                    onPress={() => pickImage(true)}
                  >
                    <Text style={styles.imageUploadIcon}>📷</Text>
                    <Text style={styles.imageUploadText}>Take Photo</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.imageUploadButton} 
                    onPress={() => pickImage(false)}
                  >
                    <Text style={styles.imageUploadIcon}>🖼️</Text>
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
                    <Text style={styles.changeImageText}>Change Image</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Verification Status Indicators for Registration */}
          {mode === 'register' && (
            <View style={styles.verificationStatus}>
              <Text style={styles.verificationStatusText}>
                Barangay Verification: {verificationPassed ? '✅ Passed' : '❌ Required'}
              </Text>
              <Text style={styles.verificationStatusText}>
                SMS Verification: Required after barangay verification
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, (loading || smsLoading) && styles.submitButtonDisabled]}
            onPress={mode === 'register' ? startRegistration : handleLogin}
            disabled={loading || smsLoading}
          >
            <View style={styles.submitButtonGradient}>
              <Text style={styles.submitButtonText}>
                {(loading || smsLoading) ? 'Please wait...' : (mode === 'register' ? 'Create Account' : 'Sign In')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Barangay Verification Modal */}
      <VerificationModal
        visible={showVerification}
        onClose={() => setShowVerification(false)}
        onVerify={verifyBarangayOfficial}
        loading={verificationLoading}
      />

      {/* SMS Verification Modal */}
      <SMSVerificationModal
        visible={showSMSVerification}
        onClose={() => setShowSMSVerification(false)}
        onVerify={verifySMSCode}
        loading={smsLoading}
        phoneNumber={formatPhoneNumber(contact)}
        onResend={resendSMSCode}
        resendLoading={resendLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8FF',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height,
    backgroundColor: '#87CEEB',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C5282',
    textAlign: 'center',
    marginBottom: 5,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    opacity: 0.8,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 4,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  modeToggle: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  activeModeToggle: {
    backgroundColor: '#87CEEB',
  },
  modeToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeModeToggleText: {
    color: '#FFFFFF',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C5282',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5282',
    marginBottom: 8,
  },
  labelSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 15,
    minHeight: 50,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
  },
  imageUploadContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  imageUploadButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#87CEEB',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
  },
  imageUploadIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  imageUploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C5282',
  },
  imagePreviewContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
    marginBottom: 15,
  },
  changeImageButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#87CEEB',
    borderRadius: 20,
  },
  changeImageText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  verificationStatus: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#87CEEB',
  },
  verificationStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C5282',
    textAlign: 'center',
    marginBottom: 4,
  },
  submitButton: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 12,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendButton: {
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  resendButtonText: {
    color: '#87CEEB',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    marginHorizontal: 20,
    width: width - 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C5282',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 15,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  }, modalVerifyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#87CEEB',
    alignItems: 'center',
  },
  modalVerifyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});