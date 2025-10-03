// WaveBackground.js - Responsive Wave Background for React Native (Web + Mobile)
import React, { useState, useEffect } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

export default function WaveBackground({ children }) {
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({
        width: window.width,
        height: window.height,
      });
    });

    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;

  return (
    <View style={styles.container}>
      {/* SVG Background */}
      <Svg 
        height="100%" 
        width="100%" 
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <Defs>
          {/* Top gradient - Navy to Blue */}
          <LinearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1e3a8a" stopOpacity="1" />
            <Stop offset="0.5" stopColor="#2563eb" stopOpacity="1" />
            <Stop offset="1" stopColor="#3b82f6" stopOpacity="1" />
          </LinearGradient>
          
          {/* Bottom gradient - Blue shades */}
          <LinearGradient id="bottomGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3b82f6" stopOpacity="1" />
            <Stop offset="0.5" stopColor="#60a5fa" stopOpacity="1" />
            <Stop offset="1" stopColor="#93c5fd" stopOpacity="1" />
          </LinearGradient>
          
          {/* Light blue gradient */}
          <LinearGradient id="lightBlueGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#60a5fa" stopOpacity="0.8" />
            <Stop offset="1" stopColor="#3b82f6" stopOpacity="0.6" />
          </LinearGradient>
        </Defs>
        
        {/* Background fill */}
        <Path
          d={`M0,0 L${width},0 L${width},${height} L0,${height} Z`}
          fill="#f8fafc"
        />
        
        {/* Top Wave - Main Layer (Dark Navy) */}
        <Path
          d={`M0,0 L${width},0 L${width},${height * 0.14} 
              Q${width * 0.875},${height * 0.12} ${width * 0.75},${height * 0.135}
              Q${width * 0.625},${height * 0.15} ${width * 0.5},${height * 0.13}
              Q${width * 0.375},${height * 0.11} ${width * 0.25},${height * 0.125}
              Q${width * 0.125},${height * 0.14} 0,${height * 0.12} Z`}
          fill="url(#topGrad)"
        />
        
        {/* Top Wave - Second Layer (Blue overlay) */}
        <Path
          d={`M0,0 L${width},0 L${width},${height * 0.11} 
              Q${width * 0.875},${height * 0.095} ${width * 0.75},${height * 0.105}
              Q${width * 0.625},${height * 0.115} ${width * 0.5},${height * 0.10}
              Q${width * 0.375},${height * 0.085} ${width * 0.25},${height * 0.095}
              Q${width * 0.125},${height * 0.105} 0,${height * 0.09} Z`}
          fill="#2563eb"
          opacity="0.7"
        />
        
        {/* Top Wave - Third Layer (Light accent) */}
        <Path
          d={`M${width},0 L${width},${height * 0.15}
              Q${width * 0.95},${height * 0.14} ${width * 0.90},${height * 0.155}
              Q${width * 0.85},${height * 0.17} ${width * 0.80},${height * 0.16}
              L${width},${height * 0.16} Z`}
          fill="url(#lightBlueGrad)"
          opacity="0.6"
        />
        
        {/* White Content Area */}
        <Path
          d={`M0,${height * 0.15} L${width},${height * 0.15}
              L${width},${height * 0.88} L0,${height * 0.88} Z`}
          fill="#ffffff"
        />
        
        {/* Bottom Wave - Main Layer */}
        <Path
          d={`M0,${height} L${width},${height} L${width},${height * 0.86}
              Q${width * 0.875},${height * 0.88} ${width * 0.75},${height * 0.865}
              Q${width * 0.625},${height * 0.85} ${width * 0.5},${height * 0.87}
              Q${width * 0.375},${height * 0.89} ${width * 0.25},${height * 0.875}
              Q${width * 0.125},${height * 0.86} 0,${height * 0.88} Z`}
          fill="url(#bottomGrad)"
        />
        
        {/* Bottom Wave - Second Layer */}
        <Path
          d={`M0,${height} L${width},${height} L${width},${height * 0.91}
              Q${width * 0.875},${height * 0.925} ${width * 0.75},${height * 0.915}
              Q${width * 0.625},${height * 0.905} ${width * 0.5},${height * 0.92}
              Q${width * 0.375},${height * 0.935} ${width * 0.25},${height * 0.925}
              Q${width * 0.125},${height * 0.915} 0,${height * 0.93} Z`}
          fill="#60a5fa"
          opacity="0.7"
        />
        
        {/* Bottom Wave - Corner Accent */}
        <Path
          d={`M${width * 0.75},${height}
              Q${width * 0.80},${height * 0.96} ${width * 0.85},${height * 0.94}
              Q${width * 0.90},${height * 0.92} ${width * 0.95},${height * 0.93}
              L${width},${height * 0.93} L${width},${height} Z`}
          fill="#3b82f6"
          opacity="0.5"
        />
      </Svg>
      
      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    overflow: 'hidden', // Prevent overflow
  },
  content: {
    flex: 1,
  },
});