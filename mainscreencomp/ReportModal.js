// components/ReportModal.js - Cross-Platform (Web + Mobile)
import React, { useState, useEffect, useRef } from 'react';
import { 
  Modal, View, Text, TouchableOpacity, StyleSheet, 
  ScrollView, ActivityIndicator, Alert, Platform 
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { collection, getDocs } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { COLORS } from './theme/theme';
import ReportForm from './ReportForm';
import LocationSelector from './LocationSelector';
import ImageUploader from './ImageUploader';

// Cross-platform alert function
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function ReportModal({ visible, selectedType, onClose, onSubmit, loading }) {
  const [formData, setFormData] = useState({});
  const [pickedImage, setPickedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null); // For web file upload
  const [locationObj, setLocationObj] = useState(null);
  const [crimeTypes, setCrimeTypes] = useState([]);
  const [accidentTypes, setAccidentTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const webViewRef = useRef(null);

  useEffect(() => {
    if (visible && selectedType) {
      resetForm();
      requestLocationPermission();
      loadTypeData();
    }
  }, [visible, selectedType]);

  const resetForm = () => {
    setFormData({});
    setPickedImage(null);
    setImageFile(null);
    setLocationObj(null);
  };

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission denied', 'Location permission is needed to submit report.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLocationObj({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
  };

  const loadTypeData = async () => {
    if (selectedType?.toLowerCase() === 'crime') {
      await loadCrimeTypes();
    } else if (selectedType?.toLowerCase() === 'accident') {
      await loadAccidentTypes();
    }
  };

  const loadCrimeTypes = async () => {
    try {
      setLoadingTypes(true);
      const crimesCollection = collection(firestore, 'crimes');
      const crimesSnapshot = await getDocs(crimesCollection);
      const crimesList = [];
      
      crimesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.crname) {
          crimesList.push({ id: doc.id, name: data.crname });
        }
      });
      
      setCrimeTypes(crimesList);
    } catch (error) {
      console.error('Error loading crime types:', error);
      showAlert('Error', 'Failed to load crime types. Please try again.');
    } finally {
      setLoadingTypes(false);
    }
  };

  const loadAccidentTypes = async () => {
    try {
      setLoadingTypes(true);
      const accidentsCollection = collection(firestore, 'accidents');
      const accidentsSnapshot = await getDocs(accidentsCollection);
      const accidentsList = [];
      
      accidentsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.acname) {
          accidentsList.push({ id: doc.id, name: data.acname });
        }
      });
      
      setAccidentTypes(accidentsList);
    } catch (error) {
      console.error('Error loading accident types:', error);
      showAlert('Error', 'Failed to load accident types. Please try again.');
    } finally {
      setLoadingTypes(false);
    }
  };

  const pickImageHandler = async (useCameraOrUrl, file = null, isCamera = false) => {
    if (Platform.OS === 'web') {
      // Web: useCameraOrUrl is actually the image URL from the file input
      setPickedImage(useCameraOrUrl);
      setImageFile(file); // Store the file object for upload later
    } else {
      // Mobile: existing logic
      try {
        let permission;
        if (useCameraOrUrl) {
          permission = await ImagePicker.requestCameraPermissionsAsync();
        } else {
          permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        }
        
        if (!permission.granted) {
          showAlert('Permission required', 'Please allow access to take or choose photo.');
          return;
        }

        const result = useCameraOrUrl
          ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false });

        if (!result.canceled && result.assets && result.assets[0]) {
          setPickedImage(result.assets[0].uri);
        }
      } catch (error) {
        console.error('Image picker error:', error);
        showAlert('Error', 'Failed to pick image.');
      }
    }
  };

  const validateForm = () => {
    if (!selectedType) {
      showAlert('Missing', 'Emergency type not selected.');
      return false;
    }
    if (!locationObj) {
      showAlert('Missing', 'Please choose or use a location.');
      return false;
    }
    if (selectedType.toLowerCase() === 'crime' && !formData.crimeType) {
      showAlert('Missing', 'Please select a crime type.');
      return false;
    }
    if (selectedType.toLowerCase() === 'accident' && !formData.accidentType) {
      showAlert('Missing', 'Please select an accident type.');
      return false;
    }
    if (selectedType.toLowerCase() === 'others' && !formData.customText?.trim()) {
      showAlert('Missing', 'Please describe the emergency.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const reportType = selectedType.toLowerCase() === 'others' 
        ? formData.customText.trim() || 'Unspecified Emergency'
        : selectedType.toUpperCase();

      await onSubmit({
        type: reportType,
        location: locationObj,
        pickedImage,
        imageFile, // Pass the file object for web
        additionalData: formData,
      });
    } catch (error) {
      showAlert('Error', error.message || 'Failed to submit report.');
    }
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.heading}>Emergency Report: {selectedType}</Text>

            <ReportForm
              selectedType={selectedType}
              formData={formData}
              setFormData={setFormData}
              crimeTypes={crimeTypes}
              accidentTypes={accidentTypes}
              loadingTypes={loadingTypes}
            />

            <ImageUploader
              pickedImage={pickedImage}
              onPickImage={pickImageHandler}
              onRemoveImage={() => {
                setPickedImage(null);
                setImageFile(null);
              }}
            />

            <LocationSelector
              locationObj={locationObj}
              setLocationObj={setLocationObj}
              webViewRef={webViewRef}
            />
          </ScrollView>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitButtonText}>Send Report</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.white,
    maxHeight: '95%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  submitButton: {
    backgroundColor: COLORS.danger,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});