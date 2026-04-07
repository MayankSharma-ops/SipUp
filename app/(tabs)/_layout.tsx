import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { sipupColors, sipupShadow } from '@/constants/sipup-ui';

type TabIconName = React.ComponentProps<typeof MaterialIcons>['name'];

function TabIcon({
  activeName,
  inactiveName,
  color,
  focused,
}: {
  activeName: TabIconName;
  inactiveName: TabIconName;
  color: string;
  focused: boolean;
}) {
  return (
    <MaterialIcons
      color={color}
      name={focused ? activeName : inactiveName}
      size={26}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: sipupColors.background,
        },
        tabBarActiveTintColor: sipupColors.primary,
        tabBarInactiveTintColor: '#989bab',
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 12,
          height: 92,
          paddingTop: 12,
          paddingBottom: 16,
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderTopWidth: 0,
          borderRadius: 36,
          ...sipupShadow,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.7,
          textTransform: 'uppercase',
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              activeName="home-filled"
              inactiveName="home"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              activeName="insights"
              inactiveName="insights"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="premium"
        options={{
          title: 'Premium',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              activeName="workspace-premium"
              inactiveName="workspace-premium"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
