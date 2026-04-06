// import { createNativeStackNavigator } from "@react-navigation/native-stack";
// import Card from "../../features/parkingCards/screens/Card";
// import GenerateCard from "../../features/parkingCards/screens/GenerateCard";
// // import ViewCards from "../../features/parkingCards/screens/ViewCards";

// const Stack = createNativeStackNavigator();

// export default function CardStack() {
//   return (
//     <Stack.Navigator screenOptions={{ headerShown: false }}>
//       <Stack.Screen name="Card" component={Card} />
//       <Stack.Screen name="GenerateCard" component={GenerateCard} />
//       {/* <Stack.Screen name="ViewCards" component={ViewCards} /> */}
//     </Stack.Navigator>
//   );
// }

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Card from '../../features/parkingCards/screens/Card';
import GenerateCard from '../../features/parkingCards/screens/GenerateCard';
import ViewCards from '../../features/parkingCards/screens/ViewCards';

export type CardStackParamList = {
  CardMain: undefined;
  GenerateCard: undefined;
  ViewCards: undefined;
};

const Stack = createStackNavigator<CardStackParamList>();

const CardStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen 
        name="CardMain" 
        component={Card}
        options={{ title: 'Parking Cards' }}
      />
    </Stack.Navigator>
  );
};

export default CardStack;