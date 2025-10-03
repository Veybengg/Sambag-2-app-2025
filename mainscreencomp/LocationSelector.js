// components/LocationSelector.js - Cross-Platform (Web + Mobile)
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS } from './theme/theme';

// Only import WebView on mobile platforms
let WebView;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

// Cross-platform alert function
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function LocationSelector({ locationObj, setLocationObj, webViewRef }) {
  const iframeRef = useRef(null);
  
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
                
                var message = JSON.stringify({
                    type: 'locationSelected',
                    latitude: e.latlng.lat,
                    longitude: e.latlng.lng
                });
                
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(message);
                } else {
                    window.parent.postMessage(message, '*');
                }
            });

            window.addEventListener('message', function(event) {
                try {
                    var data;
                    if (typeof event.data === 'string') {
                        data = JSON.parse(event.data);
                    } else {
                        data = event.data;
                    }
                    
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
                    }
                } catch (e) {
                    console.log('Error parsing message:', e);
                }
            });
        </script>
    </body>
    </html>
    `;
  };

  const handleUseCurrentLocation = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web: Use browser geolocation API
        if (!navigator.geolocation) {
          showAlert('Not Supported', 'Geolocation is not supported by your browser. Please select location manually on the map.');
          return;
        }

        // Request location from browser
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            
            setLocationObj(newLocation);
            
            setTimeout(() => {
              const message = JSON.stringify({
                type: 'updateLocation',
                latitude: newLocation.latitude,
                longitude: newLocation.longitude
              });
              
              if (iframeRef.current && iframeRef.current.contentWindow) {
                iframeRef.current.contentWindow.postMessage(message, '*');
              }
            }, 500);

            showAlert('Location Found!', 'Your location has been set.');
          },
          (error) => {
            console.warn('Browser location error:', error);
            let errorMessage = 'Could not get your current location. ';
            
            if (error.code === 1) {
              errorMessage += 'Location permission was denied. Please allow location access in your browser settings and try again, or select location manually on the map.';
            } else if (error.code === 2) {
              errorMessage += 'Location unavailable. Please check your device settings and try again, or select location manually on the map.';
            } else if (error.code === 3) {
              errorMessage += 'Location request timed out. Please try again or select location manually on the map.';
            } else {
              errorMessage += 'Please try again or select location manually on the map.';
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
          showAlert('Location permission required', 'Please enable location permissions to use this feature.');
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
          const message = JSON.stringify({
            type: 'updateLocation',
            latitude: newLocation.latitude,
            longitude: newLocation.longitude
          });
          
          if (webViewRef.current) {
            webViewRef.current.postMessage(message);
          }
        }, 500);

        showAlert('Location Found!', 'Your location has been set.');
      }
      
    } catch (e) {
      console.warn('Location error:', e);
      showAlert('Location Error', 'Could not get your current location. Please try again or select location manually on the map.');
    }
  };

  const handleMapMessage = (event) => {
    try {
      let data;
      
      if (Platform.OS === 'web') {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } else {
        data = JSON.parse(event.nativeEvent.data);
      }
      
      if (data.type === 'locationSelected') {
        setLocationObj({
          latitude: data.latitude,
          longitude: data.longitude
        });
      }
    } catch (e) {
      // Ignore parse errors
    }
  };

  // Listen for web messages if on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      window.addEventListener('message', handleMapMessage);
      return () => window.removeEventListener('message', handleMapMessage);
    }
  }, []);

  const mapHTML = generateMapHTML(
    locationObj?.latitude || 10.3064781, 
    locationObj?.longitude || 123.8902196,
    locationObj?.latitude,
    locationObj?.longitude
  );

  return (
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
        {Platform.OS === 'web' ? (
          // Use iframe on web
          <iframe
            ref={iframeRef}
            srcDoc={mapHTML}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            title="Location Map"
          />
        ) : (
          // Use WebView on mobile
          <WebView
            ref={webViewRef}
            source={{ html: mapHTML }}
            style={styles.mapWebView}
            onMessage={handleMapMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            originWhitelist={['*']}
          />
        )}
      </View>
      
      {locationObj && (
        <Text style={styles.locationCoords}>
          Selected: {locationObj.latitude.toFixed(5)}, {locationObj.longitude.toFixed(5)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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