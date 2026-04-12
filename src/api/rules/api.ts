import { supabase } from '../../services/supabase';
import { CreateRulePayload, PricingRuleWithItems, UpdateRulePayload } from '../../types/pricingrules';


export const pricingApi = {
  /**
   * Get all pricing rules for a tenant
   */
  getAllRules: async (tenantId: string): Promise<PricingRuleWithItems[]> => {
    try {
      const { data: rules, error: rulesError } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (rulesError) throw rulesError;
      if (!rules || rules.length === 0) return [];

      const ruleIds = rules.map(r => r.id);
      const { data: items, error: itemsError } = await supabase
        .from('pricing_rule_items')
        .select('*')
        .in('rule_id', ruleIds)
        .order('min_minutes', { ascending: true });

      if (itemsError) throw itemsError;

      const rulesWithItems = rules.map(rule => ({
        ...rule,
        items: items?.filter(item => item.rule_id === rule.id) || [],
      }));

      return rulesWithItems;
    } catch (error) {
      console.error('Error fetching pricing rules:', error);
      throw error;
    }
  },

  /**
   * Get a single pricing rule with items
   */
  getRule: async (ruleId: string): Promise<PricingRuleWithItems | null> => {
    try {
      const { data: rule, error: ruleError } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('id', ruleId)
        .single();

      if (ruleError) throw ruleError;
      if (!rule) return null;

      const { data: items, error: itemsError } = await supabase
        .from('pricing_rule_items')
        .select('*')
        .eq('rule_id', ruleId)
        .order('min_minutes', { ascending: true });

      if (itemsError) throw itemsError;

      return {
        ...rule,
        items: items || [],
      };
    } catch (error) {
      console.error('Error fetching pricing rule:', error);
      throw error;
    }
  },

  /**
   * Create a new pricing rule with items
   */
  createRule: async (payload: CreateRulePayload): Promise<PricingRuleWithItems> => {
    try {
      const { data: rule, error: ruleError } = await supabase
        .from('pricing_rules')
        .insert({
          tenant_id: payload.tenant_id,
          name: payload.name,
          is_active: true,
        })
        .select()
        .single();

      if (ruleError) throw ruleError;
      if (!rule) throw new Error('Failed to create rule');

      const itemsToInsert = payload.items.map(item => ({
        rule_id: rule.id,
        min_minutes: item.min_minutes,
        max_minutes: item.max_minutes,
        price: item.price,
      }));

      const { data: items, error: itemsError } = await supabase
        .from('pricing_rule_items')
        .insert(itemsToInsert)
        .select();

      if (itemsError) throw itemsError;

      return {
        ...rule,
        items: items || [],
      };
    } catch (error) {
      console.error('Error creating pricing rule:', error);
      throw error;
    }
  },

  /**
   * Update a pricing rule
   */
  updateRule: async (
    ruleId: string,
    payload: UpdateRulePayload
  ): Promise<PricingRuleWithItems> => {
    try {
      if (payload.name !== undefined || payload.is_active !== undefined) {
        const updateData: any = {};
        if (payload.name !== undefined) updateData.name = payload.name;
        if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

        const { error: ruleError } = await supabase
          .from('pricing_rules')
          .update(updateData)
          .eq('id', ruleId);

        if (ruleError) throw ruleError;
      }

      if (payload.items) {
        const { error: deleteError } = await supabase
          .from('pricing_rule_items')
          .delete()
          .eq('rule_id', ruleId);

        if (deleteError) throw deleteError;

        const itemsToInsert = payload.items.map(item => ({
          rule_id: ruleId,
          min_minutes: item.min_minutes,
          max_minutes: item.max_minutes,
          price: item.price,
        }));

        const { error: itemsError } = await supabase
          .from('pricing_rule_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      const updatedRule = await pricingApi.getRule(ruleId);
      if (!updatedRule) throw new Error('Failed to fetch updated rule');

      return updatedRule;
    } catch (error) {
      console.error('Error updating pricing rule:', error);
      throw error;
    }
  },

  /**
   * Delete a pricing rule
   */
  deleteRule: async (ruleId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('pricing_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting pricing rule:', error);
      throw error;
    }
  },

  /**
   * Toggle rule active status
   */
  toggleRuleStatus: async (ruleId: string, isActive: boolean): Promise<void> => {
    try {
      const { error } = await supabase
        .from('pricing_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId);

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling rule status:', error);
      throw error;
    }
  },

  /**
   * Calculate price with 24-hour continuous looping logic
   */
  calculatePrice: async (
    tenantId: string,
    vehicleType: string,
    minutes: number
  ): Promise<number> => {
    try {
      const type = vehicleType;

      const { data: rule, error: ruleError } = await supabase
        .from('pricing_rules')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', type)
        .eq('is_active', true)
        .single();

      if (ruleError || !rule) {
        throw new Error('No active pricing rule found');
      }

      const { data: items, error: itemsError } = await supabase
        .from('pricing_rule_items')
        .select('*')
        .eq('rule_id', rule.id)
        .order('min_minutes', { ascending: true });

      if (itemsError || !items || items.length === 0) {
        throw new Error('No pricing items found');
      }

      const DAY_MINUTES = 1440;

      if (type === 'Car' || type === 'Auto') {
        const cycles = Math.ceil(minutes / DAY_MINUTES);

        const dailyItem =
          items.find(i => i.max_minutes === null) || items[items.length - 1];

        return cycles * Number(dailyItem.price);
      }

      if (type === 'EV' || type === 'Bike') {
        const fullDays = Math.floor(minutes / DAY_MINUTES);
        const remaining = minutes % DAY_MINUTES;

        const maxItem =
          items.find(i => i.max_minutes === null) || items[items.length - 1];

        let total = fullDays * Number(maxItem.price);

        if (remaining > 0) {
          const slab = items.find(
            i =>
              remaining >= i.min_minutes &&
              (i.max_minutes === null || remaining <= i.max_minutes)
          );

          total += slab ? Number(slab.price) : Number(maxItem.price);
        }

        return total;
      }

      return 0;
    } catch (error) {
      console.error('Error calculating price:', error);
      throw error;
    }
  },

  /**
   * Check if vehicle type rule exists
   */
  ruleExists: async (tenantId: string, vehicleType: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', vehicleType)
        .single();

      if (error && error.code !== 'PGRST116') throw error; 
      return !!data;
    } catch (error) {
      console.error('Error checking rule existence:', error);
      return false;
    }
  },

  /**
   * Get active rules count by vehicle type
   */
  getActiveRulesCount: async (tenantId: string): Promise<{
    EV: boolean;
    Bike: boolean;
    Car: boolean;
    Auto: boolean;
  }> => {
    try {
      const { data: rules, error } = await supabase
        .from('pricing_rules')
        .select('name, is_active')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const result = { EV: false, Bike: false, Car: false, Auto: false };

      rules?.forEach(rule => {
        const key = rule.name?.toUpperCase();

        if (rule.is_active) {
          if (key === 'EV') result.EV = true;
          if (key === 'BIKE') result.Bike = true;
          if (key === 'CAR') result.Car = true;
          if (key === 'Auto') result.Auto = true;
        }
      });

      return result;
    } catch (error) {
      console.error('Error getting active rules count:', error);
      throw error;
    }
  },
};

export default pricingApi;