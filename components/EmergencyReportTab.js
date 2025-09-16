// MainScreen.js - Enhanced with description fields and improved UX
import React, { useEffect, useState, useRef } from 'react';
import ReportTracking from '../ReportTracking'; // Adjust path as needed
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
  Image,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { WebView } from 'react-native-webview';
import { TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import uuid from 'react-native-uuid';
import { ref as rdbRef, set, get } from 'firebase/database';
import { realtimeDb, storage as firebaseStorage, db as firestore } from '../firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, getDocs } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#87CEEB',
  secondary: '#FFD700',
  background: '#F0F8FF',
  white: '#FFFFFF',
  danger: '#d32f2f',
  text: '#2C5282',
  textSecondary: '#4A5568',
  cardShadow: 'rgba(0,0,0,0.1)',
  success: '#10B981',
};



const BUTTONS = [
  { 
    key: 'accident', 
    label: 'Accident', 
    icon: <FontAwesome5 name="car-crash" size={28} color="#fff" />,
    color: '#FF6B6B'
  },
  { 
    key: 'fire', 
    label: 'Fire', 
    icon: <FontAwesome5 name="fire" size={28} color="#fff" />,
    color: '#FF8E53'
  },
  { 
    key: 'paramedics', 
    label: 'Medical', 
    icon: <FontAwesome5 name="first-aid" size={28} color="#fff" />,
    color: '#4ECDC4'
  },
  { 
    key: 'noise', 
    label: 'Noise', 
    icon: <FontAwesome name="volume-up" size={28} color="#fff" />,
    color: '#45B7D1'
  },
  { 
    key: 'crime', 
    label: 'Crime', 
    icon: <FontAwesome5 name="user-secret" size={28} color="#fff" />,
    color: '#9B59B6'
  },
  { 
    key: 'garbage', 
    label: 'Garbage', 
    icon: <FontAwesome5 name="trash" size={28} color="#fff" />,
    color: '#F39C12'
  },
  { 
    key: 'others', 
    label: 'Others', 
    icon: <FontAwesome name="ellipsis-h" size={28} color="#fff" />,
    color: '#95A5A6'
  },
];

const MAX_SUBMISSIONS = 10;

export default function MainScreen({ onLogout, onGoToAnnouncements }) {
  const [userName, setUserName] = useState('');
  const [userContact, setUserContact] = useState('');
  const [userIdImage, setUserIdImage] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [pickedImage, setPickedImage] = useState(null);
  const [showReportTracking, setShowReportTracking] = useState(false);
  const [locationObj, setLocationObj] = useState(null);
  const [loading, setLoading] = useState(false);
  const [remainingSubmissions, setRemainingSubmissions] = useState(null);
  const [customEmergencyText, setCustomEmergencyText] = useState('');
  const [crimeTypes, setCrimeTypes] = useState([]);
  const [selectedCrimeType, setSelectedCrimeType] = useState('');
  const [crimeDropdownVisible, setCrimeDropdownVisible] = useState(false);
  const [loadingCrimeTypes, setLoadingCrimeTypes] = useState(false);
  const [accidentTypes, setAccidentTypes] = useState([]);
  const [selectedAccidentType, setSelectedAccidentType] = useState('');
  const [accidentDropdownVisible, setAccidentDropdownVisible] = useState(false);
  const [loadingAccidentTypes, setLoadingAccidentTypes] = useState(false);
  const webViewRef = useRef(null);
  
  // Medical-only fields
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [patientComplaints, setPatientComplaints] = useState('');
  const [fireDescription, setFireDescription] = useState('');

  // New description fields for garbage, noise, crime, and accident
  const [garbageDescription, setGarbageDescription] = useState('');
  const [noiseDescription, setNoiseDescription] = useState('');
  const [crimeDescription, setCrimeDescription] = useState('');
  const [accidentDescription, setAccidentDescription] = useState('');
  
  // Success modal state
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  // Generate HTML for Leaflet map
  const generateMapHTML = (lat = 10.3064781, lng = 123.8902196, markerLat = null, markerLng = null) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
        <style>
            body { margin: 0; padding: 0; }
            #map { height: 100vh; width: 100vw; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
        <script>
            var map = L.map('map').setView([${lat}, ${lng}], 16);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            var marker = null;
            var userLocationMarker = null;
            
            ${markerLat && markerLng ? `
            marker = L.marker([${markerLat}, ${markerLng}], {
                icon: L.icon({
                    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjRkYwMDAwIi8+Cjwvc3ZnPgo=',
                    iconSize: [30, 30],
                    iconAnchor: [15, 30]
                })
            }).addTo(map);
            ` : ''}

            map.on('click', function(e) {
                if (marker) {
                    map.removeLayer(marker);
                }
                marker = L.marker(e.latlng, {
                    icon: L.icon({
                        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjRkYwMDAwIi8+Cjwvc3ZnPgo=',
                        iconSize: [30, 30],
                        iconAnchor: [15, 30]
                    })
                }).addTo(map);
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'locationSelected',
                    latitude: e.latlng.lat,
                    longitude: e.latlng.lng
                }));
            });

            window.addEventListener('message', function(event) {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'updateLocation') {
                        if (marker) {
                            map.removeLayer(marker);
                        }
                        
                        marker = L.marker([data.latitude, data.longitude], {
                            icon: L.icon({
                                iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjMDA5OEZGIi8+Cjwvc3ZnPgo=',
                                iconSize: [30, 30],
                                iconAnchor: [15, 30]
                            })
                        }).addTo(map);
                        
                        map.setView([data.latitude, data.longitude], 17);
                        
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'locationSet',
                            latitude: data.latitude,
                            longitude: data.longitude
                        }));
                    }
                } catch (e) {
                    console.log('Error parsing message:', e);
                }
            });

            setTimeout(function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'mapReady'
                }));
            }, 1000);
        </script>
    </body>
    </html>
    `;
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (selectedType) {
      refreshRemainingSubmissions();
      if (selectedType.toLowerCase() === 'crime') {
        loadCrimeTypes();
      }
      if (selectedType.toLowerCase() === 'accident') {
        loadAccidentTypes();
      }
    }
  }, [selectedType]);

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

  const loadAccidentTypes = async () => {
    try {
      setLoadingAccidentTypes(true);
      const accidentsCollection = collection(firestore, 'accidents');
      const accidentsSnapshot = await getDocs(accidentsCollection);
      const accidentsList = [];
      
      accidentsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.acname) {
          accidentsList.push({
            id: doc.id,
            name: data.acname
          });
        }
      });
      
      setAccidentTypes(accidentsList);
    } catch (error) {
      console.error('Error loading accident types:', error);
      Alert.alert('Error', 'Failed to load accident types. Please try again.');
    } finally {
      setLoadingAccidentTypes(false);
    }
  };

  const loadCrimeTypes = async () => {
    try {
      setLoadingCrimeTypes(true);
      const crimesCollection = collection(firestore, 'crimes');
      const crimesSnapshot = await getDocs(crimesCollection);
      const crimesList = [];
      
      crimesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.crname) {
          crimesList.push({
            id: doc.id,
            name: data.crname
          });
        }
      });
      
      setCrimeTypes(crimesList);
    } catch (error) {
      console.error('Error loading crime types:', error);
      Alert.alert('Error', 'Failed to load crime types. Please try again.');
    } finally {
      setLoadingCrimeTypes(false);
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

  // Enhanced success alert with custom modal
  const showSuccessAlert = () => {
    setSuccessModalVisible(true);
    setTimeout(() => {
      setSuccessModalVisible(false);
    }, 3000); // Auto close after 3 seconds
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              await AsyncStorage.multiRemove([
                'user_registered',
                'user_data',
              ]);
              
              // Reset all states
              setUserName('');
              setUserContact('');
              setUserIdImage('');
              setModalVisible(false);
              setSelectedType('');
              setPickedImage(null);
              setLocationObj(null);
              setRemainingSubmissions(null);
              setCustomEmergencyText('');
              setCrimeTypes([]);
              setSelectedCrimeType('');
              setCrimeDropdownVisible(false);
              setAccidentTypes([]);
              setSelectedAccidentType('');
              setAccidentDropdownVisible(false);
              setPatientName('');
              setPatientAge('');
              setPatientGender('');
              setPatientComplaints('');
              setFireDescription('');
              setGarbageDescription('');
              setNoiseDescription('');
              setCrimeDescription('');
              
              setLoading(false);
              
              if (onLogout) {
                onLogout();
              }
              
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleButtonPress = async (type) => {
    setSelectedType(type);
    setPickedImage(null);
    setLocationObj(null);
    setCustomEmergencyText('');
    setSelectedCrimeType('');
    setFireDescription('');
    setSelectedAccidentType('');
    
    // Reset medical fields
    setPatientName('');
    setPatientAge('');
    setPatientGender('');
    setPatientComplaints('');

    // Reset new description fields
    setGarbageDescription('');
    setNoiseDescription('');
    setCrimeDescription('');
    setAccidentDescription('');

    setModalVisible(true);
    requestLocationPermission();
  };

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is needed to submit report.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLocationObj({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
  };

  const pickImageHandler = async (fromCamera = false) => {
    let permission;
    if (fromCamera) {
      permission = await ImagePicker.requestCameraPermissionsAsync();
    } else {
      permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to take or choose photo.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false });

    if (!result.canceled) {
      setPickedImage(result.assets[0].uri);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location permission required', 'Please enable location permissions to use this feature.');
        return;
      }
      
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
        maximumAge: 10000,
      });
      
      const newLocation = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      
      setLocationObj(newLocation);
      
      setTimeout(() => {
        if (webViewRef.current) {
          const message = JSON.stringify({
            type: 'updateLocation',
            latitude: newLocation.latitude,
            longitude: newLocation.longitude
          });
          webViewRef.current.postMessage(message);
        }
      }, 500);

      // Show quick success message that auto-dismisses
      const successAlert = Alert.alert(
        'Location Found!',
        'Your location has been set.',
        [{ text: 'OK', style: 'default' }]
      );
      
      // Auto-dismiss the alert after 1.5 seconds
      setTimeout(() => {
        // The alert will be dismissed when user taps OK or after timeout
      }, 1500);
      
    } catch (e) {
      console.warn('Location error:', e);
      Alert.alert('Location Error', 'Could not get your current location. Please try again or select location manually on the map.');
    }
  };

  const handleMapMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'locationSelected') {
        setLocationObj({
          latitude: data.latitude,
          longitude: data.longitude
        });
      }
    } catch (e) {
      console.warn('Error parsing map message', e);
    }
  };

  const uploadImageToStorage = async (localUri) => {
    try {
      if (!localUri) return null;
      const response = await fetch(localUri);
      const blob = await response.blob();
      const filename = `reports/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;
      const storageReference = storageRef(firebaseStorage, filename);
      await uploadBytes(storageReference, blob);
      const downloadUrl = await getDownloadURL(storageReference);
      return downloadUrl;
    } catch (e) {
      console.warn('Image upload failed', e);
      return null;
    }
  };

  const submitReport = async () => {
    if (!selectedType) {
      Alert.alert('Missing', 'Emergency type not selected.');
      return;
    }
    if (!locationObj) {
      Alert.alert('Missing', 'Please choose or use a location.');
      return;
    }
    
    if (selectedType.toLowerCase() === 'crime' && !selectedCrimeType) {
      Alert.alert('Missing', 'Please select a crime type.');
      return;
    }
    
    if (selectedType.toLowerCase() === 'accident' && !selectedAccidentType) {
      Alert.alert('Missing', 'Please select an accident type.');
      return;
    }
    
    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      const currentDay = new Date().toISOString().split('T')[0];
      const submissionsRef = rdbRef(realtimeDb, `led/submissions/${deviceId}/${currentDay}`);
      const submissionsSnapshot = await get(submissionsRef);
      const submissionCount = submissionsSnapshot.exists() ? submissionsSnapshot.val() : 0;
      if (submissionCount >= MAX_SUBMISSIONS) {
        Alert.alert('Limit reached', 'You have reached daily submission limit.');
        setLoading(false);
        return;
      }

      const locationString = `Latitude: ${locationObj.latitude}, Longitude: ${locationObj.longitude}`;
      const reportId = -Date.now();

      const uploadedImageUrl = pickedImage ? await uploadImageToStorage(pickedImage) : null;

      const reportData = {
        reportId,
        name: userName,
        contact: userContact,
        type:
          selectedType.toLowerCase() === 'others'
            ? customEmergencyText.trim() || 'Unspecified Emergency'
            : selectedType.toUpperCase(),
        location: locationString,
        imageUrl: uploadedImageUrl || 'No image provided',
        idImage: userIdImage || 'No ID image',
        timestamp: new Date().toLocaleString(),
        deviceId,
      };

      // Attach specific descriptions based on report type
      if (selectedType.toLowerCase() === 'fire') {
        reportData.fireDescription = fireDescription || 'N/A';
      }

      if (selectedType.toLowerCase() === 'medical') {
        reportData.patientName = patientName || 'N/A';
        reportData.patientAge = patientAge || 'N/A';
        reportData.patientGender = patientGender || 'N/A';
        reportData.patientComplaints = patientComplaints || 'N/A';
      }

      if (selectedType.toLowerCase() === 'garbage') {
        reportData.garbageDescription = garbageDescription || 'N/A';
      }

      if (selectedType.toLowerCase() === 'noise') {
        reportData.noiseDescription = noiseDescription || 'N/A';
      }

      if (selectedType.toLowerCase() === 'crime') {
        reportData.crimeDescription = crimeDescription || 'N/A';
        if (selectedCrimeType) {
          reportData.crimeType = selectedCrimeType;
        }
      }

      if (selectedType.toLowerCase() === 'accident') {
        reportData.accidentDescription = accidentDescription || 'N/A';
        if (selectedAccidentType) {
          reportData.accidentType = selectedAccidentType;
        }
      }

      await set(rdbRef(realtimeDb, `led/reports/${reportId}`), reportData);
      await set(submissionsRef, submissionCount + 1);
      await set(rdbRef(realtimeDb, 'led/state'), 1);

      showSuccessAlert();
      setModalVisible(false);
      refreshRemainingSubmissions();
    } catch (err) {
      console.error('Submit error', err);
      Alert.alert('Error', 'Failed to submit report.');
    }
    setLoading(false);
  };

  const renderAccidentTypeDropdown = () => {
    if (loadingAccidentTypes) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading accident types...</Text>
        </View>
      );
    }

    return (
      <View style={[styles.inputContainer, { position: 'relative', zIndex: 2 }]}>
        <Text style={styles.label}>Select Type of Accident <Text style={styles.required}>*</Text></Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setAccidentDropdownVisible(!accidentDropdownVisible)}
        >
          <Text style={styles.dropdownText}>
            {selectedAccidentType || 'Choose accident type...'}
          </Text>
          <FontAwesome 
            name={accidentDropdownVisible ? "chevron-up" : "chevron-down"} 
            size={16} 
            color={COLORS.textSecondary} 
          />
        </TouchableOpacity>
        
        {accidentDropdownVisible && (
          <View style={styles.dropdownList}>
            <ScrollView 
              style={{ maxHeight: 200 }} 
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {accidentTypes.map((accident) => (
                <TouchableOpacity
                  key={accident.id}
                  style={styles.dropdownItem}
                  activeOpacity={0.7}
                  delayPressIn={50}
                  onPress={() => {
                    setSelectedAccidentType(accident.name);
                    setAccidentDropdownVisible(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{accident.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const renderCrimeTypeDropdown = () => {
    if (loadingCrimeTypes) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading crime types...</Text>
        </View>
      );
    }

    return (
      <View style={[styles.inputContainer, { position: 'relative', zIndex: 2 }]}>
        <Text style={styles.label}>Select Type of Crime <Text style={styles.required}>*</Text></Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setCrimeDropdownVisible(!crimeDropdownVisible)}
        >
          <Text style={styles.dropdownText}>
            {selectedCrimeType || 'Choose crime type...'}
          </Text>
          <FontAwesome 
            name={crimeDropdownVisible ? "chevron-up" : "chevron-down"} 
            size={16} 
            color={COLORS.textSecondary} 
          />
        </TouchableOpacity>
        
        {crimeDropdownVisible && (
          <View style={styles.dropdownList}>
            <ScrollView 
              style={{ maxHeight: 200 }} 
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {crimeTypes.map((crime) => (
                <TouchableOpacity
                  key={crime.id}
                  style={styles.dropdownItem}
                  activeOpacity={0.7}
                  delayPressIn={50}
                  onPress={() => {
                    setSelectedCrimeType(crime.name);
                    setCrimeDropdownVisible(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{crime.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.gradientBackground} />
      
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <View style={styles.logoSection}>
              <Image
                source={require("../assets/sambaglogo.png")}
                style={styles.logoImage}
              />
              <Text style={styles.appName}>Sambag 2</Text>
              <Text style={styles.appSubtitle}>Emergency Reporting System</Text>
            </View>
          </View>

          {/* Welcome Card */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeContent}>
              <View>
                <Text style={styles.welcomeText}>
                  Welcome, {userName || 'User'}!
                </Text>
                <Text style={styles.submissionCount}>
                  {remainingSubmissions != null
                    ? `Reports remaining today: ${remainingSubmissions}`
                    : 'Loading...'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => {/* Profile action */}}
              >
                <FontAwesome name="user-circle" size={32} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.announcementButton}
              onPress={onGoToAnnouncements}
            >
              <FontAwesome5 name="bullhorn" size={18} color={COLORS.white} />
              <Text style={styles.announcementButtonText}>View Announcements</Text>
            </TouchableOpacity>

            <TouchableOpacity
  style={styles.trackReportsButton}
  onPress={() => setShowReportTracking(true)}
>
  <FontAwesome5 name="clipboard-list" size={18} color={COLORS.white} />
  <Text style={styles.trackReportsButtonText}>Track My Reports</Text>
</TouchableOpacity>
          </View>

          {/* Emergency Types Section */}
          <View style={styles.emergencySection}>
            <Text style={styles.sectionTitle}>Select Emergency Type</Text>
            <View style={styles.emergencyGrid}>
              {BUTTONS.map((btn) => (
                <TouchableOpacity
                  key={btn.key}
                  style={[styles.emergencyCard, { backgroundColor: btn.color }]}
                  activeOpacity={0.8}
                  onPress={() => handleButtonPress(btn.label)}
                >
                  <View style={styles.emergencyIconContainer}>
                    {btn.icon}
                  </View>
                  <Text style={styles.emergencyLabel}>{btn.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Settings/Logout Section */}
          <View style={styles.settingsSection}>
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={handleLogout}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <FontAwesome5 name="sign-out-alt" size={16} color={COLORS.white} />
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Report Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={modalStyles.backdrop}>
          <View style={modalStyles.container}>
            <ScrollView 
              contentContainerStyle={modalStyles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={modalStyles.heading}>Emergency Report: {selectedType}</Text>

              {/* Accident Type Dropdown */}
              {selectedType.toLowerCase() === 'accident' && renderAccidentTypeDropdown()}

              {/* Accident Description Field */}
              {selectedType.toLowerCase() === 'accident' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Accident Description</Text>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={3}
                    placeholder="Please provide details about the accident..."
                    value={accidentDescription}
                    onChangeText={setAccidentDescription}
                    placeholderTextColor="#999"
                  />
                </View>
              )}

              {/* Crime Type Dropdown */}
              {selectedType.toLowerCase() === 'crime' && renderCrimeTypeDropdown()}

              {/* Crime Description Field */}
              {selectedType.toLowerCase() === 'crime' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Crime Description</Text>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={3}
                    placeholder="Please provide details about the crime incident..."
                    value={crimeDescription}
                    onChangeText={setCrimeDescription}
                    placeholderTextColor="#999"
                  />
                </View>
              )}

              {/* Garbage Description Field */}
              {selectedType.toLowerCase() === 'garbage' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Garbage Issue Description</Text>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={3}
                    placeholder="Describe the garbage-related issue (e.g., illegal dumping, overflowing bins, etc.)..."
                    value={garbageDescription}
                    onChangeText={setGarbageDescription}
                    placeholderTextColor="#999"
                  />
                </View>
              )}

              {/* Noise Description Field */}
              {selectedType.toLowerCase() === 'noise' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Noise Complaint Description</Text>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={3}
                    placeholder="Describe the noise issue (e.g., loud music, construction noise, etc.)..."
                    value={noiseDescription}
                    onChangeText={setNoiseDescription}
                    placeholderTextColor="#999"
                  />
                </View>
              )}

              {/* Custom Emergency Text for Others */}
              {selectedType.toLowerCase() === 'others' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Describe the emergency <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    placeholder="Please describe the emergency situation..."
                    value={customEmergencyText}
                    onChangeText={setCustomEmergencyText}
                    placeholderTextColor="#999"
                  />
                </View>
              )}

              {/* Medical Report Fields — only for Medical */}
              {selectedType.toLowerCase() === 'medical' && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Patient Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter patient's full name"
                      value={patientName}
                      onChangeText={setPatientName}
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Age</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter age"
                      value={patientAge}
                      onChangeText={setPatientAge}
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Gender</Text>
                    <Dropdown
                      style={modalStyles.dropdown}
                      data={[
                        { label: 'Male', value: 'Male' },
                        { label: 'Female', value: 'Female' },
                      ]}
                      labelField="label"
                      valueField="value"
                      placeholder="Select gender"
                      placeholderStyle={modalStyles.dropdownPlaceholder}
                      selectedTextStyle={modalStyles.dropdownSelectedText}
                      value={patientGender}
                      onChange={(item) => setPatientGender(item.value)}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Complaints</Text>
                    <TextInput
                      style={styles.textArea}
                      multiline
                      numberOfLines={3}
                      placeholder="Describe patient's complaints"
                      value={patientComplaints}
                      onChangeText={setPatientComplaints}
                      placeholderTextColor="#999"
                    />
                  </View>
                </>
              )}

              {/* Fire Report Fields — only for Fire */}
              {selectedType.toLowerCase() === 'fire' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={3}
                    placeholder="Describe the fire incident"
                    value={fireDescription}
                    onChangeText={setFireDescription}
                    placeholderTextColor="#999"
                  />
                </View>
              )}

              {/* Image Section */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Add Photo (Optional)</Text>
                {pickedImage ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: pickedImage }} style={styles.imagePreview} />
                    <TouchableOpacity 
                      style={styles.changeImageButton}
                      onPress={() => setPickedImage(null)}
                    >
                      <Text style={styles.changeImageText}>Change Photo</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imageUploadContainer}>
                    <TouchableOpacity 
                      style={styles.imageUploadButton} 
                      onPress={() => pickImageHandler(true)}
                    >
                      <FontAwesome5 name="camera" size={24} color={COLORS.primary} />
                      <Text style={styles.imageUploadText}>Take Photo</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.imageUploadButton} 
                      onPress={() => pickImageHandler(false)}
                    >
                      <FontAwesome5 name="image" size={24} color={COLORS.primary} />
                      <Text style={styles.imageUploadText}>From Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Location Section */}
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.label}>Location <Text style={styles.required}>*</Text></Text>
                <View style={styles.locationButtonsContainer}>
                  <TouchableOpacity
                    style={styles.locationButton}
                    onPress={handleUseCurrentLocation}
                  >
                    <FontAwesome5 name="location-arrow" size={16} color={COLORS.white} />
                    <Text style={styles.locationButtonText}>Use Current Location</Text>
                  </TouchableOpacity>
                  <Text style={styles.orText}>or tap on map below</Text>
                </View>
                
                <View style={styles.mapContainer}>
                  <WebView
                    ref={webViewRef}
                    source={{ 
                      html: generateMapHTML(
                        locationObj?.latitude || 10.3064781, 
                        locationObj?.longitude || 123.8902196,
                        locationObj?.latitude,
                        locationObj?.longitude
                      ) 
                    }}
                    style={styles.mapWebView}
                    onMessage={handleMapMessage}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    scalesPageToFit={true}
                    mixedContentMode="always"
                    allowsInlineMediaPlaybook={true}
                    mediaPlaybackRequiresUserAction={false}
                    originWhitelist={['*']}
                  />
                </View>
                
                {locationObj && (
                  <Text style={styles.locationCoords}>
                    Selected: {locationObj.latitude.toFixed(5)}, {locationObj.longitude.toFixed(5)}
                  </Text>
                )}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={modalStyles.actionsContainer}>
              <TouchableOpacity
                style={modalStyles.submitButton}
                onPress={submitReport}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={modalStyles.submitButtonText}>Send Report</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={modalStyles.cancelButton}
                onPress={() => { setModalVisible(false); }}
                disabled={loading}
              >
                <Text style={modalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Success Modal */}
      <Modal animationType="fade" transparent={true} visible={successModalVisible}>
        <View style={successModalStyles.backdrop}>
          <View style={successModalStyles.container}>
            <View style={successModalStyles.iconContainer}>
              <FontAwesome5 name="check-circle" size={60} color={COLORS.success} />
            </View>
            <Text style={successModalStyles.title}>Report Submitted!</Text>
            <Text style={successModalStyles.message}>
              Your emergency report has been received and will be processed by authorities.
            </Text>
            <TouchableOpacity 
              style={successModalStyles.button}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={successModalStyles.buttonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

{/* Report Tracking Modal */}
<Modal animationType="slide" transparent={true} visible={showReportTracking}>
  <ReportTracking
    visible={showReportTracking}
    onClose={() => setShowReportTracking(false)}
    userId={null} // Let the component handle getting the device ID
    userName={userName}
  />
</Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height,
    backgroundColor: COLORS.primary,
  },
  safeArea: {
    flex: 1,
  },

  trackReportsButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#6366f1',
  paddingVertical: 15,
  paddingHorizontal: 20,
  borderRadius: 12,
  marginTop: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.15,
  shadowRadius: 6,
  elevation: 6,
},
trackReportsButtonText: {
  color: COLORS.white,
  fontSize: 16,
  fontWeight: '600',
  marginLeft: 10,
},
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  logoSection: {
    alignItems: 'center',
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  welcomeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  submissionCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  profileButton: {
    padding: 8,
  },
  actionButtonsContainer: {
    marginBottom: 25,
  },
  announcementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  announcementButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  emergencySection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 20,
    textAlign: 'center',
  },
  emergencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emergencyCard: {
    width: (width - 60) / 2,
    aspectRatio: 1,
    borderRadius: 16,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  emergencyIconContainer: {
    marginBottom: 12,
  },
  emergencyLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  settingsSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  logoutButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  required: {
    color: '#e74c3c',
  },
  input: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    padding: 15,
    fontSize: 16,
    color: COLORS.text,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 15,
    backgroundColor: '#F7FAFC',
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: COLORS.white,
    marginTop: 5,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: COLORS.text,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: COLORS.textSecondary,
  },
  imageUploadContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  imageUploadButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
  },
  imageUploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
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
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  changeImageText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  locationButtonsContainer: {
    marginBottom: 15,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  locationButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  orText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 300,
    marginTop: 10,
    marginBottom: 30,
  },
  mapWebView: {
    flex: 1,
  },
  locationCoords: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

const modalStyles = StyleSheet.create({
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
  dropdown: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  dropdownPlaceholder: {
    color: '#999',
    fontSize: 16,
  },
  dropdownSelectedText: {
    color: COLORS.text,
    fontSize: 16,
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

const successModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  button: {
    backgroundColor: COLORS.success,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});