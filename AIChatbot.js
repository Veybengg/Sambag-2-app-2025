// AIChatbot.js - Sleek Light Mode with Letter-by-Letter Typing Animation
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// Bouncing Dots Indicator (for "thinking" state)
const ThinkingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -8,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View style={styles.thinkingContainer}>
      <Animated.View
        style={[styles.thinkingDot, { transform: [{ translateY: dot1 }] }]}
      />
      <Animated.View
        style={[styles.thinkingDot, { transform: [{ translateY: dot2 }] }]}
      />
      <Animated.View
        style={[styles.thinkingDot, { transform: [{ translateY: dot3 }] }]}
      />
    </View>
  );
};

// Typing Message Component (letter-by-letter animation)
const TypingMessage = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 20); // Adjust speed here (lower = faster)
      
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text]);

  return (
    <Text style={styles.botText}>
      {displayedText}
      <Text style={styles.cursor}>▊</Text>
    </Text>
  );
};

export default function AIChatbot() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'Hey there! 👋 I\'m your AI Emergency Assistant. What can I help you with today?',
      sender: 'bot',
      timestamp: new Date(),
      isTyping: false,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollViewRef = useRef();

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || isThinking) return;

    const currentInputText = inputText.trim();
    setInputText('');
    setIsThinking(true);

    const userMessage = {
      id: Date.now().toString(),
      text: currentInputText,
      sender: 'user',
      timestamp: new Date(),
      isTyping: false,
    };

    try {
      setMessages((prev) => [...prev, userMessage]);

      const updatedHistory = [...messages, userMessage]
        .filter(msg => msg.id !== '1')
        .map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        }));

      const chatWithAI = httpsCallable(functions, 'chatWithGemini');
      const response = await chatWithAI({
        message: currentInputText,
        conversationHistory: updatedHistory,
      });

      setIsThinking(false);

      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: response.data.response,
        sender: 'bot',
        timestamp: new Date(),
        isTyping: true,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsThinking(false);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Oops! Something went wrong. Mind trying that again?',
        sender: 'bot',
        timestamp: new Date(),
        isTyping: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleTypingComplete = (messageId) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, isTyping: false } : msg
      )
    );
  };

  const renderMessage = (message) => {
    const isBot = message.sender === 'bot';
    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isBot ? styles.botMessageContainer : styles.userMessageContainer,
        ]}
      >
        {isBot && (
          <View style={styles.botAvatarContainer}>
            <View style={styles.botAvatar}>
              <FontAwesome5 name="user-tie" size={16} color="#FFFFFF" />
            </View>
          </View>
        )}
        <View style={styles.messageContent}>
          <View
            style={[
              styles.messageBubble,
              isBot ? styles.botBubble : styles.userBubble,
            ]}
          >
            {isBot && message.isTyping ? (
              <TypingMessage 
                text={message.text} 
                onComplete={() => handleTypingComplete(message.id)}
              />
            ) : (
              <Text style={[styles.messageText, isBot ? styles.botText : styles.userText]}>
                {message.text}
              </Text>
            )}
          </View>
          <Text style={[styles.timestamp, !isBot && styles.userTimestamp]}>
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Sleek Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerAvatarGlow}>
              <View style={styles.headerAvatar}>
                <FontAwesome5 name="user-tie" size={22} color="#FFFFFF" />
              </View>
            </View>
            <View>
              <Text style={styles.headerTitle}>AI Assistant</Text>
              <View style={styles.statusContainer}>
                <View style={styles.statusPulse}>
                  <View style={styles.statusDot} />
                </View>
                <Text style={styles.statusText}>Always available</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Messages Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => renderMessage(message))}
        
        {/* Thinking Indicator */}
        {isThinking && (
          <View style={[styles.messageContainer, styles.botMessageContainer]}>
            <View style={styles.botAvatarContainer}>
              <View style={styles.botAvatar}>
                <FontAwesome5 name="brain" size={16} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.messageContent}>
              <View style={[styles.messageBubble, styles.botBubble, styles.thinkingBubble]}>
                <ThinkingIndicator />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modern Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message AI Assistant..."
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={500}
            editable={!isThinking}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isThinking) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isThinking}
            activeOpacity={0.8}
          >
            <FontAwesome5
              name="arrow-up"
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    marginHorizontal: -20,
    marginTop: -20,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatarGlow: {
    padding: 3,
    borderRadius: 26,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    marginRight: 12,
  },
  headerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  statusText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botAvatarContainer: {
    marginRight: 10,
  },
  botAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContent: {
    maxWidth: '75%',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: '#6366F1',
    borderTopRightRadius: 4,
  },
  thinkingBubble: {
    paddingVertical: 16,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  botText: {
    color: '#0F172A',
  },
  userText: {
    color: '#FFFFFF',
  },
  cursor: {
    color: '#6366F1',
    fontWeight: '300',
  },
  timestamp: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    marginLeft: 12,
  },
  userTimestamp: {
    textAlign: 'right',
    marginLeft: 0,
    marginRight: 0,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  thinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    maxHeight: 100,
    paddingVertical: 10,
    paddingRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
    opacity: 0.5,
  },
});