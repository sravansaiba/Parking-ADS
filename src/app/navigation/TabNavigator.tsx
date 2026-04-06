import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home as HomeIcon,
  CreditCard as CardIcon,
  DollarSign as PricingIcon,
  BarChart3 as ReportsIcon,
  Users as UsersIcon,
} from "lucide-react-native";
import HomeStack from './HomeStack';
import CardStack from './CardStack';
import PricingStack from "./PricingStack";
import ReportsStack from './ReportsStack';
import UsersStack from './UsersStack';

const Tab = createBottomTabNavigator();
const { width: screenWidth } = Dimensions.get('window');
const TAB_WIDTH = screenWidth / 5;

const tabIcons = [
  { name: 'Home', component: HomeStack, label: 'Home', icon: HomeIcon },
  { name: 'Cards', component: CardStack, label: 'Cards', icon: CardIcon },
  { name: 'Pricing', component: PricingStack, label: 'Pricing', icon: PricingIcon },
  { name: 'Reports', component: ReportsStack, label: 'Reports', icon: ReportsIcon },
];

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar,
        {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        },
      ]}
    >

      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel || route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const IconComponent = tabIcons[index].icon;

        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.8}
          >
            <View style={[
              styles.iconContainer,
              {
                opacity: isFocused ? 1 : 0.7,
              },
            ]}>
              <IconComponent 
                size={26} 
                color={isFocused ? '#FF9500' : '#A1A1AA'} 
              />
            </View>
            <Text 
              style={[
                styles.tabLabel,
                { color: isFocused ? '#FF9500' : '#A1A1AA' },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    paddingHorizontal: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    marginBottom: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
    textAlign: 'center',
    includeFontPadding: false,
  },
});

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        lazy: true,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      {tabIcons.map(({ name, component, label }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{ tabBarLabel: label }}
        />
      ))}
    </Tab.Navigator>
  );
}