// components/ImageUploader.js
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from './theme/theme';

export default function ImageUploader({ pickedImage, onPickImage, onRemoveImage }) {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Add Photo (Optional)</Text>
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
            onPress={() => onPickImage(true)}
          >
            <FontAwesome5 name="camera" size={24} color={COLORS.primary} />
            <Text style={styles.imageUploadText}>Take Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.imageUploadButton} 
            onPress={() => onPickImage(false)}
          >
            <FontAwesome5 name="image" size={24} color={COLORS.primary} />
            <Text style={styles.imageUploadText}>From Gallery</Text>
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