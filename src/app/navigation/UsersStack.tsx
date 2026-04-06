import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import UsersHome from "../../features/users/screens/UserHome";
import AddUser from "../../features/users/screens/AddUser";
import ViewUsers from "../../features/users/screens/ViewUsers";

const Stack = createNativeStackNavigator();

export default function UsersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UsersHome" component={UsersHome} />
      <Stack.Screen name="AddUser" component={AddUser} />
      <Stack.Screen name="ViewUsers" component={ViewUsers} />
    </Stack.Navigator>
  );
}
