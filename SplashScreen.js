// SplashScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, StatusBar } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

export default function SplashScreen({ onFinish }) {
  const [lastTap, setLastTap] = useState(0);

  const player = useVideoPlayer(require('./assets/splashscreen.mp4'), (player) => {
    player.play();
  });

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      onFinish(); // Skip splash
    } else {
      setLastTap(now);
    }
  };

  // Listen for video finish - try multiple event types for better compatibility
  useEffect(() => {
    if (!player) return;

    // Method 1: playbackStatusUpdate
    const statusSub = player.addListener('playbackStatusUpdate', (status) => {
      console.log('Status update:', status);
      if (status.isLoaded && status.didJustFinish) {
        console.log('Video finished via status update, waiting 1 second...');
        setTimeout(() => {
          onFinish();
        }, 1000); // 1 second delay
      }
    });

    // Method 2: ended event
    const endSub = player.addListener('ended', () => {
      console.log('Video ended via ended event, waiting 1 second...');
      setTimeout(() => {
        onFinish();
      }, 1000); // 1 second delay
    });

    // Method 3: Fallback timer (adjust to your video length)
    const fallbackTimer = setTimeout(() => {
      console.log('Video finished via fallback timer, waiting 1 second...');
      setTimeout(() => {
        onFinish();
      }, 1000); // 1 second delay
    }, 5000); // Change this to your video duration + 100ms

    return () => {
      statusSub?.remove();
      endSub?.remove();
      clearTimeout(fallbackTimer);
    };
  }, [player, onFinish]);

  return (
    <TouchableWithoutFeedback onPress={handleDoubleTap}>
      <View style={styles.container}>
        <StatusBar hidden />
        <VideoView
          player={player}
          style={styles.video}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          nativeControls={false}
          showsLoading={false}  // This should hide the loading spinner
          contentFit="cover"
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
});