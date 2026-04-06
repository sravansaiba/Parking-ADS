// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import Reports from "../../features/reports/screens/Reports";


// const Stack = createNativeStackNavigator();

// export default function ReportsStack() {
//   return (
//     <Stack.Navigator screenOptions={{ headerShown: false }}>
//       <Stack.Screen name="ReportsScreen" component={Reports} />
//     </Stack.Navigator>
//   );
// }




import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Reports from '../../features/reports/screens/Reports';
import VehicleListReport from '../../features/reports/screens/VehicleListReport';
import { ReportsStackParamList } from '../../types/navigation';

const Stack = createNativeStackNavigator<ReportsStackParamList>();

export default function ReportsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReportsScreen" component={Reports} />
      <Stack.Screen name="VehicleListReport" component={VehicleListReport} />
    </Stack.Navigator>
  );
}
