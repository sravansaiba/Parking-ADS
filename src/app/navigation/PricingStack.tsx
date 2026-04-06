// import { createNativeStackNavigator } from "@react-navigation/native-stack";
// import Pricing from "../../features/pricing/screens/Pricing";
// import CreateRule from "../../features/pricing/screens/CreateRule";
// // import ViewRules from "../../features/pricing/screens/ViewRules";

// const Stack = createNativeStackNavigator();

// export default function PricingStack() {
//   return (
//     <Stack.Navigator screenOptions={{ headerShown: false }}>
//       <Stack.Screen name="PricingMain" component={Pricing} />
//       <Stack.Screen name="CreateRule" component={CreateRule} />
//       {/* <Stack.Screen name="ViewRules" component={ViewRules} /> */}
//     </Stack.Navigator>
//   );
// }



import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Pricing from '../../features/pricing/screens/Pricing';
import CreateRule from '../../features/pricing/screens/CreateRule';
import ViewRules from '../../features/pricing/screens/ViewRules';
import { VehicleType } from '../../features/pricing/pricingStore';
import SelectVehicle from '../../features/pricing/screens/SelectVehicle';


export type PricingStackParamList = {
  PricingMain: undefined;
  SelectVehicle: undefined;
  CreateRule: {
    ruleId?: string;
    vehicleType?: VehicleType;
    extend?: boolean;
  } | undefined;
  ViewRules: { ruleId?: string } | undefined;
};

const Stack = createStackNavigator<PricingStackParamList>();

const PricingStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen 
        name="PricingMain" 
        component={Pricing}
        options={{ title: 'Pricing Rules' }}
      />
      <Stack.Screen 
        name="CreateRule" 
        component={CreateRule}
        options={{ title: 'Create Rule' }}
      />
      <Stack.Screen 
        name="ViewRules" 
        component={ViewRules}
        options={{ title: 'View Rules' }}
      />
       <Stack.Screen 
        name="SelectVehicle" 
        component={SelectVehicle}
      />
    </Stack.Navigator>
  );
};

export default PricingStack;