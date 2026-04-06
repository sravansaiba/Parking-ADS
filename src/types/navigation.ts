export type ReportsStackParamList = {
  ReportsScreen: {
    tenantId: string;
  };

  VehicleListReport: {
    type: 'IN' | 'OUT';
    date: Date;
  };
};
