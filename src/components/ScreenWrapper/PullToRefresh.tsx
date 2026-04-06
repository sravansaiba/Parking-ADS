import React from 'react';
import { ScrollView, RefreshControl } from 'react-native';

interface Props {
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}

const PullToRefresh: React.FC<Props> = ({
  refreshing,
  onRefresh,
  children,
}) => {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#FF9500']} 
          tintColor="#FF9500"
        />
      }
    >
      {children}
    </ScrollView>
  );
};

export default PullToRefresh;
