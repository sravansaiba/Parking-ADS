export interface PricingRule {
  id: string;
  tenant_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface PricingRuleItem {
  id: string;
  rule_id: string;
  min_minutes: number;
  max_minutes: number | null;
  price: number;
  created_at: string;
}

export interface PricingRuleWithItems extends PricingRule {
  items: PricingRuleItem[];
}

export interface CreateRulePayload {
  tenant_id: string;
  name: string;
  items: {
    min_minutes: number;
    max_minutes: number | null;
    price: number;
  }[];
}

export interface UpdateRulePayload {
  name?: string;
  is_active?: boolean;
  items?: {
    id?: string;
    min_minutes: number;
    max_minutes: number | null;
    price: number;
  }[];
}
