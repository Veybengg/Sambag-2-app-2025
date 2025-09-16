// mainscreencomp/ProfileTab.js - Modern Design Update
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { ref as rdbRef, get } from 'firebase/database';
import { realtimeDb } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReportTracking from '../ReportTracking';

const COLORS = {
  primary: '#2563eb',
  secondary: '#3b82f6', 
  accent: '#06b6d4',
  background: '#ffffff',
  surface: '#f1f5f9',
  border: '#e2e8f0',
  text: '#0f172a',
  textSecondary: '#475569',
  textLight: '#64748b',
  white: '#ffffff',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
};

export default function ProfileTab({ 
  userName, 
  userContact, 
  userIdImage, 
  onLogout, 
  loading,
  remainingSubmissions 
}) {
  const [showReportTracking, setShowReportTracking] = useState(false);
  const [totalReports, setTotalReports] = useState(0);
  const [loadingReports, setLoadingReports] = useState(true);

  // Calculate reports sent today
  const reportsToday = remainingSubmissions !== null ? (10 - remainingSubmissions) : 0;

  // Fetch total reports count
  useEffect(() => {
    fetchTotalReports();
  }, []);

  const getDeviceId = async () => {
    try {
      const stored = await AsyncStorage.getItem('deviceId');
      return stored;
    } catch (e) {
      console.warn('device id error', e);
      return 'unknown';
    }
  };

  const fetchTotalReports = async () => {
    try {
      setLoadingReports(true);
      const deviceId = await getDeviceId();
      if (!deviceId) {
        setLoadingReports(false);
        return;
      }
      
      // Load from active reports (same logic as ReportTracking.js)
      const reportsRef = rdbRef(realtimeDb, 'led/reports');
      const activeSnapshot = await get(reportsRef);
      
      // Load from history
      const historyRef = rdbRef(realtimeDb, 'History');
      const historySnapshot = await get(historyRef);
      
      let reportCount = 0;
      
      // Count active reports
      if (activeSnapshot.exists()) {
        const activeData = activeSnapshot.val();
        Object.keys(activeData).forEach(key => {
          const report = activeData[key];
          if (report.deviceId === deviceId) {
            reportCount++;
          }
        });
      }
      
      // Count history reports
      if (historySnapshot.exists()) {
        const historyData = historySnapshot.val();
        Object.keys(historyData).forEach(key => {
          const report = historyData[key];
          if (report.deviceId === deviceId) {
            reportCount++;
          }
        });
      }
      
      setTotalReports(reportCount);
    } catch (error) {
      console.error('Error fetching total reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleLogoutPress = () => {
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
          onPress: onLogout,
        },
      ]
    );
  };

  const InfoItem = ({ icon, label, value, iconColor = COLORS.primary }) => (
    <View style={styles.infoItem}>
      <View style={styles.iconContainer}>
        <FontAwesome5 name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
      </View>
    </View>
  );

  const MenuItem = ({ icon, title, onPress, iconColor = COLORS.primary, hasChevron = true }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={loading}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: `${iconColor}15` }]}>
        <FontAwesome5 name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.menuItemText}>{title}</Text>
      {hasChevron && (
        <FontAwesome5 name="chevron-right" size={16} color={COLORS.textLight} />
      )}
    </TouchableOpacity>
  );

  const getVerificationStatus = () => {
    if (userIdImage) {
      return { text: 'Verified Account', color: COLORS.success, icon: 'check-circle' };
    }
    return { text: 'Pending Verification', color: COLORS.warning, icon: 'clock' };
  };

  const verification = getVerificationStatus();

  return (
    <>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section with Avatar */}
        <View style={styles.headerSection}>
          {/* User Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <FontAwesome5 
                name="user" 
                size={32} 
                color={COLORS.white} 
              />
            </View>
            {/* Verification Badge */}
            <View style={[styles.verificationBadge, { backgroundColor: verification.color }]}>
              <FontAwesome5 name={verification.icon} size={12} color={COLORS.white} />
            </View>
          </View>
          
          {/* User Name */}
          <Text style={styles.userName}>{userName || 'Anonymous User'}</Text>
          <Text style={[styles.verificationText, { color: verification.color }]}>
            {verification.text}
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <FontAwesome5 name="exclamation-triangle" size={20} color={COLORS.warning} />
            <Text style={styles.statNumber}>{reportsToday}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <FontAwesome5 name="list-alt" size={20} color={COLORS.primary} />
            <Text style={styles.statNumber}>
              {loadingReports ? '...' : totalReports}
            </Text>
            <Text style={styles.statLabel}>Total Reports</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <FontAwesome5 name="clock" size={20} color={COLORS.success} />
            <Text style={styles.statNumber}>{remainingSubmissions ?? 10}</Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.card}>
            <InfoItem 
              icon="user" 
              label="Full Name" 
              value={userName}
              iconColor={COLORS.primary}
            />
            <InfoItem 
              icon="phone" 
              label="Contact Number" 
              value={userContact}
              iconColor={COLORS.accent}
            />
            <InfoItem 
              icon="shield-alt" 
              label="Account Status" 
              value={verification.text}
              iconColor={verification.color}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.card}>
            <MenuItem
              icon="list-alt"
              title="Track My Reports"
              onPress={() => setShowReportTracking(true)}
              iconColor={COLORS.primary}
            />
            <MenuItem
              icon="edit"
              title="Edit Profile"
              onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available soon.')}
              iconColor={COLORS.accent}
            />
          </View>
        </View>

        {/* Support & Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Settings</Text>
          <View style={styles.card}>
            <MenuItem
              icon="cog"
              title="App Settings"
              onPress={() => Alert.alert('Coming Soon', 'Settings will be available soon.')}
              iconColor={COLORS.textSecondary}
            />
            <MenuItem
              icon="question-circle"
              title="Help & Support"
              onPress={() => Alert.alert('Help & Support', 'Contact your local emergency services for assistance.')}
              iconColor={COLORS.textSecondary}
            />
            <MenuItem
              icon="info-circle"
              title="About App"
              onPress={() => Alert.alert('About', 'Emergency Reporting System v1.0\nBuilt for community safety')}
              iconColor={COLORS.textSecondary}
            />
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogoutPress}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <FontAwesome5 name="sign-out-alt" size={18} color={COLORS.white} />
                <Text style={styles.logoutText}>Sign Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Emergency Reporting System</Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Report Tracking Modal */}
      {showReportTracking && (
        <ReportTracking
          visible={showReportTracking}
          onClose={() => setShowReportTracking(false)}
          userId={null}
          userName={userName}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  verificationBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: 'rgba(84, 87, 252, 1)',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  verificationText: {
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginHorizontal: 20,
    marginBottom: 12,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '700',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});