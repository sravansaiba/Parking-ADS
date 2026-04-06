import { create } from 'zustand';
import pricingApi from '../../api/rules/api';
import { CreateRulePayload, PricingRuleWithItems } from '../../types/pricingrules';

export type VehicleType = 'EV' | 'Bike' | 'Car' | 'AUTO';

interface PricingStore {
  rules: PricingRuleWithItems[];
  loading: boolean;
  error: string | null;
  selectedRule: PricingRuleWithItems | null;

  activeRulesCount: {
    EV: boolean;
    Bike: boolean;
    Car: boolean;
    AUTO: boolean;
  };

  setRules: (rules: PricingRuleWithItems[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedRule: (rule: PricingRuleWithItems | null) => void;

  fetchRules: (tenantId: string) => Promise<void>;
  fetchRule: (ruleId: string) => Promise<void>;
  createRule: (payload: CreateRulePayload) => Promise<void>;
  updateRule: (ruleId: string, payload: any) => Promise<void>;
  deleteRule: (ruleId: string) => Promise<void>;
  toggleRuleStatus: (ruleId: string, isActive: boolean) => Promise<void>;
  calculatePrice: (tenantId: string, vehicleType: string, minutes: number) => Promise<number>;
  checkRuleExists: (tenantId: string, vehicleType: string) => Promise<boolean>;
  fetchActiveRulesCount: (tenantId: string) => Promise<void>;

  getRuleByVehicleType: (vehicleType: VehicleType) => PricingRuleWithItems | undefined;
  getActiveRules: () => PricingRuleWithItems[];
  getInactiveRules: () => PricingRuleWithItems[];
  reset: () => void;
}

export const usePricingStore = create<PricingStore>((set, get) => ({
  rules: [],
  loading: false,
  error: null,
  selectedRule: null,

  activeRulesCount: {
    EV: false,
    Bike: false,
    Car: false,
    AUTO: false,
  },

  setRules: (rules) => set({ rules }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedRule: (rule) => set({ selectedRule: rule }),

  fetchRules: async (tenantId) => {
    set({ loading: true, error: null });
    try {
      const rules = await pricingApi.getAllRules(tenantId);
      set({ rules, loading: false });
      await get().fetchActiveRulesCount(tenantId);
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchRule: async (ruleId) => {
    set({ loading: true, error: null });
    try {
      const rule = await pricingApi.getRule(ruleId);
      set({ selectedRule: rule, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createRule: async (payload) => {
    set({ loading: true, error: null });
    try {
      const newRule = await pricingApi.createRule(payload);
      const currentRules = get().rules;
      set({
        rules: [...currentRules, newRule],
        loading: false,
      });
      await get().fetchActiveRulesCount(payload.tenant_id);
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateRule: async (ruleId, payload) => {
    set({ loading: true, error: null });
    try {
      const updatedRule = await pricingApi.updateRule(ruleId, payload);
      const currentRules = get().rules;
      const updatedRules = currentRules.map(rule =>
        rule.id === ruleId ? updatedRule : rule
      );
      set({
        rules: updatedRules,
        selectedRule: updatedRule,
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteRule: async (ruleId) => {
    set({ loading: true, error: null });
    try {
      await pricingApi.deleteRule(ruleId);
      const currentRules = get().rules;
      const filteredRules = currentRules.filter(rule => rule.id !== ruleId);
      set({
        rules: filteredRules,
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  toggleRuleStatus: async (ruleId, isActive) => {
    try {
      await pricingApi.toggleRuleStatus(ruleId, isActive);
      const currentRules = get().rules;
      const updatedRules = currentRules.map(rule =>
        rule.id === ruleId ? { ...rule, is_active: isActive } : rule
      );
      set({ rules: updatedRules });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  calculatePrice: async (tenantId, vehicleType, minutes) => {
    try {
      return await pricingApi.calculatePrice(tenantId, vehicleType, minutes);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  checkRuleExists: async (tenantId, vehicleType) => {
    try {
      return await pricingApi.ruleExists(tenantId, vehicleType);
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  fetchActiveRulesCount: async (tenantId) => {
    try {
      const count = await pricingApi.getActiveRulesCount(tenantId);
      set({ activeRulesCount: count });
    } catch (error: any) {
      console.error('Error fetching active rules count:', error);
    }
  },

  getRuleByVehicleType: (vehicleType) => {
    const type = vehicleType.toUpperCase();
    const rules = get().rules;
    return rules.find(rule => rule.name.toUpperCase() === type);
  },

  getActiveRules: () => {
    const rules = get().rules;
    return rules.filter(rule => rule.is_active);
  },

  getInactiveRules: () => {
    const rules = get().rules;
    return rules.filter(rule => !rule.is_active);
  },

  reset: () => set({
    rules: [],
    loading: false,
    error: null,
    selectedRule: null,
    activeRulesCount: {
      EV: false,
      Bike: false,
      Car: false,
      AUTO: false,
    },
  }),
}));