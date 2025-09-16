// components/ReportForm.js
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from './theme/theme';

export default function ReportForm({ 
  selectedType, 
  formData, 
  setFormData, 
  crimeTypes, 
  accidentTypes, 
  loadingTypes 
}) {
  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const renderTypeDropdown = (type, types, selectedValue, onSelect, loading) => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading {type} types...</Text>
        </View>
      );
    }

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.label}>
          Select Type of {type.charAt(0).toUpperCase() + type.slice(1)} <Text style={styles.required}>*</Text>
        </Text>
        <Dropdown
          style={styles.dropdown}
          data={types.map(item => ({ label: item.name, value: item.name }))}
          labelField="label"
          valueField="value"
          placeholder={`Choose ${type} type...`}
          placeholderStyle={styles.dropdownPlaceholder}
          selectedTextStyle={styles.dropdownSelectedText}
          value={selectedValue}
          onChange={(item) => onSelect(item.value)}
        />
      </View>
    );
  };

  const renderTextArea = (label, value, onChangeText, placeholder, required = false) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        style={styles.textArea}
        multiline
        numberOfLines={3}
        placeholder={placeholder}
        value={value || ''}
        onChangeText={onChangeText}
        placeholderTextColor="#999"
      />
    </View>
  );

  const renderTextInput = (label, value, onChangeText, placeholder, keyboardType = 'default') => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value || ''}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor="#999"
      />
    </View>
  );

  return (
    <View>
      {/* Crime Type Selection */}
      {selectedType?.toLowerCase() === 'crime' && (
        <>
          {renderTypeDropdown(
            'crime', 
            crimeTypes, 
            formData.crimeType, 
            (value) => updateFormData('crimeType', value), 
            loadingTypes
          )}
          {renderTextArea(
            'Crime Description',
            formData.crimeDescription,
            (text) => updateFormData('crimeDescription', text),
            'Please provide details about the crime incident...'
          )}
        </>
      )}

      {/* Accident Type Selection */}
      {selectedType?.toLowerCase() === 'accident' && (
        <>
          {renderTypeDropdown(
            'accident', 
            accidentTypes, 
            formData.accidentType, 
            (value) => updateFormData('accidentType', value), 
            loadingTypes
          )}
          {renderTextArea(
            'Accident Description',
            formData.accidentDescription,
            (text) => updateFormData('accidentDescription', text),
            'Please provide details about the accident...'
          )}
        </>
      )}

      {/* Medical Fields */}
      {selectedType?.toLowerCase() === 'medical' && (
        <>
          {renderTextInput(
            'Patient Name',
            formData.patientName,
            (text) => updateFormData('patientName', text),
            "Enter patient's full name"
          )}
          {renderTextInput(
            'Age',
            formData.patientAge,
            (text) => updateFormData('patientAge', text),
            'Enter age',
            'numeric'
          )}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Gender</Text>
            <Dropdown
              style={styles.dropdown}
              data={[
                { label: 'Male', value: 'Male' },
                { label: 'Female', value: 'Female' },
              ]}
              labelField="label"
              valueField="value"
              placeholder="Select gender"
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              value={formData.patientGender}
              onChange={(item) => updateFormData('patientGender', item.value)}
            />
          </View>
          {renderTextArea(
            'Complaints',
            formData.patientComplaints,
            (text) => updateFormData('patientComplaints', text),
            "Describe patient's complaints"
          )}
        </>
      )}

      {/* Fire Description */}
      {selectedType?.toLowerCase() === 'fire' && 
        renderTextArea(
          'Fire Description',
          formData.fireDescription,
          (text) => updateFormData('fireDescription', text),
          'Describe the fire incident'
        )
      }

      {/* Garbage Description */}
      {selectedType?.toLowerCase() === 'garbage' && 
        renderTextArea(
          'Garbage Issue Description',
          formData.garbageDescription,
          (text) => updateFormData('garbageDescription', text),
          'Describe the garbage-related issue (e.g., illegal dumping, overflowing bins, etc.)...'
        )
      }

      {/* Noise Description */}
      {selectedType?.toLowerCase() === 'noise' && 
        renderTextArea(
          'Noise Complaint Description',
          formData.noiseDescription,
          (text) => updateFormData('noiseDescription', text),
          'Describe the noise issue (e.g., loud music, construction noise, etc.)...'
        )
      }

      {/* Others - Custom Emergency Text */}
      {selectedType?.toLowerCase() === 'others' && 
        renderTextArea(
          'Describe the emergency',
          formData.customText,
          (text) => updateFormData('customText', text),
          'Please describe the emergency situation...',
          true
        )
      }
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
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: COLORS.textSecondary,
  },
});