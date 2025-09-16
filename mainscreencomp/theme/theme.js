// constants/theme.js
import React from 'react';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';

export const COLORS = {
  primary: '#87CEEB',
  secondary: '#FFD700',
  background: '#F0F8FF',
  white: '#FFFFFF',
  danger: '#d32f2f',
  text: '#2C5282',
  textSecondary: '#4A5568',
  cardShadow: 'rgba(0,0,0,0.1)',
  success: '#10B981',
};

export const BUTTONS = [
  { 
    key: 'accident', 
    label: 'Accident', 
    icon: <FontAwesome5 name="car-crash" size={28} color="#fff" />,
    color: '#FF6B6B'
  },
  { 
    key: 'fire', 
    label: 'Fire', 
    icon: <FontAwesome5 name="fire" size={28} color="#fff" />,
    color: '#FF8E53'
  },
  { 
    key: 'paramedics', 
    label: 'Medical', 
    icon: <FontAwesome5 name="first-aid" size={28} color="#fff" />,
    color: '#4ECDC4'
  },
  { 
    key: 'noise', 
    label: 'Noise', 
    icon: <FontAwesome name="volume-up" size={28} color="#fff" />,
    color: '#45B7D1'
  },
  { 
    key: 'crime', 
    label: 'Crime', 
    icon: <FontAwesome5 name="user-secret" size={28} color="#fff" />,
    color: '#9B59B6'
  },
  { 
    key: 'garbage', 
    label: 'Garbage', 
    icon: <FontAwesome5 name="trash" size={28} color="#fff" />,
    color: '#F39C12'
  },
  { 
    key: 'others', 
    label: 'Others', 
    icon: <FontAwesome name="ellipsis-h" size={28} color="#fff" />,
    color: '#95A5A6'
  },
];