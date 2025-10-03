import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  ActivityIndicator, 
  Modal, 
  Dimensions, 
  ScrollView,
  StyleSheet,
  Animated,
  TextInput,
  Platform
} from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import { FontAwesome5 } from '@expo/vector-icons';
import { db } from './firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, increment, where } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CAROUSEL_ITEM_WIDTH = screenWidth * 0.7;
const CAROUSEL_SPACING = 20;

const COLORS = {
  primary: '#2563eb',
  secondary: '#3b82f6',
  accent: '#06b6d4',
  background: '#ffffff',
  surface: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  textSecondary: '#64748b',
  textLight: '#94a3b8',
  white: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  like: '#ff3040',
  gradient: ['#667eea', '#764ba2'],
};


export default function Announcements({ onBack }) {
  const [activeTab, setActiveTab] = useState('Feed');
  
  // Updated state for different data sources
  const [posts, setPosts] = useState([]); // From newsfeeds collection
  const [featuredPosts, setFeaturedPosts] = useState([]); // From systemAnnouncements collection
  const [allAnnouncements, setAllAnnouncements] = useState([]); // All announcements for Announcements tab
  const [events, setEvents] = useState([]); // From calendarEvents collection
  const [sponsors, setSponsors] = useState([]); // From sponsors collection
  const [markedDates, setMarkedDates] = useState({});
  
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [loadingSponsors, setLoadingSponsors] = useState(true);

  // Modal states
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [selectedPostData, setSelectedPostData] = useState(null);
  const [hasSeenSponsors, setHasSeenSponsors] = useState(false);
  
  // Sponsor modal states
  const [sponsorModalVisible, setSponsorModalVisible] = useState(false);
  const [selectedEventSponsors, setSelectedEventSponsors] = useState([]);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  
  // NEW: Sponsor popup states
  const [sponsorPopupVisible, setSponsorPopupVisible] = useState(false);
  const [currentSponsorIndex, setCurrentSponsorIndex] = useState(0);
  const [activeSponsors, setActiveSponsors] = useState([]);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(false);
  const selectedPost = posts.find(p => p.id === selectedPostId);

  // Likes state (track which posts current user liked)
  const [userLikes, setUserLikes] = useState(new Set());

  const scrollX = useRef(new Animated.Value(0)).current;
  const carouselRef = useRef(null);
  const sponsorTimerRef = useRef(null);

  // Load current user
  useEffect(() => {
    loadCurrentUser();
  }, []);

 // NEW: Fetch sponsors and filter active ones
useEffect(() => {
  const checkSponsorsSeen = async () => {
    try {
      const seen = await AsyncStorage.getItem('sponsors_seen_this_session');
      setHasSeenSponsors(seen === 'true');
    } catch (error) {
      console.error('Error checking sponsors seen:', error);
    }
  };

  checkSponsorsSeen();

  const q = query(collection(db, 'sponsors'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const fetchedSponsors = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    
    // Filter active sponsors (not expired)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const active = fetchedSponsors.filter(sponsor => {
      const toDate = new Date(sponsor.toDate);
      toDate.setHours(0, 0, 0, 0);
      return toDate >= today;
    });
    
    setSponsors(fetchedSponsors);
    setActiveSponsors(active);
    setLoadingSponsors(false);
  });
  return () => unsubscribe();
}, []);

// Show sponsor popup only if not seen this session
useEffect(() => {
  if (!loadingSponsors && activeSponsors.length > 0 && !hasSeenSponsors) {
    setSponsorPopupVisible(true);
  }
}, [loadingSponsors, activeSponsors.length, hasSeenSponsors]);

// Clear sponsor seen flag when component unmounts (app close)
useEffect(() => {
  return () => {
    AsyncStorage.removeItem('sponsors_seen_this_session');
  };
}, []);

  // NEW: Sponsor rotation timer
  useEffect(() => {
    if (sponsorPopupVisible && activeSponsors.length > 0) {
      sponsorTimerRef.current = setInterval(() => {
        setCurrentSponsorIndex((prev) => (prev + 1) % activeSponsors.length);
      }, 5000); // 5 seconds

      return () => {
        if (sponsorTimerRef.current) {
          clearInterval(sponsorTimerRef.current);
        }
      };
    }
  }, [sponsorPopupVisible, activeSponsors.length]);

  const getCustomDateStyles = () => {
    const customStyles = [];
    
    events.forEach(event => {
      if (event.date) {
        const eventDate = new Date(event.date + 'T00:00:00');
        customStyles.push({
          date: eventDate,
          style: {
            backgroundColor: COLORS.primary,
            borderRadius: 15,
          },
          textStyle: {
            color: COLORS.white,
            fontWeight: '600',
          },
          containerStyle: [],
          allowDisabled: true,
        });
      }
    });
    
    return customStyles;
  };

  useEffect(() => {
    if (!selectedPostData?.id || !selectedPostData?.source) return;

    const postRef = doc(db, selectedPostData.source, selectedPostData.id);
    const unsubscribe = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        setSelectedPostData({ id: docSnap.id, source: selectedPostData.source, ...docSnap.data() });
      }
    });

    return () => unsubscribe();
  }, [selectedPostData?.id, selectedPostData?.source]);

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser({
          id: user.name || 'Anonymous User',
          name: user.name || 'Anonymous User',
          avatar: user.imageUrl || null
        });
        
        const likedPosts = await AsyncStorage.getItem(`user_likes_${user.name}`);
        if (likedPosts) {
          setUserLikes(new Set(JSON.parse(likedPosts)));
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const saveUserLikes = async (likes) => {
    try {
      if (currentUser && currentUser.name) {
        await AsyncStorage.setItem(`user_likes_${currentUser.name}`, JSON.stringify([...likes]));
      }
    } catch (error) {
      console.error('Error saving likes:', error);
    }
  };

  // Fetch newsfeeds for Feed posts
  useEffect(() => {
    const q = query(collection(db, 'newsfeeds'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({ 
        id: doc.id,
        source: 'newsfeeds', 
        ...doc.data(),
        likes: doc.data().likes || [],
        likesCount: doc.data().likesCount || 0,
        comments: doc.data().comments || [],
        commentsCount: doc.data().commentsCount || 0,
      }));
      setPosts(fetchedPosts);
      setLoadingPosts(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch systemAnnouncements for Featured carousel
  useEffect(() => {
    const q = query(collection(db, 'systemAnnouncements'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAnnouncements = snapshot.docs.map(doc => ({ 
        id: doc.id,
        source: 'systemAnnouncements',
        ...doc.data(),
        likes: doc.data().likes || [],
        likesCount: doc.data().likesCount || 0,
        comments: doc.data().comments || [],
        commentsCount: doc.data().commentsCount || 0,
      }));
      
      // Separate featured announcements for carousel
      const featured = fetchedAnnouncements.filter(a => a.featured);
      setFeaturedPosts(featured.slice(0, 5));
      
      // All announcements for Announcements tab
      setAllAnnouncements(fetchedAnnouncements);
      
      setLoadingFeatured(false);
      setLoadingAnnouncements(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch calendarEvents for Calendar
  useEffect(() => {
    const q = query(collection(db, 'calendarEvents'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      const activeEvents = fetchedEvents.filter(event => !event.archived);
      setEvents(activeEvents);

      const marks = {};
      activeEvents.forEach(ev => {
        const dateStr = ev.date;
        if (dateStr) {
          marks[dateStr] = {
            marked: true,
            dotColor: COLORS.primary,
            selectedColor: COLORS.primary,
          };
        }
      });
      setMarkedDates(marks);
      setLoadingEvents(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLike = async (postId, source) => {
    if (!currentUser) return;

    try {
      const postRef = doc(db, source, postId);
      const isLiked = userLikes.has(postId);
      const newUserLikes = new Set(userLikes);

      if (isLiked) {
        newUserLikes.delete(postId);
        await updateDoc(postRef, {
          likes: arrayRemove(currentUser.id),
          likesCount: increment(-1),
        });
      } else {
        newUserLikes.add(postId);
        await updateDoc(postRef, {
          likes: arrayUnion(currentUser.id),
          likesCount: increment(1),
        });
      }

      setUserLikes(newUserLikes);
      saveUserLikes(newUserLikes);
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const handleComment = async () => {
    if (!currentUser || !selectedPostData || !commentText.trim() || submittingComment) return;

    setSubmittingComment(true);
    setCommentSuccess(false);

    try {
      const postRef = doc(db, selectedPostData.source, selectedPostData.id);
      const newComment = {
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        text: commentText.trim(),
        timestamp: new Date().toISOString(),
      };

      await updateDoc(postRef, {
        comments: arrayUnion(newComment),
        commentsCount: increment(1),
      });

      setCommentText('');
      setCommentSuccess(true);
      
      setTimeout(() => {
        setCommentSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const manualTimeFormat = (timeString) => {
    if (!timeString) return '';
    
    let hour = '';
    let minute = '';
    let foundColon = false;
    
    for (let i = 0; i < timeString.length; i++) {
      const char = timeString[i];
      if (char === ':') {
        foundColon = true;
      } else if (!foundColon) {
        hour += char;
      } else {
        minute += char;
      }
    }
    
    const hourNum = Number(hour);
    const minuteStr = minute.length === 1 ? '0' + minute : minute;
    
    let displayHour;
    let period;
    
    if (hourNum === 0) {
      displayHour = 12;
      period = 'AM';
    } else if (hourNum < 12) {
      displayHour = hourNum;
      period = 'AM';
    } else if (hourNum === 12) {
      displayHour = 12;
      period = 'PM';
    } else {
      displayHour = hourNum - 12;
      period = 'PM';
    }
    
    return displayHour + ':' + minuteStr + ' ' + period;
  };

  const upcomingEvents = events
    .filter(ev => new Date(ev.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  const openEventDetailModal = (event) => {
    setSelectedEventDetails(event);
    setSelectedEventSponsors(event.sponsors || []);
    setSponsorModalVisible(true);
  };

  const renderCarouselItem = ({ item, index }) => {
    const inputRange = [
      (index - 1) * CAROUSEL_ITEM_WIDTH,
      index * CAROUSEL_ITEM_WIDTH,
      (index + 1) * CAROUSEL_ITEM_WIDTH,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 1, 0.6],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.carouselItem, { transform: [{ scale }], opacity }]}>
        <TouchableOpacity activeOpacity={0.9}>
          <View style={styles.carouselCard}>
            {item.image ? (
              <Image 
                source={{ uri: item.image }} 
                style={styles.carouselImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.carouselPlaceholder}>
                <FontAwesome5 name="bullhorn" size={40} color={COLORS.white} />
              </View>
            )}
            <View style={styles.carouselInfoSection}>
              <View style={styles.carouselContent}>
                <Text style={styles.carouselTitle} numberOfLines={2}>
                  {item.what || 'System Announcement'}
                </Text>
                <View style={styles.carouselDetails}>
                  <Text style={styles.carouselDetailText} numberOfLines={1}>
                    <FontAwesome5 name="map-marker-alt" size={10} color={COLORS.textSecondary} /> {item.where}
                  </Text>
                  <Text style={styles.carouselDetailText} numberOfLines={1}>
                    <FontAwesome5 name="clock" size={10} color={COLORS.textSecondary} /> {item.when ? new Date(item.when).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    }) : 'TBD'}
                  </Text>
                  <Text style={styles.carouselDetailText} numberOfLines={1}>
                    <FontAwesome5 name="users" size={10} color={COLORS.textSecondary} /> {item.who}
                  </Text>
                </View>
                <View style={styles.carouselMeta}>
                  <Text style={styles.carouselTime}>
                    {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString() : 'Recent'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderPost = ({ item }) => {
    const isLiked = userLikes.has(item.id);
    const timeAgo = getTimeAgo(item.timestamp?.toDate ? item.timestamp.toDate() : new Date());

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.postAuthor}>
            <View style={styles.postAvatar}>
              <FontAwesome5 name="newspaper" size={16} color={COLORS.primary} />
            </View>
            <View style={styles.postAuthorInfo}>
              <Text style={styles.postAuthorName}>News Feed</Text>
              <View style={styles.postMetaRow}>
                <Text style={styles.postTime}>{timeAgo}</Text>
                <FontAwesome5 name="globe-americas" size={12} color={COLORS.textLight} style={{ marginLeft: 8 }} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.postBody}>
          <Text style={styles.postTitle}>{item.title}</Text>
          <Text style={styles.postText}>{item.content}</Text>
        </View>

        {item.image && (
          <TouchableOpacity onPress={() => { setSelectedImage(item.image); setImageModalVisible(true); }}>
            <Image source={{ uri: item.image }} style={styles.postImage} />
          </TouchableOpacity>
        )}

        {(item.likesCount > 0 || item.commentsCount > 0) && (
          <View style={styles.postStats}>
            <View style={styles.postStatsLeft}>
              {item.likesCount > 0 && (
                <View style={styles.likesCount}>
                  <View style={styles.likeIcon}>
                    <FontAwesome5 name="heart" size={10} color={COLORS.white} />
                  </View>
                  <Text style={styles.statsText}>{item.likesCount}</Text>
                </View>
              )}
            </View>
            <View style={styles.postStatsRight}>
              {item.commentsCount > 0 && (
                <Text style={styles.statsText}>{item.commentsCount} comments</Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.postActions}>
          <TouchableOpacity 
            style={[styles.actionButton, isLiked && styles.likedButton]}
            onPress={() => handleLike(item.id, item.source)}
          >
            <FontAwesome5 
              name="heart" 
              size={16} 
              color={isLiked ? COLORS.like : COLORS.textSecondary}
              solid={isLiked}
            />
            <Text style={[styles.actionText, isLiked && styles.likedText]}>
              {isLiked ? 'Liked' : 'Like'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => openComments(item)}
          >
            <FontAwesome5 name="comment" size={16} color={COLORS.textSecondary} />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>
        </View>

        {item.comments && item.comments.length > 0 && (
          <View style={styles.commentsPreview}>
            {item.comments.slice(-2).map((comment, index) => (
              <View key={comment.id} style={styles.commentPreview}>
                <View style={styles.commentAvatar}>
                  <FontAwesome5 name="user" size={10} color={COLORS.textLight} />
                </View>
                <View style={styles.commentContent}>
                  <Text style={styles.commentText}>
                    <Text style={styles.commentAuthor}>{comment.userName}</Text>
                    {' '}{comment.text}
                  </Text>
                </View>
              </View>
            ))}
            {item.comments.length > 2 && (
              <TouchableOpacity onPress={() => openComments(item)}>
                <Text style={styles.viewMoreComments}>
                  View {item.comments.length - 2} more comments
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // NEW: Render announcement item (similar to post but for announcements)
  // NEW: Render announcement item (without like/comment actions)
const renderAnnouncement = ({ item }) => {
  const timeAgo = getTimeAgo(item.timestamp?.toDate ? item.timestamp.toDate() : new Date());

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postAuthor}>
          <View style={[styles.postAvatar, { backgroundColor: `${COLORS.accent}15` }]}>
            <FontAwesome5 name="bullhorn" size={16} color={COLORS.accent} />
          </View>
          <View style={styles.postAuthorInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.postAuthorName}>Announcement</Text>
              {item.featured && (
                <View style={styles.featuredBadge}>
                  <FontAwesome5 name="star" size={10} color={COLORS.warning} />
                </View>
              )}
            </View>
            <View style={styles.postMetaRow}>
              <Text style={styles.postTime}>{timeAgo}</Text>
              <FontAwesome5 name="globe-americas" size={12} color={COLORS.textLight} style={{ marginLeft: 8 }} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.postBody}>
        <Text style={styles.postTitle}>{item.what}</Text>
        <View style={styles.announcementDetails}>
          <View style={styles.announcementDetailRow}>
            <FontAwesome5 name="map-marker-alt" size={12} color={COLORS.textSecondary} />
            <Text style={styles.announcementDetailText}>{item.where}</Text>
          </View>
          <View style={styles.announcementDetailRow}>
            <FontAwesome5 name="clock" size={12} color={COLORS.textSecondary} />
            <Text style={styles.announcementDetailText}>
              {item.when ? new Date(item.when).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }) : 'TBD'}
            </Text>
          </View>
          <View style={styles.announcementDetailRow}>
            <FontAwesome5 name="users" size={12} color={COLORS.textSecondary} />
            <Text style={styles.announcementDetailText}>{item.who}</Text>
          </View>
        </View>
      </View>

      {item.image && (
        <TouchableOpacity onPress={() => { setSelectedImage(item.image); setImageModalVisible(true); }}>
          <Image source={{ uri: item.image }} style={styles.postImage} />
        </TouchableOpacity>
      )}
    </View>
  );
};

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderComment = ({ item: comment }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentItemAvatar}>
        <FontAwesome5 name="user" size={14} color={COLORS.textLight} />
      </View>
      <View style={styles.commentItemContent}>
        <View style={styles.commentBubble}>
          <Text style={styles.commentItemAuthor}>{comment.userName}</Text>
          <Text style={styles.commentItemText}>{comment.text}</Text>
        </View>
        <Text style={styles.commentItemTime}>
          {getTimeAgo(new Date(comment.timestamp))}
        </Text>
      </View>
    </View>
  );

  const handleDayPress = (day) => {
    const clickedDate = day.dateString;
    const eventsOnDate = events.filter(ev => ev.date === clickedDate);
    setSelectedDateEvents(eventsOnDate);
    setEventModalVisible(true);
  };

  const renderEvent = ({ item }) => (
    <TouchableOpacity 
      onPress={() => openEventDetailModal(item)}
      style={styles.eventItem}
    >
      <View style={styles.eventIconContainer}>
        <FontAwesome5 name="calendar-day" size={18} color={COLORS.accent} />
      </View>
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventDescription}>{item.description}</Text>
        <Text style={styles.eventDate}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
        {item.fromTime && item.toTime && (
          <Text style={styles.eventDuration}>
            {manualTimeFormat(item.fromTime)} - {manualTimeFormat(item.toTime)}
          </Text>
        )}
        {item.sponsors && item.sponsors.length > 0 && (
          <View style={styles.sponsorBadge}>
            <FontAwesome5 name="handshake" size={10} color={COLORS.primary} />
            <Text style={styles.sponsorBadgeText}>{item.sponsors.length} Sponsor{item.sponsors.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderUpcomingEvent = ({ item }) => (
    <TouchableOpacity 
      onPress={() => openEventDetailModal(item)}
      style={styles.upcomingEventCard}
    >
      <View style={styles.eventDateBadge}>
        <Text style={styles.eventDateText}>
          {new Date(item.date).getDate()}
        </Text>
        <Text style={styles.eventMonthText}>
          {new Date(item.date).toLocaleDateString('en', { month: 'short' })}
        </Text>
      </View>
      <View style={styles.upcomingEventContent}>
        <Text style={styles.upcomingEventTitle}>{item.title}</Text>
        <Text style={styles.upcomingEventDescription} numberOfLines={2}>
          {item.description}
        </Text>
        {item.fromTime && item.toTime && (
          <Text style={styles.upcomingEventTime}>
            {manualTimeFormat(item.fromTime)} - {manualTimeFormat(item.toTime)}
          </Text>
        )}
        {item.sponsors && item.sponsors.length > 0 && (
          <View style={styles.sponsorBadge}>
            <FontAwesome5 name="handshake" size={10} color={COLORS.primary} />
            <Text style={styles.sponsorBadgeText}>
              {item.sponsors.length} Sponsor{item.sponsors.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const openComments = (item) => {
    setSelectedPostId(item.id);
    setSelectedPostData(item);
    setCommentsModalVisible(true);
  };

  const TabButton = ({ title, icon, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.tabButton, isActive && styles.activeTab]}
    onPress={onPress}
  >
    <FontAwesome5 
      name={icon} 
      size={18} 
      color={isActive ? COLORS.white : COLORS.textSecondary} 
    />
    {isActive && <View style={styles.tabIndicator} />}
  </TouchableOpacity>
);

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
  <TabButton
    title="Feed"
    icon="newspaper"
    isActive={activeTab === 'Feed'}
    onPress={() => setActiveTab('Feed')}
  />
  <TabButton
    title="Announcements"
    icon="bullhorn"
    isActive={activeTab === 'Announcements'}
    onPress={() => setActiveTab('Announcements')}
  />
  <TabButton
    title="Events"
    icon="calendar-alt"
    isActive={activeTab === 'Calendar'}
    onPress={() => setActiveTab('Calendar')}
  />
</View>

      <View style={styles.contentContainer}>
        {activeTab === 'Feed' ? (
          (loadingPosts || loadingFeatured) ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading posts...</Text>
            </View>
          ) : (
            <FlatList
              data={[{ type: 'carousel' }, ...posts.map(post => ({ type: 'post', ...post }))]}
              keyExtractor={(item, index) => item.type === 'carousel' ? 'carousel' : item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                if (item.type === 'carousel') {
                  return (
                    <View style={styles.carouselSection}>
                      <Text style={styles.sectionTitle}>Featured Announcements</Text>
                      <Animated.FlatList
                        ref={carouselRef}
                        data={featuredPosts}
                        keyExtractor={(item) => `featured-${item.id}`}
                        renderItem={renderCarouselItem}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={CAROUSEL_ITEM_WIDTH + CAROUSEL_SPACING}
                        decelerationRate="fast"
                        contentContainerStyle={styles.carouselContainer}
                        onScroll={Animated.event(
                          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                          { useNativeDriver: false }
                        )}
                      />
                    </View>
                  );
                } else {
                  return renderPost({ item });
                }
              }}
            />
          )
        ) : activeTab === 'Announcements' ? (
          loadingAnnouncements ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading announcements...</Text>
            </View>
          ) : (
            <FlatList
              data={allAnnouncements}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={renderAnnouncement}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <FontAwesome5 name="bullhorn" size={48} color={COLORS.textLight} />
                  <Text style={styles.emptyText}>No announcements yet</Text>
                </View>
              )}
            />
          )
        ) : loadingEvents ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading events...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <CalendarPicker
              onDateChange={(date) => {
                if (date) {
                  const dateString = date.format('YYYY-MM-DD');
                  const eventsOnDate = events.filter(ev => ev.date === dateString);
                  setSelectedDateEvents(eventsOnDate);
                  setEventModalVisible(true);
                }
              }}
              selectedDayColor={COLORS.primary}
              selectedDayTextColor={COLORS.white}
              todayBackgroundColor={`${COLORS.primary}20`}
              todayTextStyle={{ color: COLORS.primary }}
              textStyle={{ color: COLORS.text }}
              width={screenWidth - 40}
              height={320}
              scaleFactor={375}
              customDatesStyles={getCustomDateStyles()}
              dayLabelsWrapper={{ borderTopWidth: 0, borderBottomWidth: 0 }}
            />

            {upcomingEvents.length > 0 && (
              <View style={styles.upcomingSection}>
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
                {upcomingEvents.map((item) => (
                  <View key={item.id}>
                    {renderUpcomingEvent({ item })}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* NEW: Sponsor Popup Modal */}
      <Modal visible={sponsorPopupVisible} transparent={true} animationType="fade">
        <View style={styles.sponsorPopupContainer}>
          <View style={styles.sponsorPopupContent}>
           <TouchableOpacity 
  style={styles.sponsorPopupClose}
  onPress={async () => {
    setSponsorPopupVisible(false);
    setHasSeenSponsors(true);
    try {
      await AsyncStorage.setItem('sponsors_seen_this_session', 'true');
    } catch (error) {
      console.error('Error saving sponsor seen status:', error);
    }
    if (sponsorTimerRef.current) {
      clearInterval(sponsorTimerRef.current);
    }
  }}
>
  <FontAwesome5 name="times" size={20} color={COLORS.textSecondary} />
</TouchableOpacity>

            {activeSponsors.length > 0 && (
              <View style={styles.sponsorPopupInner}>
                <Text style={styles.sponsorPopupTitle}>Our Sponsors</Text>
                
                <View style={styles.sponsorPopupImageContainer}>
                  {activeSponsors[currentSponsorIndex].imageUrl ? (
                    <Image
                      source={{ uri: activeSponsors[currentSponsorIndex].imageUrl }}
                      style={styles.sponsorPopupImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.sponsorPopupPlaceholder}>
                      <FontAwesome5 name="handshake" size={60} color={COLORS.textLight} />
                    </View>
                  )}
                </View>

                <Text style={styles.sponsorPopupName}>
                  {activeSponsors[currentSponsorIndex].name}
                </Text>

                <View style={styles.sponsorPopupPagination}>
                  {activeSponsors.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.sponsorPopupDot,
                        index === currentSponsorIndex && styles.sponsorPopupDotActive
                      ]}
                    />
                  ))}
                </View>

                <Text style={styles.sponsorPopupCounter}>
                  {currentSponsorIndex + 1} / {activeSponsors.length}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Comments Modal */}
      <Modal visible={commentsModalVisible} transparent={true} animationType="slide">
        <View style={styles.commentsModalContainer}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setCommentsModalVisible(false);
              setSelectedPostId(null);
              setSelectedPostData(null);
            }}
          />
          <View style={styles.commentsModalContent}>
            <View style={styles.commentsModalHeader}>
              <Text style={styles.commentsModalTitle}>Comments</Text>
              <TouchableOpacity onPress={() => {
                setCommentsModalVisible(false);
                setSelectedPostId(null);
                setSelectedPostData(null);
              }}>
                <FontAwesome5 name="times" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedPost ? (
              <>
                {selectedPostData?.comments?.length > 0 ? (
                  <FlatList
                    data={selectedPostData.comments}
                    keyExtractor={(item) => item.id}
                    renderItem={renderComment}
                    contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 20, paddingTop: 16 }}
                    keyboardShouldPersistTaps="handled"
                  />
                ) : (
                  <View style={styles.noCommentsContainer}>
                    <FontAwesome5 name="comment" size={48} color={COLORS.textLight} />
                    <Text style={styles.noCommentsText}>No comments yet</Text>
                    <Text style={styles.noCommentsSubtext}>Be the first to comment!</Text>
                  </View>
                )}
              </>
            ) : null}

            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                value={commentText}
                onChangeText={setCommentText}
                multiline
                editable={!submittingComment}
                maxLength={500}
              />
              <TouchableOpacity 
                style={[styles.sendButton, (submittingComment || !commentText.trim()) && styles.sendButtonDisabled]} 
                onPress={handleComment}
                disabled={submittingComment || !commentText.trim()}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <FontAwesome5 name="paper-plane" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            </View>

            {commentSuccess && (
              <View style={styles.commentSuccessContainer}>
                <FontAwesome5 name="check-circle" size={14} color={COLORS.success} />
                <Text style={styles.commentSuccessText}>Comment added!</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Image Modal */}
      <Modal visible={imageModalVisible} transparent={true} animationType="fade">
        <View style={styles.imageModalContainer}>
          <TouchableOpacity 
            style={styles.imageModalClose} 
            onPress={() => setImageModalVisible(false)}
          >
            <FontAwesome5 name="times" size={24} color={COLORS.white} />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.imageModalContent}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Event Modal (Events on this day) */}
      <Modal visible={eventModalVisible} transparent={true} animationType="slide">
        <View style={styles.eventModalContainer}>
          <View style={styles.eventModalContent}>
            <View style={styles.eventModalHeader}>
              <Text style={styles.eventModalTitle}>
                Events on {selectedDateEvents[0]?.date || 'this day'}
              </Text>
              <TouchableOpacity onPress={() => setEventModalVisible(false)}>
                <FontAwesome5 name="times" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedDateEvents.length === 0 ? (
              <View style={styles.noEventsContainer}>
                <FontAwesome5 name="calendar-times" size={48} color={COLORS.textLight} />
                <Text style={styles.noEventsText}>No events on this day</Text>
              </View>
            ) : (
              <FlatList
                data={selectedDateEvents}
                keyExtractor={(item) => item.id}
                renderItem={renderEvent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Event Detail Modal with Sponsors Carousel */}
      <Modal visible={sponsorModalVisible} transparent={true} animationType="slide">
        <View style={styles.eventDetailModalContainer}>
          <View style={styles.eventDetailModalContent}>
            <View style={styles.eventDetailModalHeader}>
              <Text style={styles.eventDetailModalTitle}>Event Details</Text>
              <TouchableOpacity onPress={() => {
                setSponsorModalVisible(false);
                setSelectedEventDetails(null);
                setSelectedEventSponsors([]);
              }}>
                <FontAwesome5 name="times" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedEventDetails && (
                <View style={styles.eventDetailContent}>
                  <View style={styles.eventDetailSection}>
                    <Text style={styles.eventDetailTitle}>{selectedEventDetails.title}</Text>
                    <Text style={styles.eventDetailDescription}>{selectedEventDetails.description}</Text>
                    
                    <View style={styles.eventDetailMeta}>
                      <View style={styles.eventDetailMetaItem}>
                        <FontAwesome5 name="calendar" size={14} color={COLORS.primary} />
                        <Text style={styles.eventDetailMetaText}>
                          {new Date(selectedEventDetails.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Text>
                      </View>
                      
                      {selectedEventDetails.fromTime && selectedEventDetails.toTime && (
                        <View style={styles.eventDetailMetaItem}>
                          <FontAwesome5 name="clock" size={14} color={COLORS.primary} />
                          <Text style={styles.eventDetailMetaText}>
                            {manualTimeFormat(selectedEventDetails.fromTime)} - {manualTimeFormat(selectedEventDetails.toTime)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {selectedEventSponsors.length > 0 && (
                    <View style={styles.sponsorsSection}>
                      <View style={styles.sponsorsSectionHeader}>
                        <FontAwesome5 name="handshake" size={18} color={COLORS.primary} />
                        <Text style={styles.sponsorsSectionTitle}>
                          Event Sponsors ({selectedEventSponsors.length})
                        </Text>
                      </View>
                      
                      <FlatList
                        data={selectedEventSponsors}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={screenWidth * 0.75 + 16}
                        decelerationRate="fast"
                        contentContainerStyle={styles.sponsorCarouselContainer}
                        renderItem={({ item: sponsor }) => (
                          <View style={styles.sponsorCard}>
                            {sponsor.image ? (
                              <Image
                                source={{ uri: sponsor.image }}
                                style={styles.sponsorImage}
                                resizeMode="contain"
                              />
                            ) : (
                              <View style={styles.sponsorImagePlaceholder}>
                                <FontAwesome5 name="building" size={40} color={COLORS.textLight} />
                              </View>
                            )}
                            <View style={styles.sponsorCardContent}>
                              <Text style={styles.sponsorName}>{sponsor.name}</Text>
                            </View>
                          </View>
                        )}
                      />
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
 tabButton: {
  flex: 1,
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
},
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.white,
  },
  
  contentContainer: {
    flex: 1,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  
  carouselSection: {
    marginBottom: 32,
  },
  carouselContainer: {
    paddingHorizontal: 20,
  },
  carouselItem: {
    width: CAROUSEL_ITEM_WIDTH,
    marginRight: CAROUSEL_SPACING,
  },
  carouselCard: {
    height: 225,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  carouselImage: {
    width: '100%',
    height: '50%',
  },
  carouselPlaceholder: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    height: '50%',
    width: '100%',
  },
  carouselInfoSection: {
    height: '50%',
    backgroundColor: COLORS.white,
    padding: 12,
    justifyContent: 'space-between',
  },
  carouselContent: {
    flex: 1,
  },
  carouselTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  carouselSnippet: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  carouselMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  carouselTime: {
    fontSize: 10,
    color: COLORS.textLight,
    marginLeft: 0,
    flex: 1,
  },
  carouselStats: {
    flexDirection: 'row',
  },
  carouselStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  carouselStatText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  
  postCard: {
    backgroundColor: COLORS.white,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthorName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postTime: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  postBody: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  postText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
  },
  postImage: {
    width: '100%',
    height: 250,
    backgroundColor: COLORS.surface,
  },
  
  // NEW: Announcement-specific styles
  featuredBadge: {
    backgroundColor: `${COLORS.warning}15`,
    borderRadius: 12,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  announcementDetails: {
    marginTop: 12,
    gap: 8,
  },
  announcementDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  announcementDetailText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  
  postStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  postStatsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postStatsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likesCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.like,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  statsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  likedButton: {
    backgroundColor: `${COLORS.like}10`,
  },
  actionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 6,
    fontWeight: '600',
  },
  likedText: {
    color: COLORS.like,
  },
  
  commentsPreview: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  commentPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentContent: {
    flex: 1,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text,
  },
  commentAuthor: {
    fontWeight: '600',
    color: COLORS.text,
  },
  viewMoreComments: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 4,
  },
  
  commentsModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  commentsModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.85,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 12,
    backgroundColor: COLORS.white,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  commentsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  commentsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  commentItemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentItemContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  commentItemAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  commentItemText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
  },
  commentItemTime: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 14,
  },
  
  noCommentsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noCommentsText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  
  commentInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
    backgroundColor: COLORS.white,
    color: COLORS.text,
  },
  commentInputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentInputField: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    color: COLORS.text,
  },
  commentSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  commentSendButtonDisabled: {
    opacity: 0.5,
  },
  sendButton: {
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  commentSuccessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: `${COLORS.success}15`,
    gap: 6,
  },
  commentSuccessText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
  },
  
  calendar: {
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  
  upcomingSection: {
    paddingBottom: 20,
  },
  upcomingEventCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventDateBadge: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  eventDateText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  eventMonthText: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.white,
  },
  upcomingEventContent: {
    flex: 1,
  },
  upcomingEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  upcomingEventDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  
  eventItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  eventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.accent}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  eventDuration: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  upcomingEventTime: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 12,
  },
  imageModalContent: {
    width: screenWidth - 40,
    height: screenHeight * 0.7,
  },
  
  eventModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  eventModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.8,
    padding: 20,
  },
  eventModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  eventModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noEventsText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  carouselDetails: {
    marginTop: 4,
    gap: 2,
  },
  carouselDetailText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  
  sponsorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  sponsorBadgeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  eventDetailModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  eventDetailModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.9,
    paddingTop: 20,
  },
  eventDetailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  eventDetailModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  eventDetailContent: {
    padding: 20,
  },
  eventDetailSection: {
    marginBottom: 24,
  },
  eventDetailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    lineHeight: 32,
  },
  eventDetailDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  eventDetailMeta: {
    gap: 12,
  },
  eventDetailMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventDetailMetaText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  sponsorsSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sponsorsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sponsorsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  sponsorCarouselContainer: {
    paddingVertical: 8,
  },
  sponsorCard: {
    width: screenWidth * 0.75,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  sponsorImage: {
    width: '100%',
    height: 150,
    backgroundColor: COLORS.surface,
  },
  sponsorImagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sponsorCardContent: {
    padding: 16,
  },
  sponsorName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },

  // NEW: Sponsor Popup Styles
  sponsorPopupContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sponsorPopupContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sponsorPopupClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
  },
  sponsorPopupInner: {
    alignItems: 'center',
    paddingTop: 16,
  },
  sponsorPopupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },
  sponsorPopupImageContainer: {
    width: '100%',
    height: 200,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  sponsorPopupImage: {
    width: '100%',
    height: '100%',
  },
  sponsorPopupPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  sponsorPopupName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  sponsorPopupPagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sponsorPopupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  sponsorPopupDotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  sponsorPopupCounter: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});