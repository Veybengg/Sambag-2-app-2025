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
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { FontAwesome5 } from '@expo/vector-icons';
import { db } from './firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
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
  const [events, setEvents] = useState([]); // From calendarEvents collection
  const [markedDates, setMarkedDates] = useState({});
  
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  // Modal states
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [selectedPostData, setSelectedPostData] = useState(null); // Store the actual post data

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const selectedPost = posts.find(p => p.id === selectedPostId);

  
  
  // Likes state (track which posts current user liked)
  const [userLikes, setUserLikes] = useState(new Set());

  const scrollX = useRef(new Animated.Value(0)).current;
  const carouselRef = useRef(null);

  // Load current user
  useEffect(() => {
    loadCurrentUser();
  }, []);

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
        
        // Load user's liked posts using name as key
        const likedPosts = await AsyncStorage.getItem(`user_likes_${user.name}`);
        if (likedPosts) {
          setUserLikes(new Set(JSON.parse(likedPosts)));
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  // Save user likes to storage
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
      setFeaturedPosts(fetchedAnnouncements.slice(0, 5)); // Show first 5 as featured
      setLoadingFeatured(false);
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
      // Filter out archived events
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

  // Handle like functionality for newsfeeds
 const handleLike = async (postId, source) => {
  if (!currentUser) return;

  try {
    const postRef = doc(db, source, postId); // 👈 dynamic
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

  // Handle comment submission
  const handleComment = async () => {
  if (!currentUser || !selectedPostData || !commentText.trim()) return;

  try {
    const postRef = doc(db, selectedPostData.source, selectedPostData.id); // 👈 dynamic
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
  } catch (error) {
    console.error('Error adding comment:', error);
  }
};

  // Open comments modal - FIXED
  const openComments = (post) => {
    setSelectedPostId(post.id);
    setSelectedPostData(post);
    setCommentsModalVisible(true);
  };

  // Compute upcoming events
  const upcomingEvents = events
    .filter(ev => new Date(ev.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  // Carousel Item Renderer for System Announcements
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
            <View style={styles.carouselPlaceholder}>
              <FontAwesome5 name="bullhorn" size={40} color={COLORS.white} />
            </View>
            <View style={styles.carouselOverlay}>
              <View style={styles.carouselContent}>
                <Text style={styles.carouselTitle} numberOfLines={2}>
                  {item.what || 'System Announcement'}
                </Text>
                <View style={styles.carouselDetails}>
                  <Text style={styles.carouselDetailText} numberOfLines={1}>
                    <FontAwesome5 name="map-marker-alt" size={10} color={COLORS.white} /> {item.where}
                  </Text>
                  <Text style={styles.carouselDetailText} numberOfLines={1}>
                    <FontAwesome5 name="clock" size={10} color={COLORS.white} /> {item.when ? new Date(item.when).toLocaleDateString() : 'TBD'}
                  </Text>
                  <Text style={styles.carouselDetailText} numberOfLines={1}>
                    <FontAwesome5 name="users" size={10} color={COLORS.white} /> {item.who}
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

  // Regular post renderer for newsfeeds
  const renderPost = ({ item }) => {
    const isLiked = userLikes.has(item.id);
    const timeAgo = getTimeAgo(item.timestamp?.toDate ? item.timestamp.toDate() : new Date());

    return (
      <View style={styles.postCard}>
        {/* Post Header */}
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

        {/* Post Content */}
        <View style={styles.postBody}>
          <Text style={styles.postTitle}>{item.title}</Text>
          <Text style={styles.postText}>{item.content}</Text>
        </View>

        {/* Post Image */}
        {item.image && (
          <TouchableOpacity onPress={() => { setSelectedImage(item.image); setImageModalVisible(true); }}>
            <Image source={{ uri: item.image }} style={styles.postImage} />
          </TouchableOpacity>
        )}

        {/* Post Stats */}
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

        {/* Post Actions */}
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

        {/* Recent Comments Preview */}
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

  // Helper function to get time ago
  const getTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    return date.toLocaleDateString();
  };

  // Comment renderer for modal - FIXED
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

  // Handle calendar day press
  const handleDayPress = (day) => {
    const clickedDate = day.dateString;
    const eventsOnDate = events.filter(ev => ev.date === clickedDate);
    setSelectedDateEvents(eventsOnDate);
    setEventModalVisible(true);
  };

  const renderEvent = ({ item }) => (
    <View style={styles.eventItem}>
      <View style={styles.eventIconContainer}>
        <FontAwesome5 name="calendar-day" size={18} color={COLORS.accent} />
      </View>
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventDescription}>{item.description}</Text>
        <Text style={styles.eventDate}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
        {/* Added duration */}
        {item.fromTime && item.toTime && (
          <Text style={styles.eventDuration}>
            {item.fromTime} - {item.toTime}
          </Text>
        )}
      </View>
    </View>
  );

  const renderUpcomingEvent = ({ item }) => (
    <View style={styles.upcomingEventCard}>
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
        {/* Added duration */}
        {item.fromTime && item.toTime && (
          <Text style={styles.upcomingEventTime}>
            {item.fromTime} - {item.toTime}
          </Text>
        )}
      </View>
    </View>
  );

  const TabButton = ({ title, isActive, onPress }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.activeTab]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, isActive && styles.activeTabText]}>
        {title}
      </Text>
      {isActive && <View style={styles.tabIndicator} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Modern Tab Header */}
      <View style={styles.tabContainer}>
        <TabButton
          title="Feed"
          isActive={activeTab === 'Feed'}
          onPress={() => setActiveTab('Feed')}
        />
        <TabButton
          title="Events"
          isActive={activeTab === 'Calendar'}
          onPress={() => setActiveTab('Calendar')}
        />
      </View>

      {/* Tab Content */}
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
        ) : loadingEvents ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading events...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Calendar
              markedDates={markedDates}
              onDayPress={handleDayPress}
              theme={{
                backgroundColor: COLORS.white,
                calendarBackground: COLORS.white,
                textSectionTitleColor: COLORS.text,
                selectedDayBackgroundColor: COLORS.primary,
                selectedDayTextColor: COLORS.white,
                todayTextColor: COLORS.primary,
                dayTextColor: COLORS.text,
                textDisabledColor: COLORS.textLight,
                dotColor: COLORS.primary,
                selectedDotColor: COLORS.white,
                arrowColor: COLORS.primary,
                monthTextColor: COLORS.text,
                indicatorColor: COLORS.primary,
                textDayFontWeight: '500',
                textMonthFontWeight: '600',
                textDayHeaderFontWeight: '600',
              }}
              style={styles.calendar}
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

      {/* Comments Modal - FIXED with input always visible */}
<Modal visible={commentsModalVisible} transparent={true} animationType="slide">
  <KeyboardAvoidingView 
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={styles.commentsModalContainer}
  >
    <View style={styles.commentsModalContent}>
      {/* Header */}
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

      {/* Comments List */}
      {selectedPost ? (
        <>
          {selectedPostData?.comments?.length > 0 ? (
            <FlatList
              data={selectedPostData.comments}
              keyExtractor={(item) => item.id}
              renderItem={renderComment}
              contentContainerStyle={{ paddingBottom: 60 }} // leave space for input
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

      {/* Comment Input */}
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Write a comment..."
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleComment}>
          <FontAwesome5 name="paper-plane" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  </KeyboardAvoidingView>
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

      {/* Event Modal */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  
  // Tab Styles
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
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
  
  // Content
  contentContainer: {
    flex: 1,
  },
  
  // Loading
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
  
  // Section Titles
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  
  // Carousel Styles
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
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselPlaceholder: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 16,
  },
  carouselContent: {
    flex: 1,
  },
  carouselTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
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
  },
  carouselTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
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
  
  // Facebook-style Post Cards
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
  
  // Post Stats (likes/comments count)
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
  
  // Post Actions (Like, Comment) - Share removed
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
  
  // Comments Preview
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
  
  // Comments Modal
  commentsModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  commentsModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.8,
    paddingTop: 20,
  },
  commentsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  
  // Comment Input
  commentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
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
  
  // Calendar
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
  
  // Events
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
  
  // Event Items
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
  
  // Image Modal
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
  
  // Event Modal
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
  carouselDetailText: {
    color: 'white',
  },
  commentInputContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  borderTopWidth: 1,
  borderTopColor: COLORS.border,
  padding: 8,
  backgroundColor: COLORS.white,
},
commentInput: {
  flex: 1,
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: COLORS.border,
  marginRight: 8,
  maxHeight: 100,
},
sendButton: {
  padding: 8,
},

});