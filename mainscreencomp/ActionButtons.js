// components/ActionButtons.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from './theme/theme';

export default function ActionButtons({ onGoToAnnouncements, onShowReportTracking }) {
  return (
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
        onPress={onShowReportTracking}
      >
        <FontAwesome5 name="clipboard-list" size={18} color={COLORS.white} />
        <Text style={styles.trackReportsButtonText}>Track My Reports</Text>
      </TouchableOpacity>
    </View>
  );
}

ActionButtons.LogoutButton = function LogoutButton({ onLogout, loading }) {
  return (
    <TouchableOpacity 
      style={styles.logoutButton} 
      onPress={onLogout}
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
  );
};

const styles = StyleSheet.create({
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
});