// components/ImageUploader.js - Cross-Platform (Web + Mobile)
import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from './theme/theme';

export default function ImageUploader({ pickedImage, onPickImage, onRemoveImage }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleWebImagePick = (useCamera) => {
    if (Platform.OS === 'web') {
      if (useCamera) {
        // Open camera on web
        if (cameraInputRef.current) {
          cameraInputRef.current.click();
        }
      } else {
        // Open file picker on web
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }
    } else {
      // Mobile: use the existing onPickImage function
      onPickImage(useCamera);
    }
  };

  const handleFileChange = (event, isCamera = false) => {
    const file = event.target.files[0];
    if (file) {
      // Create a local URL for the image
      const imageUrl = URL.createObjectURL(file);
      
      // Call the onPickImage callback with the image URL
      // You might need to modify your parent component to handle this
      if (onPickImage) {
        onPickImage(imageUrl, file, isCamera);
      }
    }
  };

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Add Photo (Optional)</Text>
      
      {/* Hidden file inputs for web */}
      {Platform.OS === 'web' && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleFileChange(e, false)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => handleFileChange(e, true)}
          />
        </>
      )}

      {pickedImage ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: pickedImage }} style={styles.imagePreview} />
          <TouchableOpacity 
            style={styles.changeImageButton}
            onPress={onRemoveImage}
          >
            <Text style={styles.changeImageText}>Change Photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.imageUploadContainer}>
          <TouchableOpacity 
            style={styles.imageUploadButton} 
            onPress={() => handleWebImagePick(true)}
          >
            <FontAwesome5 name="camera" size={24} color={COLORS.primary} />
            <Text style={styles.imageUploadText}>
              {Platform.OS === 'web' ? 'Use Camera' : 'Take Photo'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.imageUploadButton} 
            onPress={() => handleWebImagePick(false)}
          >
            <FontAwesome5 name="image" size={24} color={COLORS.primary} />
            <Text style={styles.imageUploadText}>
              {Platform.OS === 'web' ? 'Upload Photo' : 'From Gallery'}
            </Text>
          </TouchableOpacity>
        </View>
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
});