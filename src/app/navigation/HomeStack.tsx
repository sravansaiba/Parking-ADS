import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../../features/parkingScanner/screens/Home';
import RunningVehicles from '../../features/parkingScanner/screens/RunningVehicles';
import EndParkingScreen from '../../features/parkingScanner/screens/EndParkingScreen';
import DailyReport from '../../features/reports/screens/DailyReport';
import VehicleListReport from '../../features/reports/screens/VehicleListReport';


export type HomeStackParamList = {
  HomeMain: undefined;
  RunningVehicles: {
    vehicleType: 'EV' | 'Bike' | 'Car';
  };
  EndParking: {
    session?: any;
    sessionId?: string;
    isLostCard?: boolean;
  };
  DailyReport: undefined;
  VehicleListReport: {
    type: 'IN' | 'OUT';
    date: Date;
  };
};

const Stack = createStackNavigator<HomeStackParamList>();

const HomeStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="RunningVehicles" component={RunningVehicles} />
      <Stack.Screen name="EndParking" component={EndParkingScreen} />
      <Stack.Screen name="DailyReport" component={DailyReport} />
      <Stack.Screen name="VehicleListReport" component={VehicleListReport} />
    </Stack.Navigator>
  );
};

export default HomeStack;
