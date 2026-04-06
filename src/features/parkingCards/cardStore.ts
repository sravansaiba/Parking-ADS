import { create } from "zustand";
import {
  generateCards as apiGenerateCards,
  fetchAllCards,
  toggleCardStatus as apiToggleCardStatus,
  searchCards as apiSearchCards,
  fetchTenantDetails as apiFetchTenantDetails,
  updateTenantDescription as apiUpdateTenantDescription,
  fetchCardCounts as fetchCardCounts,
} from "../../api/qrcodes/api";

export interface QRCode {
  id: string;
  tenant_id: string;
  code_text: string;
  label?: string;
  active: boolean;
  created_at: string;
  generated_at?: string;
  generation_batch_id?: string;
}

export interface TenantDescription {
  heading: string;
  points: string[];
  footer: string;
}

export interface Tenant {
  id: string;
  name: string;
  address?: string;
  description: {
    en: TenantDescription;
    hi: TenantDescription;
    te: TenantDescription;
  };
}

export interface GenerationBatch {
  id: string;
  timestamp: string;
  count: number;
  cardIds: string[];
}

export interface CardStore {
  qrCodes: QRCode[];
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  selectedLanguage: "en" | "hi" | "te";
  totalCards: number;
  activeCards: number;
  inactiveCards: number;
  generationHistory: GenerationBatch[];
  _isFetching: boolean;
  _lastFetchedAt: number | null;

  setTenant: (tenant: Tenant) => void;
  setQRCodes: (codes: QRCode[]) => void;
  setLanguage: (lang: "en" | "hi" | "te") => void;
  fetchCards: (tenantId: string) => Promise<void>;
  fetchCounts: (tenantId: string) => Promise<void>;
  fetchTenantDetails: (tenantId: string) => Promise<void>;
  updateTenantDescription: (description: Tenant["description"]) => Promise<void>;
  generateCards: (tenantId: string, count: number) => Promise<void>;
  toggleCardStatus: (cardId: string) => Promise<void>;
  searchLocal: (query: string) => QRCode[];
  searchServer: (tenantId: string, query: string) => Promise<QRCode[]>;
  getCardsByBatch: (batchId: string) => QRCode[];
  getRecentBatches: (limit?: number) => GenerationBatch[];
}

export const useCardStore = create<CardStore>((set, get) => ({
  qrCodes: [],
  tenant: null,
  loading: false,
  error: null,
  selectedLanguage: "en",
  totalCards: 0,
  activeCards: 0,
  inactiveCards: 0,
  generationHistory: [],
  _isFetching: false,
  _lastFetchedAt: null,

  setTenant: (tenant) => set({ tenant }),

  setQRCodes: (codes) => {
    set({ qrCodes: codes });
  },

  setLanguage: (lang) => set({ selectedLanguage: lang }),

  fetchCards: async (tenantId: string) => {
    const now = Date.now();
    const { _isFetching, _lastFetchedAt } = get();

    if (_isFetching || (_lastFetchedAt && now - _lastFetchedAt < 5000)) {
      return;
    }

    set({ _isFetching: true, error: null, _lastFetchedAt: now });

    try {
      const cards = await fetchAllCards(tenantId);
      get().setQRCodes(cards);
    } catch (e) {
      const err = e as Error;
      set({ error: err.message });
    } finally {
      set({ _isFetching: false });
    }
  },

  fetchTenantDetails: async (tenantId: string) => {
    try {
      const data = await apiFetchTenantDetails(tenantId);
      set({ tenant: data as Tenant });
    } catch (e) {
      console.error("Failed to fetch tenant details", e);
    }
  },

  fetchCounts: async (tenantId: string) => {
    try {
      const counts = await fetchCardCounts(tenantId);
      set({
        totalCards: counts.total,
        activeCards: counts.active,
        inactiveCards: counts.inactive,
      });
    } catch (e) {
      console.error("Failed to fetch card counts", e);
    }
  },

  updateTenantDescription: async (description) => {
    const tenant = get().tenant;
    if (!tenant) return;

    try {
      const updated = await apiUpdateTenantDescription(tenant.id, description);
      set({
        tenant: {
          ...tenant,
          description: updated.description,
        },
      });
    } catch (e) {
      console.error("Failed to update tenant description", e);
    }
  },

  generateCards: async (tenantId: string, count: number) => {
    set({ loading: true, error: null });

    try {
      const newCards = await apiGenerateCards(tenantId, count);
      const batchId = `batch_${Date.now()}`;
      const timestamp = new Date().toISOString();

      const cardsWithMeta = newCards.map((card: any) => ({
        ...card,
        generated_at: timestamp,
        generation_batch_id: batchId,
      }));

      const newBatch: GenerationBatch = {
        id: batchId,
        timestamp,
        count: newCards.length,
        cardIds: newCards.map((c:any) => c.id),
      };

      const updated = [...cardsWithMeta, ...get().qrCodes];
      const updatedHistory = [newBatch, ...get().generationHistory];

      set({
        qrCodes: updated,
        generationHistory: updatedHistory,
        loading: false,
      });
    } catch (e) {
      const err = e as Error;
      set({ error: err.message, loading: false });
    }
  },

  toggleCardStatus: async (cardId: string) => {
    const codes = get().qrCodes;
    const selected = codes.find((c) => c.id === cardId);

    if (!selected) return;

    try {
      await apiToggleCardStatus(cardId, selected.active);

      const updated = codes.map((c) =>
        c.id === cardId ? { ...c, active: !c.active } : c
      );

      get().setQRCodes(updated);
    } catch (e) {
      const err = e as Error;
      set({ error: err.message });
    }
  },

  searchLocal: (query: string) => {
    const lower = query.toLowerCase();
    return get().qrCodes.filter(
      (c) =>
        c.code_text.toLowerCase().includes(lower) ||
        (c.label || "").toLowerCase().includes(lower)
    );
  },

  searchServer: async (tenantId: string, query: string) => {
    try {
      return await apiSearchCards(tenantId, query);
    } catch (e) {
      const err = e as Error;
      set({ error: err.message });
      return [];
    }
  },

  getCardsByBatch: (batchId: string) => {
    return get().qrCodes.filter((c) => c.generation_batch_id === batchId);
  },

  getRecentBatches: (limit: number = 10) => {
    return get().generationHistory.slice(0, limit);
  },
}));