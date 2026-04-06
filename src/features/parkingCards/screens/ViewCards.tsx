import React, { JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Switch,
  ScrollView,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCardStore } from "../cardStore";
import { 
  fetchCards as apiFetchCards,
  toggleCardStatus as apiToggleStatus,
  deleteCard as apiDeleteCard
} from "../../../api/qrcodes/api";
import QRCardTemplate from "../components/QRCardTemplate";
import { captureRef } from "react-native-view-shot";
import * as Sharing from 'expo-sharing';
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system/legacy";

const SCREEN_WIDTH = Dimensions.get("window").width;
const LIMIT = 14;

// const generatePDFFromImage = async (imageUri: string): Promise<string> => {
//   try {
//     const base64 = await FileSystem.readAsStringAsync(imageUri, {
//       encoding: FileSystem.EncodingType.Base64,
//     });
//     const html = `<html><head><style>@page { size: A4; margin: 0; } body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; } img { width: 100%; height: auto; max-height: 100vh; object-fit: contain; }</style></head><body><img src="data:image/jpeg;base64,${base64}" /></body></html>`;
//     const pdf = await Print.printToFileAsync({ html });
//     return pdf.uri;
//   } catch (error) {
//     console.error("PDF generation error:", error);
//     throw error;
//   }
// };

const generatePDFFromImage = async (imageUri: string): Promise<string> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const html = `
      <html>
        <head>
          <style>
            @page { size: A4; margin: 0; }

            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background: white;
            }

            .container {
              width: 180mm;
              height: 260mm;
              display: flex;
              justify-content: center;
              align-items: center;
            }

            img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
          </style>
        </head>

        <body>
          <div class="container">
            <img src="data:image/jpeg;base64,${base64}" />
          </div>
        </body>
      </html>
    `;

    const pdf = await Print.printToFileAsync({
      html,
      width: 595,
      height: 842,
    });

    return pdf.uri;
  } catch (error) {
    console.error("PDF generation error:", error);
    throw error;
  }
};


const downloadSinglePDF = async (pdfPath: string, fileName: string) => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(pdfPath, {
        mimeType: 'application/pdf',
        dialogTitle: `Save ${fileName}`,
        UTI: 'com.adobe.pdf'
      });
    }
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

const createMultiPagePDF = async (imagePaths: string[]): Promise<string> => {
  try {
    const pages = [];
    for (let i = 0; i < imagePaths.length; i += 9) {
      pages.push(imagePaths.slice(i, i + 9));
    }

    const htmlContent = pages.map((pageImages) => {
      const imagesHtml = pageImages.map((uri) => `
        <div class="card-item">
          <img src="${uri}" class="qr-img" />
        </div>
      `).join("");

      return `
        <div class="page-container">
          <div class="grid-wrapper">
            ${imagesHtml}
          </div>
        </div>
      `;
    }).join("");

    const html = `
      <html>
        <head>
          <style>
            @page { size: A4; margin: 0; }

            body {
              margin: 0;
              padding: 0;
              background: white;
            }

            .page-container {
              width: 210mm;
              height: 297mm;
              padding: 10mm;
              box-sizing: border-box;
              page-break-after: always;
              display: flex;
              align-items: center;     /* center vertically */
              justify-content: center; /* center horizontally */
            }

            .grid-wrapper {
              width: 100%;
              height: 100%;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              grid-template-rows: repeat(3, 1fr);
              gap: 6mm;
            }

            .card-item {
              width: 100%;
              height: 100%;
              overflow: hidden;
              display: flex;
              align-items: stretch;
              justify-content: stretch;
            }

            .qr-img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              background: white;
            }

          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>`;

    const pdf = await Print.printToFileAsync({ html, width: 595, height: 842 });
    return pdf.uri;
  } catch (e) {
    console.error("PDF generation failed:", e);
    throw e;
  }
};

interface CardItem {
  id: string;
  code_text: string;
  label?: string;
  active: boolean;
  created_at: string;
  tenant_id?: string;
  address?: string;
  generated_at?: string;
  generation_batch_id?: string;
}

interface TenantDescription {
  heading: string;
  points: string[];
  footer: string;
}

interface ViewCardsProps {
  showMenu?: boolean;
  setShowMenu?: (show: boolean) => void;
}

export default function ViewCards({ showMenu, setShowMenu }: ViewCardsProps): JSX.Element {
  const { 
    tenant, 
    fetchTenantDetails, 
    updateTenantDescription, 
    selectedLanguage, 
    setLanguage, 
    setQRCodes, 
    getRecentBatches,
    getCardsByBatch 
  } = useCardStore();
  const tenantId = tenant?.id ?? "b457b988-9952-4dbe-9a6d-6fa1385a7785";

  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloadLoading, setDownloadLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive" | "recent">("all");
  const [showFilterMenu, setShowFilterMenu] = useState<boolean>(false);
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewCard, setPreviewCard] = useState<CardItem | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
  const [batchItems, setBatchItems] = useState<CardItem[]>([]);
  const [showEditTerms, setShowEditTerms] = useState(false);
  const [editHeading, setEditHeading] = useState("");
  const [editPoints, setEditPoints] = useState<string[]>([]);
  const [newPoint, setNewPoint] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showBatchMenu, setShowBatchMenu] = useState<boolean>(false);
  const [allCardsForBatch, setAllCardsForBatch] = useState<CardItem[]>([]);

  const previewRef = useRef<View | null>(null);
  const hiddenRefs = useRef<Record<string, View | null>>({});
  const loadingRef = useRef(false);
  const searchDebounce = useRef<any>(null);
  const cancelDownload = useRef(false);
  const [refreshing, setRefreshing] = useState(false);


  useEffect(() => { if (tenantId) fetchTenantDetails(tenantId); }, [tenantId]);

  const safeDescription = useMemo((): TenantDescription => {
    if (!tenant?.description) return { heading: "Terms & Conditions", points: ["Please follow parking rules"], footer: "powered by yourbrand.in" };
    const desc = tenant.description as any;
    const lang = selectedLanguage || "en";
    const langDesc = desc[lang] ?? desc.en ?? desc;
    return { heading: langDesc.heading || "Terms & Conditions", points: Array.isArray(langDesc.points) ? langDesc.points : [], footer: langDesc.footer || "powered by yourbrand.in" };
  }, [tenant, selectedLanguage]);

  useEffect(() => {
    if (!showEditTerms) return;
    setEditHeading(safeDescription.heading);
    setEditPoints([...safeDescription.points]);
  }, [showEditTerms, safeDescription]);

  useEffect(() => { if (showEditTerms) setEditingIndex(null); }, [showEditTerms]);

  // Fetch all cards for batch calculation
  const fetchAllForBatch = useCallback(async () => {
    try {
      const res = await apiFetchCards(tenantId, 1, 1000, {});
      setAllCardsForBatch((res.items ?? []) as CardItem[]);
    } catch (err) {
      console.error("Failed to fetch all cards:", err);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAllForBatch();
  }, [fetchAllForBatch]);

  const loadCards = useCallback(async (p = 1, showLoader = true) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (showLoader) setLoading(true);
    try {
      const options: { status?: "active" | "inactive"; search?: string } = {};
      if (filterStatus !== "all" && filterStatus !== "recent") options.status = filterStatus;
      if (search.trim().length > 0) options.search = search.trim();
      
      const res = await apiFetchCards(tenantId, p, LIMIT, options);
      let newCards = (res.items ?? []) as CardItem[];
      
      // If filter is "recent", show only cards created in last 24 hours
      if (filterStatus === "recent") {
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        newCards = newCards.filter(card => {
          if (!card.created_at) return false;
          const cardDate = new Date(card.created_at);
          return cardDate >= oneDayAgo;
        });
      }
      
      setCards(newCards);
      setTotalCount(filterStatus === "recent" ? newCards.length : (res.count ?? 0));
      setQRCodes(newCards.map(card => ({ 
        ...card, 
        tenant_id: card.tenant_id ?? tenantId, 
        label: card.label ?? undefined, 
        created_at: card.created_at ?? new Date().toISOString(),
        generated_at: card.generated_at,
        generation_batch_id: card.generation_batch_id
      })));
    } catch (err) {
      console.error("Failed to load cards:", err);
    } finally {
      loadingRef.current = false;
      if (showLoader) setLoading(false);
    }
  }, [tenantId, filterStatus, search, setQRCodes]);

  useEffect(() => { loadCards(1, true); setPage(1); }, [tenantId]);
  useEffect(() => { if (page > 1) loadCards(page, true); }, [page]);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => { setPage(1); loadCards(1, false); }, 350);
    return () => clearTimeout(searchDebounce.current);
  }, [search, filterStatus, loadCards]);

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelected(prev => (prev.size === cards.length ? new Set() : new Set(cards.map(c => c.id))));
  }, [cards]);

  const handleToggleStatus = useCallback(async (id: string, current: boolean) => {
    try {
      await apiToggleStatus(id, current);
      loadCards(page, false);
      if (previewCard && previewCard.id === id) {
        setPreviewCard({ ...previewCard, active: !current });
      }
      setCards(prev => prev.map(c => c.id === id ? { ...c, active: !current } : c));
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  }, [page, loadCards, previewCard]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await apiDeleteCard(id);
      loadCards(page, true);
      setPreviewCard(null);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }, [page, loadCards]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await loadCards(1, true);
    setRefreshing(false);
  }, [loadCards]);

  const handleDownloadSingleFromPreview = useCallback(async () => {
    if (!previewCard || !previewRef.current) return;
    setDownloadLoading(true);
    try {
      const imageUri = await captureRef(previewRef.current, { format: 'jpg', quality: 0.8 });
      const pdfPath = await generatePDFFromImage(imageUri);
      await downloadSinglePDF(pdfPath, `QR_${previewCard.code_text}`);
      setPreviewCard(null);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloadLoading(false);
    }
  }, [previewCard]);

  const handleBulkDownload = useCallback(async (batchId?: string) => {
    cancelDownload.current = false;
    setDownloadLoading(true);
    setShowBatchMenu(false);
    
    try {
      let allItems: CardItem[] = [];
      
      if (batchId) {
        // Download cards from last 24 hours
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        allItems = allCardsForBatch.filter(card => {
          if (!card.created_at) return false;
          const cardDate = new Date(card.created_at);
          return cardDate >= oneDayAgo;
        });
      } else {
        // Download all cards
        const res = await apiFetchCards(tenantId, 1, 1000, { 
          status: filterStatus !== "all" && filterStatus !== "recent" ? filterStatus : undefined, 
          search: search.trim() 
        });
        allItems = (res.items ?? []) as CardItem[];
      }
      
      if (allItems.length === 0) {
        setDownloadLoading(false);
        return;
      }

      const CHUNK_SIZE = 45;
      for (let i = 0; i < allItems.length; i += CHUNK_SIZE) {
        // Check if download was cancelled
        if (cancelDownload.current) {
          console.log("Download cancelled by user");
          break;
        }
        
        const chunk = allItems.slice(i, i + CHUNK_SIZE);
        hiddenRefs.current = {};
        setBatchItems(chunk);
        await new Promise(r => setTimeout(r, 6000));
        
        const imagePaths: string[] = [];
        for (const item of chunk) {
          if (cancelDownload.current) break;
          
          const ref = hiddenRefs.current[item.id];
          if (ref) {
            try {
              const uri = await captureRef(ref, { format: "jpg", quality: 0.6, result: "data-uri" });
              imagePaths.push(uri);
              await new Promise(r => setTimeout(r, 100));
            } catch (e) {
              console.error(e);
            }
          }
        }
        
        if (cancelDownload.current) break;
        
        if (imagePaths.length > 0) {
          const pdfPath = await createMultiPagePDF(imagePaths);
          const fileName = batchId 
            ? `QR_Recent_Cards_${Math.floor(i / CHUNK_SIZE) + 1}`
            : `QR_All_Cards_${Math.floor(i / CHUNK_SIZE) + 1}`;
          await downloadSinglePDF(pdfPath, fileName);
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error("Bulk download failed:", err);
    } finally {
      setDownloadLoading(false);
      setBatchItems([]);
      cancelDownload.current = false;
    }
  }, [tenantId, filterStatus, search, allCardsForBatch]);

  const handleSaveTerms = async () => {
    if (!tenant) return;
    const updatedDescription = { 
      ...tenant.description, 
      [selectedLanguage]: { 
        heading: editHeading, 
        points: editPoints, 
        footer: tenant.description[selectedLanguage]?.footer || "", 
      }, 
    };
    await updateTenantDescription(updatedDescription);
    setShowEditTerms(false);
  };

  const recentBatches = useMemo(() => {
    // Get cards from last 24 hours from ALL cards
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    const recentCards = allCardsForBatch.filter(card => {
      if (!card.created_at) return false;
      const cardDate = new Date(card.created_at);
      return cardDate >= oneDayAgo;
    });

    if (recentCards.length === 0) return [];

    return [{
      id: 'recent_24h',
      timestamp: new Date().toISOString(),
      count: recentCards.length,
      cardIds: recentCards.map(c => c.id)
    }];
  }, [allCardsForBatch]);

  const renderItem = useCallback(({ item }: { item: CardItem }) => (
    <TouchableOpacity 
      activeOpacity={0.95} 
      onLongPress={() => { setSelectionMode(true); toggleSelect(item.id); }} 
      onPress={() => selectionMode ? toggleSelect(item.id) : setPreviewCard(item)} 
      style={[styles.tile, !item.active && styles.tileInactive, selected.has(item.id) && styles.tileSelected]}
    >
      <View style={styles.tileContent}>
        <View style={styles.tileHeader}>
          <View style={styles.tileNumberContainer}>
            <Ionicons name="qr-code-outline" size={20} color="#64748B" />
            <Text style={styles.tileCode} numberOfLines={1}>{item.code_text.replace('APK-', '')}</Text>
          </View>
          {!selectionMode && (
            <Switch
              value={item.active}
              onValueChange={() => handleToggleStatus(item.id, item.active)}
              trackColor={{ false: "#FEE2E2", true: "#D1FAE5" }}
              thumbColor={item.active ? "#10B981" : "#EF4444"}
              ios_backgroundColor="#FEE2E2"
              style={styles.toggleSwitch}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  ), [selected, selectionMode, toggleSelect, handleToggleStatus]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.controlBar}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color="#64748B" />
            <TextInput 
              value={search} 
              onChangeText={setSearch} 
              placeholder="Search code..." 
              placeholderTextColor="#94A3B8" 
              style={styles.searchInput} 
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={styles.iconControl} 
            onPress={() => setShowFilterMenu(true)}
          >
            <Ionicons name="filter" size={18} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.iconControl, selectionMode && styles.iconControlActive]} 
            onPress={() => { 
              setSelectionMode(!selectionMode); 
              if (selectionMode) setSelected(new Set()); 
            }}
          >
            <Ionicons name="checkmark-done" size={18} color={selectionMode ? "#fff" : "#475569"} />
          </TouchableOpacity>
        </View>
      </View>

      {selectionMode && (
        <View style={styles.selectionBar}>
          <TouchableOpacity onPress={selectAllVisible}>
            <Text style={styles.selectAllText}>
              {selected.size === cards.length ? "Deselect all" : "Select all"}
            </Text>
          </TouchableOpacity>
          <View style={styles.selectionActions}>
            <TouchableOpacity 
              style={[styles.bulkBtn, downloadLoading && styles.bulkBtnDisabled]} 
              onPress={() => handleBulkDownload()} 
              disabled={downloadLoading}
            >
              {downloadLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.bulkBtnText}>Download ({totalCount})</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.bulkBtn, styles.bulkBtnCancel]} 
              onPress={() => { setSelectionMode(false); setSelected(new Set()); }} 
              disabled={downloadLoading}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.cardGrid}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : (
          <FlatList 
            data={cards} 
            keyExtractor={i => i.id} 
            renderItem={renderItem} 
            contentContainerStyle={styles.listContent} 
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#0e0d0d']}
                tintColor="#0f0e0e"
              />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyWrap}>
                <Ionicons name="file-tray-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No cards found</Text>
              </View>
            )} 
          />
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          disabled={page === 1} 
          onPress={() => setPage(p => Math.max(1, p - 1))} 
          style={[styles.paginationBtn, page === 1 && styles.paginationBtnDisabled]}
        >
          <Ionicons name="chevron-back" size={20} color={page === 1 ? "#CBD5E1" : "#F97316"} />
        </TouchableOpacity>
        
        <Text style={styles.pageText}>
          Showing {((page - 1) * LIMIT) + 1}-{Math.min(page * LIMIT, totalCount)} of {totalCount}
        </Text>

        <TouchableOpacity 
          disabled={cards.length < LIMIT} 
          onPress={() => setPage(p => p + 1)} 
          style={[styles.paginationBtn, cards.length < LIMIT && styles.paginationBtnDisabled]}
        >
          <Ionicons name="chevron-forward" size={20} color={cards.length < LIMIT ? "#CBD5E1" : "#F97316"} />
        </TouchableOpacity>
      </View>

      <Modal visible={!!previewCard} transparent animationType="fade" onRequestClose={() => setPreviewCard(null)}>
        <TouchableWithoutFeedback onPress={() => setPreviewCard(null)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.modalCenter}>
          <View style={styles.modalCard}>
            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View collapsable={false} ref={previewRef} style={styles.previewWrap}>
                {previewCard && (
                  <QRCardTemplate 
                    code={previewCard.code_text} 
                    label={previewCard.label ?? "QR Card"} 
                    tenantName={tenant?.name ?? ""} 
                    address={previewCard.address ?? tenant?.address} 
                    description={safeDescription} 
                    language={selectedLanguage as any ?? "en"} 
                  />
                )}
              </View>
              <Text style={styles.modalCode}>{previewCard?.code_text.replace('APK-', '')}</Text>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.primaryBtn} 
                  onPress={handleDownloadSingleFromPreview} 
                  disabled={downloadLoading}
                >
                  {downloadLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>Download</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteBtn} 
                  onPress={() => previewCard && handleDelete(previewCard.id)} 
                  disabled={downloadLoading}
                >
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.secondaryBtn} 
                  onPress={() => setPreviewCard(null)} 
                  disabled={downloadLoading}
                >
                  <Text style={styles.secondaryBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View pointerEvents="none" style={{ position: "absolute", left: -SCREEN_WIDTH * 5, top: 0 }}>
        {batchItems.map((item) => (
          <View 
            key={`batch-${item.id}`} 
            collapsable={false} 
            ref={r => { hiddenRefs.current[item.id] = r; }} 
            style={{
              width: SCREEN_WIDTH,
              backgroundColor: "white",   
              alignItems: "center",
              justifyContent: "flex-start"
            }}
          >
            <QRCardTemplate 
              code={item.code_text} 
              label={item.label ?? "QR Card"} 
              tenantName={tenant?.name ?? ""} 
              address={item.address ?? tenant?.address} 
              description={safeDescription} 
              language={selectedLanguage as any ?? "en"} 
            />
          </View>
        ))}
      </View>

      {downloadLoading && (
        <View style={styles.progressOverlay}>
          <View style={styles.progressCard}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.progressText}>Processing cards...</Text>
            <TouchableOpacity 
              style={styles.cancelDownloadBtn} 
              onPress={() => {
                cancelDownload.current = true;
                setDownloadLoading(false);
                setBatchItems([]);
              }}
            >
              <Text style={styles.cancelDownloadText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={showFilterMenu} transparent animationType="fade" onRequestClose={() => setShowFilterMenu(false)}>
        <TouchableWithoutFeedback onPress={() => setShowFilterMenu(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.filterMenuCenter}>
          <View style={styles.filterMenu}>
            <Text style={styles.filterMenuTitle}>Filter Cards</Text>
            
            {[
              { key: "all", label: "All Cards", icon: "apps-outline" },
              { key: "active", label: "Active Only", icon: "checkmark-circle-outline" },
              { key: "inactive", label: "Inactive Only", icon: "close-circle-outline" },
              { key: "recent", label: "Recent Generated", icon: "time-outline" }
            ].map((filter) => (
              <TouchableOpacity 
                key={filter.key}
                style={[styles.filterOption, filterStatus === filter.key && styles.filterOptionActive]} 
                onPress={() => { 
                  setFilterStatus(filter.key as any); 
                  setPage(1); 
                  loadCards(1, true);
                  setShowFilterMenu(false);
                }}
              >
                <Ionicons name={filter.icon as any} size={22} color={filterStatus === filter.key ? "#4F46E5" : "#64748B"} />
                <Text style={[styles.filterOptionText, filterStatus === filter.key && styles.filterOptionTextActive]}>
                  {filter.label}
                </Text>
                {filterStatus === filter.key && <Ionicons name="checkmark" size={20} color="#4F46E5" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={showMenu ?? false} transparent animationType="fade" onRequestClose={() => setShowMenu?.(false)}>
        <TouchableWithoutFeedback onPress={() => setShowMenu?.(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.menuModalCenter}>
          <View style={styles.menuModal}>
            <Text style={styles.menuTitle}>Settings & Downloads</Text>
            
            <TouchableOpacity 
              style={styles.menuOption} 
              onPress={() => { setShowMenu?.(false); setShowLanguageModal(true); }}
            >
              <Ionicons name="language" size={22} color="#4F46E5" />
              <View style={styles.menuOptionContent}>
                <Text style={styles.menuOptionText}>Language</Text>
                <Text style={styles.menuOptionSubtext}>
                  {selectedLanguage === 'en' ? 'English' : selectedLanguage === 'hi' ? 'हिंदी' : 'తెలుగు'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuOption} 
              onPress={() => { setShowMenu?.(false); setShowEditTerms(true); }}
            >
              <Ionicons name="create-outline" size={22} color="#4F46E5" />
              <View style={styles.menuOptionContent}>
                <Text style={styles.menuOptionText}>Edit Terms</Text>
                <Text style={styles.menuOptionSubtext}>Modify terms & conditions</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity 
              style={styles.menuOption} 
              onPress={() => { setShowMenu?.(false); setShowBatchMenu(true); }}
            >
              <Ionicons name="download-outline" size={22} color="#F97316" />
              <View style={styles.menuOptionContent}>
                <Text style={styles.menuOptionText}>Download Cards</Text>
                <Text style={styles.menuOptionSubtext}>Download all or recent</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCloseBtn} onPress={() => setShowMenu?.(false)}>
              <Text style={styles.menuCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal 
        visible={showBatchMenu} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setShowBatchMenu(false)}
      >
        <View style={styles.modalOverlay} />
        <View style={styles.batchMenuCenter}>
          <View style={styles.batchMenu}>
            <Text style={styles.filterMenuTitle}>Download Options</Text>
            
            <TouchableOpacity 
              style={styles.batchOption} 
              onPress={() => handleBulkDownload()}
              disabled={downloadLoading}
            >
              <Ionicons name="download" size={22} color="#4F46E5" />
              <View style={styles.menuOptionContent}>
                <Text style={styles.menuOptionText}>Download All Cards</Text>
                <Text style={styles.menuOptionSubtext}>{totalCount} total cards</Text>
              </View>
            </TouchableOpacity>

            {recentBatches.length > 0 && (
              <>
                <View style={styles.menuDivider} />
                <Text style={styles.batchSectionTitle}>Recent Cards</Text>
                
                {recentBatches.map((batch) => (
                  <TouchableOpacity 
                    key={batch.id}
                    style={styles.batchOption} 
                    onPress={() => handleBulkDownload(batch.id)}
                    disabled={downloadLoading}
                  >
                    <Ionicons name="time-outline" size={22} color="#F97316" />
                    <View style={styles.menuOptionContent}>
                      <Text style={styles.menuOptionText}>
                        Recent Cards (Last 24h)
                      </Text>
                      <Text style={styles.menuOptionSubtext}>{batch.count} cards</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <TouchableOpacity 
              style={styles.languageModalClose} 
              onPress={() => setShowBatchMenu(false)}
            >
              <Text style={styles.languageModalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showLanguageModal} transparent animationType="fade" onRequestClose={() => setShowLanguageModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowLanguageModal(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.languageModalCenter}>
          <View style={styles.languageModal}>
            <Text style={styles.languageModalTitle}>Select Language</Text>
            {[
              { code: "en", label: "English" }, 
              { code: "hi", label: "हिंदी (Hindi)" }, 
              { code: "te", label: "తెలుగు (Telugu)" }
            ].map(lang => (
              <TouchableOpacity 
                key={lang.code} 
                style={[styles.languageOption, selectedLanguage === lang.code && styles.languageOptionActive]} 
                onPress={() => { setLanguage(lang.code as any); setShowLanguageModal(false); }}
              >
                <Text style={[styles.languageOptionText, selectedLanguage === lang.code && styles.languageOptionTextActive]}>
                  {lang.label}
                </Text>
                {selectedLanguage === lang.code && <Ionicons name="checkmark-circle" size={20} color="#4F46E5" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.languageModalClose} onPress={() => setShowLanguageModal(false)}>
              <Text style={styles.languageModalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showEditTerms} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowEditTerms(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.editModalCenter}>
          <View style={styles.editModalCard}>
            <Text style={styles.languageModalTitle}>Edit Terms & Conditions</Text>
            <TextInput 
              value={editHeading} 
              onChangeText={setEditHeading} 
              placeholder="Heading" 
              style={styles.editBox} 
            />
            <View style={styles.pointsContainer}>
              <ScrollView 
                style={styles.pointsScrollView} 
                contentContainerStyle={styles.pointsContent} 
                keyboardShouldPersistTaps="handled"
              >
                {editPoints.map((p, index) => (
                  <View key={index} style={styles.pointRow}>
                    {editingIndex === index ? (
                      <TextInput 
                        value={editPoints[index]} 
                        onChangeText={(text) => { 
                          const updated = [...editPoints]; 
                          updated[index] = text; 
                          setEditPoints(updated); 
                        }} 
                        style={[styles.editBox, styles.pointEditInput]} 
                        autoFocus 
                      />
                    ) : (
                      <Text style={styles.pointText}>{p}</Text>
                    )}
                    <TouchableOpacity 
                      style={styles.pointActionBtn} 
                      onPress={() => setEditingIndex(index)}
                    >
                      <Ionicons name="create-outline" size={20} color="#2563EB" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.pointActionBtn} 
                      onPress={() => setEditPoints(editPoints.filter((_, i) => i !== index))}
                    >
                      <Ionicons name="trash-outline" size={20} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.addPointContainer}>
                <TextInput 
                  value={newPoint} 
                  onChangeText={setNewPoint} 
                  placeholder="Add new point" 
                  style={styles.addPointInput} 
                />
                <TouchableOpacity 
                  style={styles.addPointBtn} 
                  onPress={() => { 
                    if (!newPoint.trim()) return; 
                    setEditPoints([...editPoints, newPoint.trim()]); 
                    setNewPoint(""); 
                  }}
                >
                  <Ionicons name="add-circle" size={35} color="#f97316" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={[styles.secondaryBtn, styles.modalButton]} 
                onPress={() => setShowEditTerms(false)}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.editPrimaryBtn, styles.modalButton]} 
                onPress={handleSaveTerms}
              >
                <Text style={styles.primaryBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  controlBar: { 
    paddingHorizontal: 16, 
    paddingTop: 12, 
    paddingBottom: 12, 
    backgroundColor: "#fff", 
    borderBottomWidth: 1, 
    borderBottomColor: "#E2E8F0" 
  },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchBox: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8, 
    backgroundColor: "#F8FAFC", 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: "#E2E8F0",
    maxWidth: "75%"
  },
  searchInput: { flex: 1, color: "#0F172A", fontSize: 14, padding: 0 },
  iconControl: { 
    width: 38, 
    height: 38, 
    borderRadius: 10, 
    backgroundColor: "#F8FAFC", 
    alignItems: "center", 
    justifyContent: "center", 
    borderWidth: 1, 
    borderColor: "#E2E8F0" 
  },
  iconControlActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5"
  },
  selectionBar: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    backgroundColor: "#EEF2FF" 
  },
  selectAllText: { color: "#4F46E5", fontWeight: "700", fontSize: 14 },
  selectionActions: { flexDirection: "row", gap: 8 },
  bulkBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#4F46E5", 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8 
  },
  bulkBtnDisabled: { opacity: 0.5, backgroundColor: "#9CA3AF" },
  bulkBtnCancel: { backgroundColor: "#6B7280", paddingHorizontal: 10 },
  bulkBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  cardGrid: { flex: 1, paddingHorizontal: 12 },
  listContent: { paddingTop: 12, paddingBottom: 20 },
  tile: { 
    backgroundColor: "#fff", 
    borderRadius: 12, 
    padding: 5, 
    paddingLeft: 15,
    borderWidth: 1, 
    borderColor: "#E2E8F0",
    marginBottom:7
  },
  tileSelected: { borderWidth: 2, borderColor: "#4F46E5", backgroundColor: "#EEF2FF" },
  tileInactive: { opacity: 0.6 },
  tileContent: { flex: 1 },
  tileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  tileNumberContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8,
    flex: 1
  },
  tileCode: { 
    fontWeight: "600", 
    fontSize: 14, 
    color: "#0F172A", 
    flex: 1 
  },
  toggleSwitch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }]
  },
  loadingWrap: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: 40 
  },
  emptyWrap: { padding: 40, alignItems: "center" },
  emptyText: { color: "#64748B", fontSize: 14, marginTop: 12 },
  footer: { 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12, 
    paddingHorizontal: 16,
    borderTopWidth: 1, 
    borderColor: "#E2E8F0", 
    backgroundColor: "#fff",
    gap: 12
  },
  paginationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FDBA74"
  },
  paginationBtnDisabled: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0"
  },
  pageText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600"
  },
  modalOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: "rgba(0,0,0,0.6)" 
  },
  modalCenter: { 
    position: "absolute", 
    left: 20, 
    right: 20, 
    top: "10%", 
    bottom: "10%", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  modalCard: { 
    width: "100%", 
    maxHeight: "100%", 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    padding: 20 
  },
  modalScroll: { alignItems: "center" },
  previewWrap: { width: "100%", alignItems: "center" },
  modalCode: { 
    marginTop: 16, 
    fontWeight: "700", 
    fontSize: 16, 
    color: "#0F172A", 
    marginBottom: 12 
  },
  modalActions: { 
    flexDirection: "row", 
    gap: 8, 
    marginTop: 12, 
    flexWrap: "wrap", 
    justifyContent: "center" 
  },
  primaryBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#4F46E5", 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 10,
    gap: 6
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  deleteBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#EF4444", 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 10,
    gap: 6
  },
  deleteBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  secondaryBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#6B7280", 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 10 
  },
  secondaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999
  },
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    minWidth: 250
  },
  progressText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center"
  },
  cancelDownloadBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#EF4444",
    borderRadius: 8
  },
  cancelDownloadText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700"
  },
  filterMenuCenter: {
    position: "absolute",
    right: 16,
    top: 100,
    width: 240
  },
  filterMenu: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8
      },
      android: {
        elevation: 6
      }
    })
  },
  filterMenuTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
    paddingHorizontal: 8
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4
  },
  filterOptionActive: {
    backgroundColor: "#EEF2FF"
  },
  filterOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B"
  },
  filterOptionTextActive: {
    color: "#4F46E5"
  },
  menuModalCenter: { 
    position: "absolute", 
    right: 16, 
    top: 60, 
    width: 320, 
    maxWidth: "90%" 
  },
  menuModal: { 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    padding: 16, 
    ...Platform.select({ 
      ios: { 
        shadowColor: "#000", 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.3, 
        shadowRadius: 8 
      }, 
      android: { 
        elevation: 8 
      } 
    }) 
  },
  menuTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginBottom: 16 },
  menuOption: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12, 
    paddingVertical: 14, 
    paddingHorizontal: 12, 
    borderRadius: 10, 
    backgroundColor: "#F8FAFC", 
    marginBottom: 8 
  },
  menuOptionContent: { flex: 1 },
  menuOptionText: { fontSize: 15, fontWeight: "600", color: "#0F172A" },
  menuOptionSubtext: { fontSize: 12, color: "#64748B", marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 8 },
  menuCloseBtn: { 
    marginTop: 8, 
    paddingVertical: 12, 
    alignItems: "center", 
    backgroundColor: "#F1F5F9", 
    borderRadius: 10 
  },
  menuCloseBtnText: { fontSize: 15, fontWeight: "600", color: "#64748B" },
  batchMenuCenter: { 
    position: "absolute", 
    left: 20, 
    right: 20, 
    top: "20%", 
    maxHeight: "60%"
  },
  batchMenu: { 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    padding: 16,
    maxHeight: "100%",
    ...Platform.select({ 
      ios: { 
        shadowColor: "#000", 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.3, 
        shadowRadius: 8 
      }, 
      android: { 
        elevation: 8 
      } 
    }) 
  },
  batchSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  batchOption: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12, 
    paddingVertical: 12, 
    paddingHorizontal: 12, 
    borderRadius: 10, 
    backgroundColor: "#F8FAFC", 
    marginBottom: 8 
  },
  languageModalCenter: { 
    position: "absolute", 
    left: 40, 
    right: 40, 
    top: "30%", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  languageModal: { 
    width: "100%", 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    padding: 20 
  },
  languageModalTitle: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#0F172A", 
    marginBottom: 16, 
    textAlign: "center" 
  },
  languageOption: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    borderRadius: 10, 
    backgroundColor: "#F8FAFC", 
    marginBottom: 10 
  },
  languageOptionActive: { 
    backgroundColor: "#EEF2FF", 
    borderWidth: 2, 
    borderColor: "#4F46E5" 
  },
  languageOptionText: { fontSize: 15, fontWeight: "600", color: "#475569" },
  languageOptionTextActive: { color: "#4F46E5" },
  languageModalClose: { marginTop: 8, paddingVertical: 12, alignItems: "center" },
  languageModalCloseText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  editModalCenter: { 
    position: "absolute", 
    top: "4%", 
    bottom: "4%", 
    left: 8, 
    right: 8, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  editModalCard: { 
    width: "100%", 
    height: "80%", 
    backgroundColor: "#FFFFFF", 
    borderRadius: 20, 
    padding: 20 
  },
  editBox: { 
    height: 44, 
    paddingHorizontal: 15, 
    paddingVertical: 6, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: "#E2E8F0", 
    backgroundColor: "#F8FAFC", 
    fontSize: 14, 
    color: "#0F172A", 
    marginBottom: 10 
  },
  editPrimaryBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: '#f97316', 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 10 
  },
  pointsContainer: { flex: 1, marginBottom: 16 },
  pointsScrollView: { flex: 1, maxHeight: 300 },
  pointsContent: { paddingTop: 8, paddingBottom: 12 },
  pointRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  pointText: { flex: 1, fontSize: 14, color: "#0F172A", lineHeight: 20 },
  pointEditInput: { flex: 1, height: 38, marginBottom: 0 },
  pointActionBtn: { padding: 4 },
  addPointContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: "#E2E8F0", 
    backgroundColor: "#fff" 
  },
  addPointInput: { 
    flex: 1, 
    height: 44, 
    paddingHorizontal: 15, 
    paddingVertical: 6, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: "#E2E8F0", 
    backgroundColor: "#F8FAFC", 
    fontSize: 14, 
    color: "#0F172A" 
  },
  addPointBtn: { padding: 4 },
  modalButtonRow: { flexDirection: "row", width: "100%", marginTop: 16, gap: 12 },
  modalButton: { flex: 1, alignItems: "center", justifyContent: "center" },
});