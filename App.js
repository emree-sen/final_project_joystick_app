import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './screens/HomeScreen';
import BluetoothScreen from './screens/BluetoothScreen';
import SettingsScreen from './screens/SettingsScreen';
import AboutScreen from './screens/AboutScreen';
import ConstantsScreen from './screens/ConstantsScreen';
import { ThemeProvider, useTheme } from './themes/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Ana ekranlar için Tab Navigator
function MainTabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      key={theme.name}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Joystick') {
            iconName = focused ? 'game-controller' : 'game-controller-outline';
          } else if (route.name === 'Bluetooth') {
            iconName = focused ? 'bluetooth' : 'bluetooth-outline';
          } else if (route.name === 'Ayarlar') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.primaryColor,
        tabBarInactiveTintColor: theme.secondaryTextColor,
        tabBarStyle: {
          backgroundColor: theme.secondaryBackground,
          borderTopColor: theme.borderColor,
          paddingTop: 5,
          height: 60
        },
        tabBarLabelStyle: {
          fontSize: 12,
          paddingBottom: 5
        },
        headerShown: false,
        tabBarHideOnKeyboard: true
      })}
    >
      <Tab.Screen
        name="Joystick"
        component={HomeScreen}
        options={{ title: 'Joystick' }}
      />
      <Tab.Screen
        name="Bluetooth"
        component={BluetoothScreen}
        options={{ title: 'Bluetooth' }}
      />
      <Tab.Screen
        name="Ayarlar"
        component={SettingsScreen}
        options={{ title: 'Ayarlar' }}
      />
    </Tab.Navigator>
  );
}

// Ana uygulama bileşeni
function AppContent() {
  const { theme } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

  // Hide splash screen after 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // If showing splash screen
  if (showSplash) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: theme.backgroundColor }]}>
        <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
        <Image
          source={require('./assets/acilis.png')}
          style={styles.splashImage}
          resizeMode="contain"
        />
        <Text style={[styles.splashText, { color: theme.textColor }]}>
          BİTİRME PROJESİ{'\n'}KONTROL KUMANDASI UYGULAMASI
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
        <Stack.Navigator
          initialRouteName="Main"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.backgroundColor }
          }}
        >
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="Constants" component={ConstantsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// Tema sağlayıcısı ile sarılmış uygulama
export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  // Custom splash screen styles
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  splashImage: {
    width: '80%',
    height: '50%',
    marginBottom: 30,
  },
  splashText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 30,
  }
});