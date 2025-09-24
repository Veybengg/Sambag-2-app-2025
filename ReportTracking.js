import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  Image,
  SafeAreaView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { ref as rdbRef, get, onValue, off } from 'firebase/database';
import { realtimeDb } from './firebase'; // Adjust import path
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#87CEEB',
  secondary: '#FFD700',
  background: '#F8FAFC',
  white: '#FFFFFF',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  text: '#1F2937',
  textSecondary: '#6B7280',
  cardShadow: 'rgba(0,0,0,0.1)',
  border: '#E5E7EB',
};

const STATUS_CONFIG = {
  'Pending': { 
    color: '#9CA3AF', 
    icon: 'clock',
    step: 0,
    label: 'Pending'
  },
  'Acknowledged': { 
    color: '#3B82F6', 
    icon: 'check-circle',
    step: 1,
    label: 'Acknowledged'
  },
  'In Progress': { 
    color: '#F59E0B', 
    icon: 'spinner',
    step: 2,
    label: 'In Progress'
  },
  'Resolved': { 
    color: '#10B981', 
    icon: 'check-double',
    step: 3,
    label: 'Resolved'
  },
  'Rejected': { 
    color: '#EF4444', 
    icon: 'times-circle',
    step: 3,
    label: 'Rejected'
  }
};

const RESOURCE_ICONS = {
  'Barangay Tanod': 'shield-alt',
  'Fire Truck': 'fire-extinguisher',
  'Ambulance': 'ambulance',
  'Police': 'user-shield',
  'LGU Support': 'hands-helping'
};

export default function ReportTracking({ visible, onClose, userId, userName }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportDetails, setShowReportDetails] = useState(false);
  const [listeners, setListeners] = useState([]);

  useEffect(() => {
    if (visible) {
      initializeData();
    } else {
      cleanupListeners();
    }

    return () => {
      cleanupListeners();
    };
  }, [visible]);

  // Add this NEW useEffect after the existing one
useEffect(() => {
  if (selectedReport && showReportDetails) {
    // Find the updated version of this report from the reports array
    const updatedReport = reports.find(report => report.id === selectedReport.id);
    if (updatedReport) {
      setSelectedReport(updatedReport);
    }
  }
}, [reports, showReportDetails]);

  const getDeviceId = async () => {
    try {
      const stored = await AsyncStorage.getItem('deviceId');
      return stored;
    } catch (e) {
      console.warn('device id error', e);
      return 'unknown';
    }
  };

  const initializeData = async () => {
    setLoading(true);
    await loadUserReports();
    setupRealtimeListeners();
  };

 const parseDate = (dateString) => {
  if (!dateString) return new Date(0);
  return new Date(dateString);
};

const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  
  // Handle ISO format with Z like "2025-09-18T19:35:13.886Z"
  if (typeof dateString === 'string' && dateString.includes('T') && dateString.includes('Z')) {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  }
  
  // Handle datetime-local format like "2025-09-19T04:12"
  if (typeof dateString === 'string' && dateString.includes('T') && !dateString.includes('Z')) {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  }
  
  // Handle Firebase format like "9/19/2025, 3:23:41 AM"
  const parts = dateString.split(', ');
  if (parts.length !== 2) return dateString;
  
  const datePart = parts[0]; // "9/19/2025"
  const timePart = parts[1]; // "3:23:41 AM"
  
  const dateComponents = datePart.split('/');
  if (dateComponents.length !== 3) return dateString;
  
  const month = parseInt(dateComponents[0]);
  const day = parseInt(dateComponents[1]);
  const year = dateComponents[2];
  
  const months = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return `${months[month]} ${day}, ${year}, ${timePart}`;
};

  const loadUserReports = async () => {
    try {
      const deviceId = userId || await getDeviceId();
      if (!deviceId) return;
      
      // Load from active reports
      const reportsRef = rdbRef(realtimeDb, 'led/reports');
      const activeSnapshot = await get(reportsRef);
      
      // Load from history
      const historyRef = rdbRef(realtimeDb, 'History');
      const historySnapshot = await get(historyRef);
      
      const userReports = [];
      
      // Process active reports
      if (activeSnapshot.exists()) {
        const activeData = activeSnapshot.val();
        Object.keys(activeData).forEach(key => {
          const report = activeData[key];
          if (report.deviceId === deviceId) {
            userReports.push({
              id: key,
              ...report,
              isActive: true
            });
          }
        });
      }
      
      // Process history reports
      if (historySnapshot.exists()) {
        const historyData = historySnapshot.val();
        Object.keys(historyData).forEach(key => {
          const report = historyData[key];
          if (report.deviceId === deviceId) {
            userReports.push({
              id: key,
              ...report,
              isActive: false
            });
          }
        });
      }
      
      // Sort by timestamp (newest first)
      userReports.sort((a, b) => {
        const dateA = parseDate(a.timestamp);
        const dateB = parseDate(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });
      
      setReports(userReports);
    } catch (error) {
      console.error('Error loading user reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const setupRealtimeListeners = async () => {
    const deviceId = userId || await getDeviceId();
    if (!deviceId) return;

    cleanupListeners();
    const newListeners = [];

    try {
      // Listen to active reports
      const reportsRef = rdbRef(realtimeDb, 'led/reports');
      const unsubscribeReports = onValue(reportsRef, (snapshot) => {
        updateActiveReports(snapshot, deviceId);
      }, (error) => {
        console.error("Error listening to reports:", error);
      });
      newListeners.push(() => off(reportsRef));

      // Listen to history
      const historyRef = rdbRef(realtimeDb, 'History');
      const unsubscribeHistory = onValue(historyRef, (snapshot) => {
        updateHistoryReports(snapshot, deviceId);
      }, (error) => {
        console.error("Error listening to history:", error);
      });
      newListeners.push(() => off(historyRef));

      setListeners(newListeners);
    } catch (error) {
      console.error('Error setting up listeners:', error);
    }
  };

  const updateActiveReports = (snapshot, deviceId) => {
    const activeReports = [];
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach(key => {
        const report = data[key];
        if (report.deviceId === deviceId) {
          activeReports.push({
            id: key,
            ...report,
            isActive: true
          });
        }
      });
    }

    setReports(prevReports => {
      const historyReports = prevReports.filter(report => !report.isActive);
      const allReports = [...historyReports, ...activeReports];
      
      const sortedReports = allReports.sort((a, b) => {
        const dateA = parseDate(a.timestamp);
        const dateB = parseDate(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });

      // Update selected report if it's currently being viewed and is active
      if (selectedReport && selectedReport.isActive) {
        const updatedReport = activeReports.find(report => report.id === selectedReport.id);
        if (updatedReport) {
          setSelectedReport(updatedReport);
        }
      }

      return sortedReports;
    });
  };

  const updateHistoryReports = (snapshot, deviceId) => {
    const historyReports = [];
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach(key => {
        const report = data[key];
        if (report.deviceId === deviceId) {
          historyReports.push({
            id: key,
            ...report,
            isActive: false
          });
        }
      });
    }

    setReports(prevReports => {
      const activeReports = prevReports.filter(report => report.isActive);
      const allReports = [...activeReports, ...historyReports];
      
      const sortedReports = allReports.sort((a, b) => {
        const dateA = parseDate(a.timestamp);
        const dateB = parseDate(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });
      
      // Update selected report if it's currently being viewed and is in history
      if (selectedReport && !selectedReport.isActive) {
        const updatedReport = historyReports.find(report => report.id === selectedReport.id);
        if (updatedReport) {
          setSelectedReport(updatedReport);
        }
      }

      return sortedReports;
    });
  };

  const cleanupListeners = () => {
    listeners.forEach(cleanup => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    });
    setListeners([]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserReports();
  };

  const renderProgressSteps = (currentStatus) => {
    const steps = ['Pending', 'Acknowledged', 'In Progress'];
    const currentStep = STATUS_CONFIG[currentStatus]?.step || 0;
    const isRejected = currentStatus === 'Rejected';
    const isResolved = currentStatus === 'Resolved';
    
    if (isRejected) {
      return (
        <View style={styles.progressContainer}>
          <View style={styles.progressSteps}>
            <View style={styles.progressStep}>
              <View style={[styles.progressStepCircle, { backgroundColor: COLORS.danger }]}>
                <FontAwesome5 name="times" size={12} color={COLORS.white} />
              </View>
              <Text style={[styles.progressStepText, { color: COLORS.danger }]}>Rejected</Text>
            </View>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.progressContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.progressSteps}>
            {steps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              const isResolvedStep = isResolved && index === steps.length - 1;
              
              return (
                <React.Fragment key={step}>
                  <View style={styles.progressStep}>
                    <View style={[
                      styles.progressStepCircle,
                      {
                        backgroundColor: isCompleted || isCurrent ? 
                          (isResolvedStep ? COLORS.success : COLORS.info) : 
                          COLORS.border
                      }
                    ]}>
                      {isCompleted ? (
                        <FontAwesome5 name="check" size={10} color={COLORS.white} />
                      ) : isCurrent ? (
                        <View style={styles.currentStepDot} />
                      ) : (
                        <View style={styles.pendingStepDot} />
                      )}
                    </View>
                    <Text style={[
                      styles.progressStepText,
                      {
                        color: isCompleted || isCurrent ? COLORS.text : COLORS.textSecondary,
                        fontWeight: isCurrent ? '600' : '400'
                      }
                    ]}>
                      {step}
                    </Text>
                  </View>
                  
                  {index < steps.length - 1 && (
                    <View style={[
                      styles.progressLine,
                      {
                        backgroundColor: isCompleted ? COLORS.info : COLORS.border
                      }
                    ]} />
                  )}
                </React.Fragment>
              );
            })}
            
            {isResolved && (
              <>
                <View style={[styles.progressLine, { backgroundColor: COLORS.success }]} />
                <View style={styles.progressStep}>
                  <View style={[styles.progressStepCircle, { backgroundColor: COLORS.success }]}>
                    <FontAwesome5 name="check-double" size={10} color={COLORS.white} />
                  </View>
                  <Text style={[styles.progressStepText, { color: COLORS.success, fontWeight: '600' }]}>
                    Resolved
                  </Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderResourceCard = (resource) => {
    const icon = RESOURCE_ICONS[resource] || 'tools';
    
    return (
      <View key={resource} style={styles.resourceCard}>
        <FontAwesome5 name={icon} size={16} color={COLORS.info} />
        <Text style={styles.resourceText}>{resource}</Text>
      </View>
    );
  };

  const renderReportCard = (report) => {
    const status = report.reportStatus || 'Pending';
    const statusConfig = STATUS_CONFIG[status];
    
    return (
      <TouchableOpacity
        key={report.id}
        style={styles.reportCard}
        activeOpacity={0.7}
        delayPressIn={50}
        onPress={() => {
          setSelectedReport(report);
          setShowReportDetails(true);
        }}
      >
        <View style={styles.reportHeader}>
          <View style={styles.reportType}>
            <Text style={styles.reportTypeText}>{report.type}</Text>
            {!report.isActive && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>Completed</Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
            <FontAwesome5 name={statusConfig.icon} size={12} color={COLORS.white} />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>
        
        <Text style={styles.reportTimestamp}>
          Submitted: {formatDateTime(report.timestamp)}
        </Text>
        
        {report.acknowledgmentTime && (
          <Text style={styles.reportAcknowledged}>
            Acknowledged: {formatDateTime(report.acknowledgmentTime)}
          </Text>
        )}
        
        {report.resourcesDeployed && report.resourcesDeployed.length > 0 && (
          <View style={styles.resourcesPreview}>
            <Text style={styles.resourcesPreviewText}>
              Resources: {report.resourcesDeployed.join(', ')}
            </Text>
          </View>
        )}
        
        <View style={styles.reportFooter}>
          <Text style={styles.tapToView}>Tap to view details</Text>
          <FontAwesome5 name="chevron-right" size={12} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderReportDetails = () => {
    if (!selectedReport) return null;
    
    const status = selectedReport.reportStatus || 'Pending';
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showReportDetails}
        onRequestClose={() => setShowReportDetails(false)}
      >
        <View style={styles.detailsBackdrop}>
          <View style={styles.detailsContainer}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.detailsHeader}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setShowReportDetails(false)}
                >
                  <FontAwesome5 name="arrow-left" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.detailsTitle}>Report Details</Text>
                <View style={{ width: 40 }} />
              </View>
              
              <ScrollView 
                style={styles.detailsContent}
                contentContainerStyle={{ paddingBottom: 30 }}
                showsVerticalScrollIndicator={false}
                bounces={true}
              >
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Current Status</Text>
                  {renderProgressSteps(status)}
                  
                  {selectedReport.acknowledgmentTime && (
                    <View style={styles.timestampInfo}>
                      <FontAwesome5 name="clock" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.timestampText}>
                        Acknowledged: {formatDateTime(selectedReport.acknowledgmentTime)}
                      </Text>
                    </View>
                  )}
                  
                  {selectedReport.responseStartTime && (
                    <View style={styles.timestampInfo}>
                      <FontAwesome5 name="play" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.timestampText}>
                        Response Started: {formatDateTime(selectedReport.responseStartTime)}
                      </Text>
                    </View>
                  )}
                  
                  {selectedReport.responseCompletedTime && (
                    <View style={styles.timestampInfo}>
                      <FontAwesome5 name="check" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.timestampText}>
                        Response Completed: {formatDateTime(selectedReport.responseCompletedTime)}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Report Information</Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Type</Text>
                      <Text style={styles.infoValue}>{selectedReport.type}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Submitted</Text>
                      <Text style={styles.infoValue}>{formatDateTime(selectedReport.timestamp)}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Location</Text>
                      <Text style={styles.infoValue} numberOfLines={2}>
                        {selectedReport.location}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {selectedReport.resourcesDeployed && selectedReport.resourcesDeployed.length > 0 && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Resources Deployed</Text>
                    <View style={styles.resourcesContainer}>
                      {selectedReport.resourcesDeployed.map(resource => renderResourceCard(resource))}
                    </View>
                  </View>
                )}
                
                {selectedReport.assignedPersonnel && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Assigned Personnel</Text>
                    <View style={styles.personnelCard}>
                      <Image
                        source={{ 
                          uri: selectedReport.assignedPersonnel.profileImageUrl || 
                               'https://via.placeholder.com/40x40.png?text=?' 
                        }}
                        style={styles.personnelImage}
                      />
                      <View style={styles.personnelInfo}>
                        <Text style={styles.personnelName}>
                          {selectedReport.assignedPersonnel.firstName} {selectedReport.assignedPersonnel.lastName}
                        </Text>
                        <Text style={styles.personnelRole}>
                          {selectedReport.assignedPersonnel.rolename || 'Officer'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
                
                {selectedReport.actionsTaken && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Actions Taken</Text>
                    <Text style={styles.actionsText}>{selectedReport.actionsTaken}</Text>
                  </View>
                )}
                
                {(selectedReport.outcome || selectedReport.remarks) && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Resolution Details</Text>
                    {selectedReport.outcome && (
                      <View style={styles.outcomeContainer}>
                        <Text style={styles.infoLabel}>Outcome</Text>
                        <Text style={styles.outcomeText}>{selectedReport.outcome}</Text>
                      </View>
                    )}
                    {selectedReport.remarks && (
                      <View style={styles.remarksContainer}>
                        <Text style={styles.infoLabel}>Remarks</Text>
                        <Text style={styles.remarksText}>{selectedReport.remarks}</Text>
                      </View>
                    )}
                  </View>
                )}
                
                {selectedReport.imageUrl && selectedReport.imageUrl !== 'No image provided' && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Submitted Image</Text>
                    <Image
                      source={{ uri: selectedReport.imageUrl }}
                      style={styles.reportImage}
                      resizeMode="cover"
                    />
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <FontAwesome5 name="times" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.title}>My Reports</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                <FontAwesome5 name="sync-alt" size={18} color={COLORS.info} />
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading your reports...</Text>
              </View>
            ) : reports.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FontAwesome5 name="clipboard-list" size={60} color={COLORS.textSecondary} />
                <Text style={styles.emptyTitle}>No Reports Found</Text>
                <Text style={styles.emptyText}>
                  You haven't submitted any emergency reports yet.
                </Text>
              </View>
            ) : (
              <View style={styles.reportsListContainer}>
                <ScrollView
                  style={styles.reportsList}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                  }
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  bounces={true}
                >
                  <Text style={styles.reportsCount}>
                    {reports.length} report{reports.length !== 1 ? 's' : ''} found
                  </Text>
                  
                  {reports.map(renderReportCard)}
                </ScrollView>
              </View>
            )}
          </SafeAreaView>
        </View>
      </View>
      
      {renderReportDetails()}
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
    backgroundColor: COLORS.background,
    height: '95%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  reportsListContainer: {
    flex: 1,
  },
  reportsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  reportsCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginVertical: 15,
  },
  reportCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reportType: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reportTypeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginRight: 8,
  },
  completedBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  completedBadgeText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: 4,
  },
  reportTimestamp: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  reportAcknowledged: {
    fontSize: 14,
    color: COLORS.info,
    marginBottom: 8,
  },
  resourcesPreview: {
    marginBottom: 8,
  },
  resourcesPreviewText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tapToView: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  
  // Details Modal Styles
  detailsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  detailsContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  detailsSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  
  // Progress Styles
  progressContainer: {
    marginBottom: 16,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    minWidth: width - 80, // Ensure minimum width for horizontal scroll
  },
  progressStep: {
    alignItems: 'center',
    minWidth: 80, // Minimum width for each step
  },
  progressStepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentStepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.white,
  },
  pendingStepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
  },
  progressStepText: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 60,
  },
  progressLine: {
    height: 2,
    width: 30,
    marginHorizontal: 8,
  },
  timestampInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timestampText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  
  // Info Grid Styles
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
  },
  
  // Resources Styles
  resourcesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.info,
  },
  resourceText: {
    fontSize: 12,
    color: COLORS.info,
    marginLeft: 6,
    fontWeight: '600',
  },
  
  // Personnel Styles
  personnelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
  },
  personnelImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  personnelInfo: {
    flex: 1,
  },
  personnelName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  personnelRole: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  
  // Actions and Outcome Styles
  actionsText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  outcomeContainer: {
    marginBottom: 12,
  },
  outcomeText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '600',
  },
  remarksContainer: {
    marginBottom: 0,
  },
  remarksText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  
  // Report Image Styles
  reportImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
});