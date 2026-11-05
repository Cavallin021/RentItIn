import React, { useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  TextInput as RNTextInput,
  Switch,
  StatusBar,
  Platform,
  Alert,
} from "react-native";
import {
  Modal,
  Portal,
  Provider,
  MD3LightTheme,
  MD3DarkTheme,
} from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import { STORAGE_KEYS } from "./constants";
import axios from "axios";

const API_URL = "https://rentitin-api.onrender.com/finance";
// const API_URL = "http://192.168.15.15:3000/finance";

const THEME_STORAGE_KEY = "@app_dark_mode";

const Meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const formatCurrency = (val) => {
  if (val === undefined || val === null || val === "") return "0,00";
  const num =
    typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
  if (isNaN(num)) return "0,00";
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const parts = abs.toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${isNegative ? "- " : ""}${parts.join(",")}`;
};

export default function App() {
  const systemColorScheme = useColorScheme();
  const [darkModeOverride, setDarkModeOverride] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const isDark =
    darkModeOverride !== null ? darkModeOverride : systemColorScheme === "dark";
  const paperTheme = isDark ? MD3DarkTheme : MD3LightTheme;

  // Palette based on Stitch PDF Design
  const colors = useMemo(
    () => ({
      bg: isDark ? "#0B0F17" : "#F8FAFC",
      surface: isDark ? "#151C28" : "#FFFFFF",
      surfaceSubtle: isDark ? "#1E293B" : "#F1F5F9",
      inputBg: isDark ? "#0F172A" : "#F8FAFC",
      border: isDark ? "#232D3F" : "#E2E8F0",
      textPrimary: isDark ? "#F8FAFC" : "#0F172A",
      textSecondary: isDark ? "#94A3B8" : "#64748B",
      textMuted: isDark ? "#64748B" : "#94A3B8",
      primary: "#4F46E5",
      primarySoft: isDark ? "rgba(79, 70, 229, 0.2)" : "#EEF2FF",
      emerald: "#10B981",
      emeraldDark: isDark ? "#34D399" : "#059669",
      emeraldSoft: isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5",
      emeraldBorder: isDark ? "rgba(16, 185, 129, 0.5)" : "#34D399",
      rose: "#F43F5E",
      roseDark: isDark ? "#FB7185" : "#E11D48",
      roseSoft: isDark ? "rgba(244, 63, 94, 0.15)" : "#FFF1F2",
      roseBorder: isDark ? "rgba(244, 63, 94, 0.45)" : "#FDA4AF",
      amberSoft: isDark ? "rgba(245, 158, 11, 0.15)" : "#FEF3C7",
      amber: "#F59E0B",
    }),
    [isDark],
  );

  // Navigation Tabs: "inicio" | "metas" | "cartoes" | "ajustes"
  const [activeTab, setActiveTab] = useState("inicio");

  // Core finance states
  const [total, setTotal] = useState(new Array(13).fill(0));
  const [totalLC, setTotalLC] = useState(new Array(13).fill(0));
  const [visible, setVisible] = useState(false);
  const [visibleInstructions, setVisibleInstructions] = useState(false);
  const [visibleEdit, setVisibleEdit] = useState(false);
  const [visibleLimpar, setVisibleLimpar] = useState(false);

  const [name, setName] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("Lenicard");
  const [loading, setLoading] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);
  const [parcelas, setParcelas] = useState(1);
  const [localMessage, setLocalMessage] = useState("");

  // Edit modal states (Page 2 of PDF)
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [editName, setEditName] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editCategoria, setEditCategoria] = useState("Débito");
  const [editMes, setEditMes] = useState(1);
  const [editParcelas, setEditParcelas] = useState(1);

  // Limpar Mês states (Page 5 of PDF)
  const [mesLimpar, setMesLimpar] = useState(1);
  const [senhaLimpar, setSenhaLimpar] = useState("");

  // Dashboard Accordion & Filter states
  const [showChart, setShowChart] = useState(true);
  const [showRecentes, setShowRecentes] = useState(true);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentesDebito, setRecentesDebito] = useState([]);
  const [recentesLenicard, setRecentesLenicard] = useState([]);

  const date = new Date();
  const currentDay = date.getDate();
  const currentMonthIndex = date.getMonth() + 1; // 1-indexed: Jan=1...

  const defaultDebitMonth = currentMonthIndex;

  const CLOSING_DAY = 28;
  const defaultLenicardMonth =
    currentDay > CLOSING_DAY
      ? currentMonthIndex + 2 > 12
        ? currentMonthIndex + 2 - 12
        : currentMonthIndex + 2
      : currentMonthIndex + 1 > 12
        ? currentMonthIndex + 1 - 12
        : currentMonthIndex + 1;

  const mesDefault = defaultLenicardMonth;

  const [seletorMes, setSeletorMes] = useState(mesDefault);
  const [grupoColuna, setGrupoColuna] = useState(mesDefault);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((val) => {
      if (val !== null) {
        setDarkModeOverride(JSON.parse(val));
      }
    });
  }, []);

  const toggleDarkMode = async (value) => {
    setDarkModeOverride(value);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(value));
  };

  const loadTotal = async () => {
    const [cachedTotal, cachedLC] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.TOTAL_GERAL),
      AsyncStorage.getItem(STORAGE_KEYS.TOTAL_LC),
    ]);

    if (cachedTotal) {
      try {
        const parsed = JSON.parse(cachedTotal);
        if (Array.isArray(parsed)) setTotal(parsed);
      } catch (e) {}
    }
    if (cachedLC) {
      try {
        const parsedLC = JSON.parse(cachedLC);
        if (Array.isArray(parsedLC)) setTotalLC(parsedLC);
      } catch (e) {}
    }

    try {
      const [res, resLC, resRecDeb, resRecLC] = await Promise.all([
        axios.get(`${API_URL}/total?mes=${seletorMes}`),
        axios.get(`${API_URL}/total/LC?mes=${seletorMes}`),
        axios.get(`${API_URL}/recentes?mes=${seletorMes}&categoria=Débito`),
        axios.get(`${API_URL}/recentes?mes=${seletorMes}&categoria=Lenicard`),
      ]);

      const totalVal = Array.isArray(res.data?.total)
        ? res.data.total
        : new Array(13).fill(0);
      const totalLCVal = Array.isArray(resLC.data?.total)
        ? resLC.data.total
        : new Array(13).fill(0);

      setTotal(totalVal);
      setTotalLC(totalLCVal);
      setRecentesDebito(resRecDeb.data || []);
      setRecentesLenicard(resRecLC.data || []);

      await Promise.all([
        AsyncStorage.setItem(
          STORAGE_KEYS.TOTAL_GERAL,
          JSON.stringify(totalVal),
        ),
        AsyncStorage.setItem(STORAGE_KEYS.TOTAL_LC, JSON.stringify(totalLCVal)),
      ]);
      setLocalMessage("");
    } catch (error) {
      setLocalMessage("Os dados podem estar desatualizados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTotal();

    const interval = setInterval(() => {
      loadTotal();
    }, 30000);

    return () => clearInterval(interval);
  }, [seletorMes]);

  const handleResetStates = () => {
    setName("");
    setValor("");
    setCategoria("Lenicard");
    setGrupoColuna(defaultLenicardMonth);
    setParcelas(1);
  };

  const handleOpenAddModal = () => {
    setCategoria("Lenicard");
    setGrupoColuna(defaultLenicardMonth);
    setParcelas(1);
    setVisible(true);
  };

  const handleSalvar = async () => {
    if (!name || !valor || !categoria) return;
    setLoadingSave(true);
    try {
      const numericValor = parseFloat(String(valor).replace(",", "."));
      await axios.post(`${API_URL}/adicionar`, {
        name,
        valor: isNaN(numericValor) ? 0 : numericValor,
        categoria,
        grupoColuna,
        parcelas,
      });
      handleResetStates();
      setVisible(false);
      loadTotal();
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar o lançamento.");
    } finally {
      setLoadingSave(false);
    }
  };

  const handleOpenEditModal = (item) => {
    setSelectedTransaction(item);
    setDeleteConfirm(null);
    setDeleteError("");
    setEditName(item.name || "");
    setEditValor(item.valor !== undefined ? Number(item.valor).toFixed(2) : "");
    setEditCategoria(item.categoria || "Débito");
    setEditMes(seletorMes);
    setEditParcelas(1);
    setVisibleEdit(true);
  };

  const handleSalvarEdicao = async () => {
    if (!selectedTransaction || !selectedTransaction.rowIndex) {
      setDeleteError("Não foi possível identificar a linha. Atualize a tela.");
      return;
    }
    const numericValor = parseFloat(String(editValor).replace(",", "."));
    if (!editName.trim() || isNaN(numericValor)) {
      setDeleteError("Informe um nome e um valor válidos.");
      return;
    }
    setLoadingEdit(true);
    setDeleteError("");
    try {
      await axios.post(`${API_URL}/editar`, {
        mes: seletorMes,
        novoMes: editMes,
        rowIndex: selectedTransaction.rowIndex,
        nomeOriginal: selectedTransaction.name,
        name: editName.trim(),
        valor: numericValor,
        categoria: editCategoria,
      });
      setVisibleEdit(false);
      setSelectedTransaction(null);
      loadTotal();
    } catch (e) {
      const msg = e?.response?.data?.message || "Não foi possível salvar.";
      setDeleteError(String(msg));
    } finally {
      setLoadingEdit(false);
    }
  };

  // Exclusão em duas etapas: o primeiro toque pede confirmação, o segundo exclui.
  // `modo` é "uma" (só esta linha) ou "todas" (todas as parcelas).
  const handleExcluir = async (modo) => {
    if (!selectedTransaction || !selectedTransaction.rowIndex) {
      setDeleteError("Não foi possível identificar a linha. Atualize a tela.");
      return;
    }
    if (deleteConfirm !== modo) {
      setDeleteConfirm(modo);
      return;
    }
    setLoadingDelete(true);
    setDeleteError("");
    try {
      await axios.post(`${API_URL}/remover`, {
        mes: seletorMes,
        rowIndex: selectedTransaction.rowIndex,
        nome: selectedTransaction.name,
        todasParcelas: modo === "todas",
      });
      setVisibleEdit(false);
      setSelectedTransaction(null);
      setDeleteConfirm(null);
      loadTotal();
    } catch (e) {
      const msg = e?.response?.data?.message || "Não foi possível excluir.";
      setDeleteError(String(msg));
      setDeleteConfirm(null);
    } finally {
      setLoadingDelete(false);
    }
  };

  const handleNextMonth = () => {
    if (seletorMes < 12) {
      setSeletorMes(seletorMes + 1);
    }
  };

  const handlePrevMonth = () => {
    if (seletorMes > 1) {
      setSeletorMes(seletorMes - 1);
    }
  };

  // Merge and filter transactions for "Lançamentos do Mês"
  const combinedTransactions = useMemo(() => {
    const debList = (recentesDebito || []).map((t, i) => ({
      ...t,
      id: `deb-${i}`,
      categoria: "Débito",
    }));
    const lcList = (recentesLenicard || []).map((t, i) => ({
      ...t,
      id: `lc-${i}`,
      categoria: "Lenicard",
    }));
    const all = [...debList, ...lcList];
    if (!searchQuery.trim()) return all;
    const q = searchQuery.toLowerCase().trim();
    return all.filter(
      (item) =>
        String(item.name || "")
          .toLowerCase()
          .includes(q) ||
        String(item.valor || "").includes(q) ||
        formatCurrency(item.valor).includes(q) ||
        item.categoria.toLowerCase().includes(q),
    );
  }, [recentesDebito, recentesLenicard, searchQuery]);

  const displayedTransactions = showAllTransactions
    ? combinedTransactions
    : combinedTransactions.slice(0, 5);

  const valorMesAtual = Array.isArray(total) ? (total[seletorMes] ?? 0) : 0;
  const valorLCMesAtual = Array.isArray(totalLC)
    ? (totalLC[seletorMes] ?? 0)
    : 0;
  const isSaldoPositivo = valorMesAtual > 0;

  // Render Dashboard (Page 3 of PDF)
  const renderDashboard = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* TOP HEADER */}
      <View style={styles.topHeader}>
        <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
          Rein It In
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab("ajustes")}
          style={[
            styles.avatarButton,
            { backgroundColor: colors.primarySoft, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.avatarText, { color: colors.primary }]}>J</Text>
        </TouchableOpacity>
      </View>

      {/* MONTH SELECTOR PILL */}
      <View style={styles.monthSelectorRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePrevMonth}
          disabled={seletorMes <= 1}
          style={[
            styles.monthArrowBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: seletorMes <= 1 ? 0.4 : 1,
            },
          ]}
        >
          <Text
            style={[styles.monthArrowText, { color: colors.textSecondary }]}
          >
            ‹
          </Text>
        </TouchableOpacity>

        <View
          style={[styles.monthPill, { backgroundColor: colors.primarySoft }]}
        >
          <Text style={[styles.monthPillText, { color: colors.primary }]}>
            {Meses[seletorMes - 1]}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleNextMonth}
          disabled={seletorMes >= 12}
          style={[
            styles.monthArrowBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: seletorMes >= 12 ? 0.4 : 1,
            },
          ]}
        >
          <Text
            style={[styles.monthArrowText, { color: colors.textSecondary }]}
          >
            ›
          </Text>
        </TouchableOpacity>
      </View>

      {/* CACHE / CONNECTION WARNING CHIP */}
      {localMessage ? (
        <View
          style={[
            styles.warningBanner,
            { backgroundColor: colors.amberSoft, borderColor: colors.amber },
          ]}
        >
          <Text style={[styles.warningBannerText, { color: colors.amber }]}>
            ⚠ {localMessage}
          </Text>
        </View>
      ) : null}

      {/* HERO CARD 1: SALDO DISPONÍVEL / TOTAL */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.surface,
            borderColor: isSaldoPositivo
              ? colors.emeraldBorder
              : colors.roseBorder,
          },
        ]}
      >
        <View style={styles.heroCardTopRow}>
          <View style={styles.heroCardLabelCol}>
            <Text
              style={[styles.heroCardLabel, { color: colors.textSecondary }]}
            >
              SALDO DISPONÍVEL / TOTAL
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isSaldoPositivo
                    ? colors.emeraldSoft
                    : colors.roseSoft,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isSaldoPositivo
                      ? colors.emerald
                      : colors.rose,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color: isSaldoPositivo
                      ? colors.emeraldDark
                      : colors.roseDark,
                  },
                ]}
              >
                {isSaldoPositivo ? "Em dia" : "Saldo negativo"}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.heroIconBox,
              {
                backgroundColor: isSaldoPositivo
                  ? colors.emeraldSoft
                  : colors.roseSoft,
              },
            ]}
          >
            {/* Geometric Wallet Icon */}
            <View
              style={[
                styles.walletIconBody,
                {
                  borderColor: isSaldoPositivo ? colors.emerald : colors.rose,
                },
              ]}
            >
              <View
                style={[
                  styles.walletIconClasp,
                  {
                    backgroundColor: isSaldoPositivo
                      ? colors.emerald
                      : colors.rose,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        <Text
          style={[
            styles.heroValueText,
            {
              color: isSaldoPositivo ? colors.emerald : colors.rose,
            },
          ]}
        >
          R$ {formatCurrency(valorMesAtual)}
        </Text>
      </View>

      {/* HERO CARD 2: FATURA LENICARD */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.roseBorder,
          },
        ]}
      >
        <View style={styles.heroCardTopRow}>
          <View style={styles.heroCardLabelCol}>
            <Text
              style={[styles.heroCardLabel, { color: colors.textSecondary }]}
            >
              FATURA LENICARD
            </Text>
            <View
              style={[styles.statusBadge, { backgroundColor: colors.roseSoft }]}
            >
              <View
                style={[styles.miniCardIcon, { borderColor: colors.roseDark }]}
              />
              <Text
                style={[styles.statusBadgeText, { color: colors.roseDark }]}
              >
                Cartão de Crédito
              </Text>
            </View>
          </View>

          <View
            style={[styles.heroIconBox, { backgroundColor: colors.roseSoft }]}
          >
            {/* Geometric Receipt / Card Icon */}
            <View
              style={[styles.receiptIconBody, { borderColor: colors.rose }]}
            >
              <View
                style={[styles.receiptLine, { backgroundColor: colors.rose }]}
              />
              <View
                style={[
                  styles.receiptLineShort,
                  { backgroundColor: colors.rose },
                ]}
              />
            </View>
          </View>
        </View>

        <Text style={[styles.heroValueText, { color: colors.rose }]}>
          R$ {formatCurrency(valorLCMesAtual)}
        </Text>

        <View style={styles.heroFooterRow}>
          <View
            style={[styles.calendarDot, { borderColor: colors.textSecondary }]}
          />
          <Text
            style={[styles.heroFooterText, { color: colors.textSecondary }]}
          >
            Vence em {CLOSING_DAY} de {Meses[seletorMes - 1]}
          </Text>
        </View>
      </View>

      {/* PRIMARY CTA BUTTON */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleOpenAddModal}
        style={[styles.primaryCtaBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.primaryCtaPlus}>+</Text>
        <Text style={styles.primaryCtaText}>Adicionar Lançamento</Text>
      </TouchableOpacity>

      {/* ACCORDION 1: COMPARATIVO DE GASTOS ANUAL */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowChart(!showChart)}
          style={styles.sectionHeader}
        >
          <View style={styles.sectionHeaderLeft}>
            <View
              style={[
                styles.sectionIconBox,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <View style={styles.barChartMiniIcon}>
                <View
                  style={[
                    styles.barMini,
                    { height: 6, backgroundColor: colors.primary },
                  ]}
                />
                <View
                  style={[
                    styles.barMini,
                    { height: 11, backgroundColor: colors.primary },
                  ]}
                />
                <View
                  style={[
                    styles.barMini,
                    { height: 8, backgroundColor: colors.primary },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Comparativo de Gastos Anual
            </Text>
          </View>
          <Text style={[styles.chevronIcon, { color: colors.textSecondary }]}>
            {showChart ? "⌃" : "⌄"}
          </Text>
        </TouchableOpacity>

        {showChart && (
          <View style={styles.chartContainer}>
            <View style={styles.chartBarsArea}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                const rawDeb = Array.isArray(total) ? total[m] || 0 : 0;
                const debVal = Math.abs(rawDeb);
                const lcVal = Array.isArray(totalLC)
                  ? Math.abs(totalLC[m] || 0)
                  : 0;

                const maxVal = Math.max(
                  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((x) =>
                    Array.isArray(total) ? Math.abs(total[x] || 0) : 0,
                  ),
                  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((x) =>
                    Array.isArray(totalLC) ? Math.abs(totalLC[x] || 0) : 0,
                  ),
                  100,
                );

                const debHeight = maxVal > 0 ? (debVal / maxVal) * 110 : 0;
                const lcHeight = maxVal > 0 ? (lcVal / maxVal) * 110 : 0;
                const isSelectedMonth = m === seletorMes;

                return (
                  <TouchableOpacity
                    key={m}
                    activeOpacity={0.7}
                    onPress={() => setSeletorMes(m)}
                    style={styles.chartMonthCol}
                  >
                    <View style={styles.chartPairWrap}>
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height: Math.max(debHeight, 4),
                            backgroundColor: colors.emerald,
                            opacity: isSelectedMonth ? 1 : 0.75,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height: Math.max(lcHeight, 4),
                            backgroundColor: colors.rose,
                            opacity: isSelectedMonth ? 1 : 0.75,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.chartMonthLabel,
                        {
                          color: isSelectedMonth
                            ? colors.primary
                            : colors.textSecondary,
                          fontWeight: isSelectedMonth ? "700" : "500",
                        },
                      ]}
                    >
                      {Meses[m - 1].substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.chartLegendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: colors.emerald },
                  ]}
                />
                <Text
                  style={[styles.legendText, { color: colors.textSecondary }]}
                >
                  Débito / Geral
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: colors.rose }]}
                />
                <Text
                  style={[styles.legendText, { color: colors.textSecondary }]}
                >
                  Lenicard
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ACCORDION 2: LANÇAMENTOS DO MÊS */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowRecentes(!showRecentes)}
          style={styles.sectionHeader}
        >
          <View style={styles.sectionHeaderLeft}>
            <View
              style={[
                styles.sectionIconBox,
                { backgroundColor: colors.emeraldSoft },
              ]}
            >
              <View
                style={[
                  styles.clockIconCircle,
                  { borderColor: colors.emerald },
                ]}
              >
                <View
                  style={[
                    styles.clockIconHand,
                    { backgroundColor: colors.emerald },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Lançamentos do Mês
            </Text>
          </View>
          <Text style={[styles.chevronIcon, { color: colors.textSecondary }]}>
            {showRecentes ? "⌃" : "⌄"}
          </Text>
        </TouchableOpacity>

        {showRecentes && (
          <View style={styles.transactionsBody}>
            {/* SEARCH BAR */}
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.searchIcon, { color: colors.textSecondary }]}
              >
                🔍
              </Text>
              <RNTextInput
                placeholder="Buscar lançamentos..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[styles.searchInput, { color: colors.textPrimary }]}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      paddingHorizontal: 6,
                    }}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <Text
              style={[styles.subSectionLabel, { color: colors.textSecondary }]}
            >
              {showAllTransactions
                ? `TODOS OS LANÇAMENTOS (${combinedTransactions.length})`
                : "ÚLTIMOS LANÇAMENTOS"}
            </Text>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : displayedTransactions.length === 0 ? (
              <View style={styles.emptyStateWrap}>
                <Text
                  style={[
                    styles.emptyStateText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Nenhum lançamento encontrado em {Meses[seletorMes - 1]}.
                </Text>
              </View>
            ) : (
              <View style={styles.transactionsList}>
                {displayedTransactions.map((t) => {
                  const isLC = t.categoria === "Lenicard";
                  return (
                    <TouchableOpacity
                      key={t.id}
                      activeOpacity={0.75}
                      onPress={() => handleOpenEditModal(t)}
                      style={[
                        styles.transactionRow,
                        { borderBottomColor: colors.border },
                      ]}
                    >
                      <View style={styles.transactionLeft}>
                        <View
                          style={[
                            styles.txAvatar,
                            {
                              backgroundColor: isLC
                                ? colors.roseSoft
                                : colors.emeraldSoft,
                            },
                          ]}
                        >
                          <View
                            style={[
                              isLC
                                ? styles.miniCardIcon
                                : styles.walletIconBodySmall,
                              {
                                borderColor: isLC
                                  ? colors.roseDark
                                  : colors.emeraldDark,
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.txInfoCol}>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.txName,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {t.name}
                          </Text>
                          <View
                            style={[
                              styles.txCategoryChip,
                              {
                                backgroundColor: isLC
                                  ? colors.roseSoft
                                  : colors.emeraldSoft,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.txCategoryChipText,
                                {
                                  color: isLC
                                    ? colors.roseDark
                                    : colors.emeraldDark,
                                },
                              ]}
                            >
                              {isLC ? "LENICARD" : "DÉBITO"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.transactionRight}>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={[
                              styles.txAmount,
                              { color: colors.textPrimary },
                            ]}
                          >
                            R$ {formatCurrency(t.valor)}
                          </Text>
                          <Text
                            style={[
                              styles.txDateText,
                              { color: colors.textMuted },
                            ]}
                          >
                            {Meses[seletorMes - 1].substring(0, 3)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.txChevron,
                            { color: colors.textMuted },
                          ]}
                        >
                          ›
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* FOOTER LINKS INSIDE LANÇAMENTOS CARD */}
            <View
              style={[
                styles.transactionsFooter,
                { borderTopColor: colors.border },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowAllTransactions(!showAllTransactions)}
                style={styles.footerLinkBtn}
              >
                <Text
                  style={[styles.footerLinkPrimary, { color: colors.primary }]}
                >
                  {showAllTransactions
                    ? "Ver Resumo (Top 5)"
                    : "Ver Extrato Completo"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setMesLimpar(seletorMes);
                  setSenhaLimpar("");
                  setVisibleLimpar(true);
                }}
                style={styles.footerLinkBtn}
              >
                <Text
                  style={[styles.footerLinkDanger, { color: colors.roseDark }]}
                >
                  Limpar Mês
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );

  // Render Settings Screen (Page 4 of PDF)
  const renderSettings = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* SETTINGS HEADER */}
      <View style={styles.subScreenHeader}>
        <TouchableOpacity
          onPress={() => setActiveTab("inicio")}
          style={[
            styles.monthArrowBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.monthArrowText, { color: colors.textPrimary }]}>
            ‹
          </Text>
        </TouchableOpacity>
        <Text style={[styles.subScreenTitle, { color: colors.textPrimary }]}>
          Configurações
        </Text>
        <View style={{ width: 38 }} />
      </View>

      {/* PROFILE ROW */}
      <View style={styles.profileRow}>
        <View
          style={[
            styles.profileAvatarLarge,
            {
              backgroundColor: colors.primarySoft,
              borderColor: colors.primary,
            },
          ]}
        >
          <Text style={[styles.profileAvatarText, { color: colors.primary }]}>
            JV
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.profileName, { color: colors.textPrimary }]}>
            João Victor
          </Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
            Rein It In • Planilha Google Sheets
          </Text>
        </View>
      </View>

      {/* SECTION: GERAL */}
      <Text
        style={[styles.settingsGroupLabel, { color: colors.textSecondary }]}
      >
        GERAL
      </Text>
      <View
        style={[
          styles.settingsCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.settingsItem,
            { borderBottomWidth: 1, borderBottomColor: colors.border },
          ]}
        >
          <View style={styles.settingsItemLeft}>
            <View
              style={[
                styles.settingsIconBadge,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <Text style={{ color: colors.primary, fontSize: 15 }}>☾</Text>
            </View>
            <Text
              style={[styles.settingsItemText, { color: colors.textPrimary }]}
            >
              Modo Escuro
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleDarkMode}
            trackColor={{ false: "#CBD5E1", true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View
          style={[
            styles.settingsItem,
            { borderBottomWidth: 1, borderBottomColor: colors.border },
          ]}
        >
          <View style={styles.settingsItemLeft}>
            <View
              style={[
                styles.settingsIconBadge,
                { backgroundColor: colors.emeraldSoft },
              ]}
            >
              <Text style={{ color: colors.emeraldDark, fontSize: 14 }}>●</Text>
            </View>
            <Text
              style={[styles.settingsItemText, { color: colors.textPrimary }]}
            >
              Notificações
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: "#CBD5E1", true: colors.emerald }}
            thumbColor="#FFFFFF"
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            setMesLimpar(seletorMes);
            setVisibleLimpar(true);
          }}
          style={styles.settingsItem}
        >
          <View style={styles.settingsItemLeft}>
            <View
              style={[
                styles.settingsIconBadge,
                { backgroundColor: colors.amberSoft },
              ]}
            >
              <Text style={{ color: colors.amber, fontSize: 14 }}>🔒</Text>
            </View>
            <Text
              style={[styles.settingsItemText, { color: colors.textPrimary }]}
            >
              Limpar Mês (Administrativo)
            </Text>
          </View>
          <Text style={[styles.txChevron, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* SECTION: FINANCEIRO */}
      <Text
        style={[styles.settingsGroupLabel, { color: colors.textSecondary }]}
      >
        FINANCEIRO
      </Text>
      <View
        style={[
          styles.settingsCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveTab("cartoes")}
          style={[
            styles.settingsItem,
            { borderBottomWidth: 1, borderBottomColor: colors.border },
          ]}
        >
          <View style={styles.settingsItemLeft}>
            <View
              style={[
                styles.settingsIconBadge,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <View
                style={[styles.miniCardIcon, { borderColor: colors.primary }]}
              />
            </View>
            <Text
              style={[styles.settingsItemText, { color: colors.textPrimary }]}
            >
              Gerenciar Lenicard (Fecha dia {CLOSING_DAY})
            </Text>
          </View>
          <Text style={[styles.txChevron, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => loadTotal()}
          style={styles.settingsItem}
        >
          <View style={styles.settingsItemLeft}>
            <View
              style={[
                styles.settingsIconBadge,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 14 }}>↻</Text>
            </View>
            <Text
              style={[styles.settingsItemText, { color: colors.textPrimary }]}
            >
              Sincronizar Planilha Agora
            </Text>
          </View>
          <Text style={[styles.txChevron, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* SECTION: SOBRE */}
      <Text
        style={[styles.settingsGroupLabel, { color: colors.textSecondary }]}
      >
        SOBRE
      </Text>
      <View
        style={[
          styles.settingsCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setVisibleInstructions(true)}
          style={styles.settingsItem}
        >
          <View style={styles.settingsItemLeft}>
            <View
              style={[
                styles.settingsIconBadge,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontWeight: "bold",
                  fontSize: 13,
                }}
              >
                i
              </Text>
            </View>
            <Text
              style={[styles.settingsItemText, { color: colors.textPrimary }]}
            >
              Instruções de Uso e Ajuda
            </Text>
          </View>
          <Text style={[styles.txChevron, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.versionFooter, { color: colors.textMuted }]}>
        REIN IT IN V1.2.0
      </Text>
    </ScrollView>
  );

  // Render Cartões Tab
  const renderCartoes = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.subScreenHeader}>
        <TouchableOpacity
          onPress={() => setActiveTab("inicio")}
          style={[
            styles.monthArrowBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.monthArrowText, { color: colors.textPrimary }]}>
            ‹
          </Text>
        </TouchableOpacity>
        <Text style={[styles.subScreenTitle, { color: colors.textPrimary }]}>
          Cartão Lenicard
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.roseBorder,
          },
        ]}
      >
        <Text style={[styles.heroCardLabel, { color: colors.textSecondary }]}>
          FATURA DE {Meses[seletorMes - 1].toUpperCase()}
        </Text>
        <Text
          style={[styles.heroValueText, { color: colors.rose, marginTop: 8 }]}
        >
          R$ {formatCurrency(valorLCMesAtual)}
        </Text>
        <Text
          style={[
            styles.heroFooterText,
            { color: colors.textSecondary, marginTop: 8 },
          ]}
        >
          Fechamento dia {CLOSING_DAY} • Status:{" "}
          {currentDay > CLOSING_DAY ? "Fechada" : "Aberta"}
        </Text>
      </View>

      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.textPrimary, marginBottom: 12 },
          ]}
        >
          Faturas Anuais (Lenicard)
        </Text>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
          const val = Array.isArray(totalLC) ? totalLC[m] || 0 : 0;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => {
                setSeletorMes(m);
                setActiveTab("inicio");
              }}
              style={[
                styles.transactionRow,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text
                style={{
                  color: m === seletorMes ? colors.primary : colors.textPrimary,
                  fontWeight: m === seletorMes ? "700" : "500",
                  fontSize: 15,
                }}
              >
                {Meses[m - 1]}
              </Text>
              <Text
                style={{
                  color: colors.rose,
                  fontWeight: "700",
                  fontSize: 15,
                }}
              >
                R$ {formatCurrency(val)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  // Render Metas / Resumo Anual Tab
  const renderMetas = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.subScreenHeader}>
        <TouchableOpacity
          onPress={() => setActiveTab("inicio")}
          style={[
            styles.monthArrowBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.monthArrowText, { color: colors.textPrimary }]}>
            ‹
          </Text>
        </TouchableOpacity>
        <Text style={[styles.subScreenTitle, { color: colors.textPrimary }]}>
          Balanço Anual
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.textPrimary, marginBottom: 12 },
          ]}
        >
          Saldo Disponível por Mês
        </Text>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
          const val = Array.isArray(total) ? total[m] || 0 : 0;
          const pos = val > 0;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => {
                setSeletorMes(m);
                setActiveTab("inicio");
              }}
              style={[
                styles.transactionRow,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text
                style={{
                  color: m === seletorMes ? colors.primary : colors.textPrimary,
                  fontWeight: m === seletorMes ? "700" : "500",
                  fontSize: 15,
                }}
              >
                {Meses[m - 1]}
              </Text>
              <Text
                style={{
                  color: pos ? colors.emerald : colors.rose,
                  fontWeight: "700",
                  fontSize: 15,
                }}
              >
                R$ {formatCurrency(val)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  return (
    <Provider theme={paperTheme}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bg}
      />
      <View style={[styles.mainContainer, { backgroundColor: colors.bg }]}>
        <View style={{ flex: 1 }}>
          {activeTab === "inicio" && renderDashboard()}
          {activeTab === "metas" && renderMetas()}
          {activeTab === "cartoes" && renderCartoes()}
          {activeTab === "ajustes" && renderSettings()}
        </View>

        {/* BOTTOM NAVIGATION BAR (Pages 3 & 4 of PDF) */}
        <View
          style={[
            styles.bottomNav,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => setActiveTab("inicio")}
          >
            <Text
              style={[
                styles.navTabIcon,
                {
                  color:
                    activeTab === "inicio" ? colors.primary : colors.textMuted,
                },
              ]}
            >
              ⌂
            </Text>
            <Text
              style={[
                styles.navTabLabel,
                {
                  color:
                    activeTab === "inicio" ? colors.primary : colors.textMuted,
                  fontWeight: activeTab === "inicio" ? "700" : "500",
                },
              ]}
            >
              Início
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => setActiveTab("metas")}
          >
            <Text
              style={[
                styles.navTabIcon,
                {
                  color:
                    activeTab === "metas" ? colors.primary : colors.textMuted,
                },
              ]}
            >
              📈
            </Text>
            <Text
              style={[
                styles.navTabLabel,
                {
                  color:
                    activeTab === "metas" ? colors.primary : colors.textMuted,
                  fontWeight: activeTab === "metas" ? "700" : "500",
                },
              ]}
            >
              Metas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => setActiveTab("cartoes")}
          >
            <Text
              style={[
                styles.navTabIcon,
                {
                  color:
                    activeTab === "cartoes" ? colors.primary : colors.textMuted,
                },
              ]}
            >
              💳
            </Text>
            <Text
              style={[
                styles.navTabLabel,
                {
                  color:
                    activeTab === "cartoes" ? colors.primary : colors.textMuted,
                  fontWeight: activeTab === "cartoes" ? "700" : "500",
                },
              ]}
            >
              Cartões
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => setActiveTab("ajustes")}
          >
            <Text
              style={[
                styles.navTabIcon,
                {
                  color:
                    activeTab === "ajustes" ? colors.primary : colors.textMuted,
                },
              ]}
            >
              ⚙
            </Text>
            <Text
              style={[
                styles.navTabLabel,
                {
                  color:
                    activeTab === "ajustes" ? colors.primary : colors.textMuted,
                  fontWeight: activeTab === "ajustes" ? "700" : "500",
                },
              ]}
            >
              Ajustes
            </Text>
          </TouchableOpacity>
        </View>

        <Portal>
          {/* MODAL 1: NOVO LANÇAMENTO (Page 1 of PDF) */}
          <Modal
            visible={visible}
            onDismiss={() => setVisible(false)}
            contentContainerStyle={[
              styles.sheetModal,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[styles.sheetHandle, { backgroundColor: colors.border }]}
            />

            <View style={styles.sheetHeaderRow}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                Novo Lançamento
              </Text>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={[
                  styles.sheetCloseBtn,
                  { backgroundColor: colors.surfaceSubtle },
                ]}
              >
                <Text
                  style={[
                    styles.sheetCloseText,
                    { color: colors.textSecondary },
                  ]}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            {/* NOME DA DESPESA */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              NOME DA DESPESA
            </Text>
            <View
              style={[
                styles.cleanInputWrap,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
            >
              <RNTextInput
                placeholder="Ex: Mercado Mensal"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                style={[styles.cleanInput, { color: colors.textPrimary }]}
              />
            </View>

            {/* VALOR */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              VALOR
            </Text>
            <View
              style={[
                styles.currencyInputWrap,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.currencyPrefix, { color: colors.textMuted }]}
              >
                R$
              </Text>
              <RNTextInput
                placeholder="0,00"
                placeholderTextColor={colors.textMuted}
                value={valor}
                onChangeText={setValor}
                keyboardType="numeric"
                style={[
                  styles.currencyInput,
                  { color: valor ? colors.primary : colors.textPrimary },
                ]}
              />
            </View>

            {/* CATEGORIA (Segmented Pill Control) */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              CATEGORIA
            </Text>
            <View
              style={[
                styles.segmentedControl,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setCategoria("Lenicard");
                  setGrupoColuna(defaultLenicardMonth);
                }}
                style={[
                  styles.segmentButton,
                  categoria === "Lenicard" && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    {
                      color:
                        categoria === "Lenicard"
                          ? "#FFFFFF"
                          : colors.textSecondary,
                    },
                  ]}
                >
                  💳 Lenicard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setCategoria("Débito");
                  setGrupoColuna(defaultDebitMonth);
                }}
                style={[
                  styles.segmentButton,
                  categoria === "Débito" && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    {
                      color:
                        categoria === "Débito"
                          ? "#FFFFFF"
                          : colors.textSecondary,
                    },
                  ]}
                >
                  💵 Débito
                </Text>
              </TouchableOpacity>
            </View>

            {/* CONTEXTUAL ALERT BANNER */}
            {categoria === "Lenicard" ? (
              <View
                style={[
                  styles.contextAlert,
                  { backgroundColor: colors.roseSoft },
                ]}
              >
                <View
                  style={[
                    styles.contextAlertBadge,
                    { backgroundColor: colors.rose },
                  ]}
                >
                  <Text style={styles.contextAlertBadgeText}>!</Text>
                </View>
                <Text
                  style={[styles.contextAlertText, { color: colors.roseDark }]}
                >
                  Fatura de {Meses[defaultLenicardMonth - 1]} (Fecha dia{" "}
                  {CLOSING_DAY} -{" "}
                  {currentDay > CLOSING_DAY ? "Fechada" : "Aberta"})
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.contextAlert,
                  { backgroundColor: colors.emeraldSoft },
                ]}
              >
                <View
                  style={[
                    styles.contextAlertBadge,
                    { backgroundColor: colors.emerald },
                  ]}
                >
                  <Text style={styles.contextAlertBadgeText}>✓</Text>
                </View>
                <Text
                  style={[
                    styles.contextAlertText,
                    { color: colors.emeraldDark },
                  ]}
                >
                  Lançando no saldo de {Meses[defaultDebitMonth - 1]} (Desconto
                  imediato)
                </Text>
              </View>
            )}

            {/* 2-COLUMN ROW: MÊS DE REFERÊNCIA & PARCELAS */}
            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.fieldLabel, { color: colors.textSecondary }]}
                >
                  MÊS DE REFERÊNCIA
                </Text>
                <View
                  style={[
                    styles.pickerContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Picker
                    selectedValue={grupoColuna}
                    onValueChange={setGrupoColuna}
                    style={{
                      color: colors.textPrimary,
                      backgroundColor: colors.inputBg,
                    }}
                    dropdownIconColor={colors.textSecondary}
                  >
                    {Meses.map((mes, index) => (
                      <Picker.Item
                        key={index}
                        label={mes}
                        value={index + 1}
                        style={{
                          color: colors.textPrimary,
                          backgroundColor: colors.surface,
                        }}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.fieldLabel, { color: colors.textSecondary }]}
                >
                  PARCELAS
                </Text>
                <View
                  style={[
                    styles.pickerContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Picker
                    selectedValue={parcelas}
                    onValueChange={setParcelas}
                    style={{
                      color: colors.textPrimary,
                      backgroundColor: colors.inputBg,
                    }}
                    dropdownIconColor={colors.textSecondary}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                      <Picker.Item
                        key={num}
                        label={num === 1 ? "1x (À vista)" : `${num}x`}
                        value={num}
                        style={{
                          color: colors.textPrimary,
                          backgroundColor: colors.surface,
                        }}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            {/* SALVAR LANÇAMENTO BUTTON */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSalvar}
              disabled={!name || !valor || !categoria || loadingSave}
              style={[
                styles.modalPrimaryBtn,
                {
                  backgroundColor: colors.primary,
                  opacity:
                    !name || !valor || !categoria || loadingSave ? 0.5 : 1,
                },
              ]}
            >
              {loadingSave ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>
                  Salvar Lançamento
                </Text>
              )}
            </TouchableOpacity>

            {/* INSTRUÇÕES DE USO LINK */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setVisibleInstructions(true)}
              style={styles.instructionsLinkRow}
            >
              <View
                style={[
                  styles.questionCircle,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.questionCircleText}>?</Text>
              </View>
              <Text
                style={[styles.instructionsLinkText, { color: colors.primary }]}
              >
                Instruções de Uso
              </Text>
            </TouchableOpacity>
          </Modal>

          {/* MODAL 2: EDITAR LANÇAMENTO (Page 2 of PDF) */}
          <Modal
            visible={visibleEdit}
            onDismiss={() => setVisibleEdit(false)}
            contentContainerStyle={[
              styles.sheetModal,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[styles.sheetHandle, { backgroundColor: colors.border }]}
            />

            <View style={styles.sheetHeaderRow}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                Editar Lançamento
              </Text>
              <TouchableOpacity
                onPress={() => setVisibleEdit(false)}
                style={[
                  styles.sheetCloseBtn,
                  { backgroundColor: colors.surfaceSubtle },
                ]}
              >
                <Text
                  style={[
                    styles.sheetCloseText,
                    { color: colors.textSecondary },
                  ]}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              NOME DA DESPESA
            </Text>
            <View
              style={[
                styles.cleanInputWrap,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
            >
              <RNTextInput
                value={editName}
                onChangeText={setEditName}
                style={[styles.cleanInput, { color: colors.textPrimary }]}
              />
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              VALOR
            </Text>
            <View
              style={[
                styles.currencyInputWrap,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.currencyPrefix, { color: colors.textMuted }]}
              >
                R$
              </Text>
              <RNTextInput
                value={editValor}
                onChangeText={setEditValor}
                keyboardType="numeric"
                style={[styles.currencyInput, { color: colors.primary }]}
              />
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              CATEGORIA
            </Text>
            <View
              style={[
                styles.segmentedControl,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setEditCategoria("Lenicard")}
                style={[
                  styles.segmentButton,
                  editCategoria === "Lenicard" && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    {
                      color:
                        editCategoria === "Lenicard"
                          ? "#FFFFFF"
                          : colors.textSecondary,
                    },
                  ]}
                >
                  💳 Lenicard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setEditCategoria("Débito")}
                style={[
                  styles.segmentButton,
                  editCategoria === "Débito" && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    {
                      color:
                        editCategoria === "Débito"
                          ? "#FFFFFF"
                          : colors.textSecondary,
                    },
                  ]}
                >
                  💵 Débito
                </Text>
              </TouchableOpacity>
            </View>

            {editCategoria === "Lenicard" ? (
              <View
                style={[
                  styles.contextAlert,
                  { backgroundColor: colors.roseSoft },
                ]}
              >
                <View
                  style={[
                    styles.contextAlertBadge,
                    { backgroundColor: colors.rose },
                  ]}
                >
                  <Text style={styles.contextAlertBadgeText}>!</Text>
                </View>
                <Text
                  style={[styles.contextAlertText, { color: colors.roseDark }]}
                >
                  Fatura de {Meses[editMes - 1]} (Fecha dia {CLOSING_DAY})
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.contextAlert,
                  { backgroundColor: colors.emeraldSoft },
                ]}
              >
                <View
                  style={[
                    styles.contextAlertBadge,
                    { backgroundColor: colors.emerald },
                  ]}
                >
                  <Text style={styles.contextAlertBadgeText}>✓</Text>
                </View>
                <Text
                  style={[
                    styles.contextAlertText,
                    { color: colors.emeraldDark },
                  ]}
                >
                  Lançando no saldo de {Meses[editMes - 1]} (Desconto imediato)
                </Text>
              </View>
            )}

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.fieldLabel, { color: colors.textSecondary }]}
                >
                  MÊS DE REFERÊNCIA
                </Text>
                <View
                  style={[
                    styles.pickerContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Picker
                    selectedValue={editMes}
                    onValueChange={setEditMes}
                    style={{
                      color: colors.textPrimary,
                      backgroundColor: colors.inputBg,
                    }}
                    dropdownIconColor={colors.textSecondary}
                  >
                    {Meses.map((mes, index) => (
                      <Picker.Item
                        key={index}
                        label={mes}
                        value={index + 1}
                        style={{
                          color: colors.textPrimary,
                          backgroundColor: colors.surface,
                        }}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.fieldLabel, { color: colors.textSecondary }]}
                >
                  PARCELAS
                </Text>
                <View
                  style={[
                    styles.pickerContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Picker
                    selectedValue={editParcelas}
                    onValueChange={setEditParcelas}
                    style={{
                      color: colors.textPrimary,
                      backgroundColor: colors.inputBg,
                    }}
                    dropdownIconColor={colors.textSecondary}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                      <Picker.Item
                        key={num}
                        label={num === 1 ? "1x (À vista)" : `${num}x`}
                        value={num}
                        style={{
                          color: colors.textPrimary,
                          backgroundColor: colors.surface,
                        }}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <Text
              style={{
                color: colors.textMuted,
                fontSize: 11,
                textAlign: "center",
                marginTop: 12,
              }}
            >
              A quantidade de parcelas não é alterada na edição.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSalvarEdicao}
              disabled={loadingEdit || loadingDelete}
              style={[
                styles.modalPrimaryBtn,
                {
                  backgroundColor: colors.primary,
                  marginTop: 10,
                  opacity: loadingEdit || loadingDelete ? 0.6 : 1,
                },
              ]}
            >
              {loadingEdit ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Salvar Alterações</Text>
              )}
            </TouchableOpacity>

            {deleteError ? (
              <Text
                style={{
                  color: colors.roseDark,
                  fontSize: 12,
                  textAlign: "center",
                  marginTop: 10,
                }}
              >
                {deleteError}
              </Text>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleExcluir("uma")}
              disabled={loadingDelete}
              style={[
                styles.modalDeleteBtn,
                {
                  backgroundColor:
                    deleteConfirm === "uma" ? colors.rose : colors.roseSoft,
                  opacity: loadingDelete ? 0.6 : 1,
                },
              ]}
            >
              {loadingDelete && deleteConfirm === "uma" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.modalDeleteBtnText,
                    {
                      color: deleteConfirm === "uma" ? "#FFFFFF" : colors.roseDark,
                    },
                  ]}
                >
                  {deleteConfirm === "uma"
                    ? "Toque novamente para confirmar"
                    : /\/(\d+)$/.test(selectedTransaction?.parcela || "") &&
                      parseInt(selectedTransaction.parcela.split("/")[1], 10) > 1
                    ? "🗑 Excluir só esta parcela"
                    : "🗑 Excluir Lançamento"}
                </Text>
              )}
            </TouchableOpacity>

            {/\/(\d+)$/.test(selectedTransaction?.parcela || "") &&
            parseInt(selectedTransaction.parcela.split("/")[1], 10) > 1 ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleExcluir("todas")}
                disabled={loadingDelete}
                style={[
                  styles.modalDeleteBtn,
                  {
                    backgroundColor:
                      deleteConfirm === "todas" ? colors.rose : colors.roseSoft,
                    opacity: loadingDelete ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalDeleteBtnText,
                    {
                      color:
                        deleteConfirm === "todas" ? "#FFFFFF" : colors.roseDark,
                    },
                  ]}
                >
                  {deleteConfirm === "todas"
                    ? "Toque novamente para confirmar"
                    : "🗑 Excluir todas as parcelas"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </Modal>

          {/* MODAL 3: LIMPAR MÊS (Page 5 of PDF) */}
          <Modal
            visible={visibleLimpar}
            onDismiss={() => setVisibleLimpar(false)}
            contentContainerStyle={[
              styles.sheetModal,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.subScreenHeader}>
              <TouchableOpacity
                onPress={() => setVisibleLimpar(false)}
                style={[
                  styles.monthArrowBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.monthArrowText, { color: colors.textPrimary }]}
                >
                  ‹
                </Text>
              </TouchableOpacity>
              <Text
                style={[styles.subScreenTitle, { color: colors.textPrimary }]}
              >
                Limpar Mês
              </Text>
              <View style={{ width: 38 }} />
            </View>

            <View style={{ alignItems: "center", marginVertical: 14 }}>
              <View
                style={[
                  styles.warningCircleLarge,
                  { backgroundColor: colors.roseSoft },
                ]}
              >
                <Text
                  style={{
                    color: colors.rose,
                    fontSize: 22,
                    fontWeight: "bold",
                  }}
                >
                  ▲
                </Text>
              </View>
              <Text
                style={[
                  styles.sheetTitle,
                  { color: colors.textPrimary, marginTop: 10 },
                ]}
              >
                Tem certeza?
              </Text>
              <Text
                style={[
                  styles.warningSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                Esta ação irá remover permanentemente os lançamentos do mês
                selecionado. Esta operação não pode ser desfeita.
              </Text>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              SELECIONE O MÊS
            </Text>
            <View
              style={[
                styles.pickerContainer,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
            >
              <Picker
                selectedValue={mesLimpar}
                onValueChange={setMesLimpar}
                style={{
                  color: colors.textPrimary,
                  backgroundColor: colors.inputBg,
                }}
                dropdownIconColor={colors.textSecondary}
              >
                {Meses.map((mes, index) => (
                  <Picker.Item
                    key={index}
                    label={mes}
                    value={index + 1}
                    style={{
                      color: colors.textPrimary,
                      backgroundColor: colors.surface,
                    }}
                  />
                ))}
              </Picker>
            </View>

            <Text
              style={[
                styles.fieldLabel,
                {
                  color: colors.textSecondary,
                  textAlign: "center",
                  marginTop: 18,
                },
              ]}
            >
              INSIRA SUA SENHA
            </Text>

            <View style={styles.pinDotsRow}>
              {[0, 1, 2, 3].map((idx) => (
                <View
                  key={idx}
                  style={[
                    styles.pinDot,
                    {
                      backgroundColor:
                        senhaLimpar.length > idx
                          ? colors.textPrimary
                          : colors.border,
                    },
                  ]}
                />
              ))}
            </View>

            <View
              style={[
                styles.cleanInputWrap,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  marginTop: 10,
                },
              ]}
            >
              <RNTextInput
                placeholder="• • • •"
                placeholderTextColor={colors.textMuted}
                value={senhaLimpar}
                onChangeText={setSenhaLimpar}
                secureTextEntry
                style={[
                  styles.cleanInput,
                  {
                    color: colors.textPrimary,
                    textAlign: "center",
                    letterSpacing: 6,
                  },
                ]}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setVisibleLimpar(false)}
              style={[
                styles.modalPrimaryBtn,
                { backgroundColor: colors.rose, marginTop: 20 },
              ]}
            >
              <Text style={styles.modalPrimaryBtnText}>Confirmar Exclusão</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setVisibleLimpar(false)}
              style={{ alignItems: "center", paddingVertical: 12 }}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontWeight: "600",
                  fontSize: 14,
                }}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </Modal>

          {/* MODAL 4: INSTRUÇÕES DE USO */}
          <Modal
            visible={visibleInstructions}
            onDismiss={() => setVisibleInstructions(false)}
            contentContainerStyle={[
              styles.sheetModal,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[styles.sheetHandle, { backgroundColor: colors.border }]}
            />
            <Text
              style={[
                styles.sheetTitle,
                {
                  color: colors.textPrimary,
                  textAlign: "center",
                  marginBottom: 16,
                },
              ]}
            >
              💡 Instruções de Uso
            </Text>

            <View style={{ gap: 14, marginBottom: 20 }}>
              <View
                style={[
                  styles.instructionBox,
                  { backgroundColor: colors.roseSoft },
                ]}
              >
                <Text
                  style={{
                    fontWeight: "700",
                    color: colors.roseDark,
                    fontSize: 15,
                  }}
                >
                  💳 Categoria: Lenicard vs Débito
                </Text>
                <Text
                  style={{
                    color: colors.textPrimary,
                    marginTop: 4,
                    lineHeight: 20,
                    fontSize: 13,
                  }}
                >
                  Use <Text style={{ fontWeight: "700" }}>Lenicard</Text> para
                  compras no cartão de crédito. Use{" "}
                  <Text style={{ fontWeight: "700" }}>Débito</Text> para
                  despesas pagas à vista no saldo do mês.
                </Text>
              </View>

              <View
                style={[
                  styles.instructionBox,
                  { backgroundColor: colors.emeraldSoft },
                ]}
              >
                <Text
                  style={{
                    fontWeight: "700",
                    color: colors.emeraldDark,
                    fontSize: 15,
                  }}
                >
                  📅 Mês de Referência
                </Text>
                <Text
                  style={{
                    color: colors.textPrimary,
                    marginTop: 4,
                    lineHeight: 20,
                    fontSize: 13,
                  }}
                >
                  Escolha o mês em que a despesa deve ser contabilizada na
                  planilha.
                </Text>
              </View>

              <View
                style={[
                  styles.instructionBox,
                  { backgroundColor: colors.primarySoft },
                ]}
              >
                <Text
                  style={{
                    fontWeight: "700",
                    color: colors.primary,
                    fontSize: 15,
                  }}
                >
                  🔄 Parcelas
                </Text>
                <Text
                  style={{
                    color: colors.textPrimary,
                    marginTop: 4,
                    lineHeight: 20,
                    fontSize: 13,
                  }}
                >
                  Digite o valor correspondente a{" "}
                  <Text style={{ fontWeight: "700" }}>cada parcela</Text> (e não
                  o valor total). Esse valor será repetido nos meses seguintes
                  conforme a quantidade de parcelas.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setVisibleInstructions(false)}
              style={[
                styles.modalPrimaryBtn,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={styles.modalPrimaryBtnText}>Entendido</Text>
            </TouchableOpacity>
          </Modal>
        </Portal>
      </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 36 : 48,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "800",
  },
  monthSelectorRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  monthArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  monthArrowText: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 22,
  },
  monthPill: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 120,
    alignItems: "center",
  },
  monthPillText: {
    fontSize: 15,
    fontWeight: "700",
  },
  warningBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: "center",
  },
  warningBannerText: {
    fontSize: 12,
    fontWeight: "600",
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 14,
  },
  heroCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  heroCardLabelCol: {
    gap: 6,
  },
  heroCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  heroIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  walletIconBody: {
    width: 18,
    height: 14,
    borderWidth: 1.8,
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 2,
  },
  walletIconBodySmall: {
    width: 16,
    height: 12,
    borderWidth: 1.8,
    borderRadius: 3,
  },
  walletIconClasp: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  miniCardIcon: {
    width: 14,
    height: 10,
    borderWidth: 1.6,
    borderRadius: 2,
  },
  receiptIconBody: {
    width: 16,
    height: 18,
    borderWidth: 1.8,
    borderRadius: 3,
    justifyContent: "center",
    paddingHorizontal: 3,
    gap: 3,
  },
  receiptLine: {
    height: 2,
    width: "100%",
    borderRadius: 1,
  },
  receiptLineShort: {
    height: 2,
    width: "65%",
    borderRadius: 1,
  },
  heroValueText: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  heroFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  calendarDot: {
    width: 10,
    height: 10,
    borderWidth: 1.4,
    borderRadius: 2,
  },
  heroFooterText: {
    fontSize: 12,
    fontWeight: "500",
  },
  primaryCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
    elevation: 2,
  },
  primaryCtaPlus: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
  primaryCtaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  barChartMiniIcon: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 12,
  },
  barMini: {
    width: 3,
    borderRadius: 1.5,
  },
  clockIconCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.6,
    alignItems: "center",
    justifyContent: "center",
  },
  clockIconHand: {
    width: 1.6,
    height: 5,
    borderRadius: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  chevronIcon: {
    fontSize: 18,
    fontWeight: "700",
  },
  chartContainer: {
    marginTop: 18,
  },
  chartBarsArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 140,
    paddingHorizontal: 2,
  },
  chartMonthCol: {
    alignItems: "center",
    flex: 1,
  },
  chartPairWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 112,
  },
  chartBar: {
    width: 6,
    borderRadius: 3,
  },
  chartMonthLabel: {
    fontSize: 9,
    marginTop: 6,
  },
  chartLegendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "500",
  },
  transactionsBody: {
    marginTop: 14,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 14,
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  subSectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyStateWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 13,
    fontStyle: "italic",
  },
  transactionsList: {
    gap: 2,
  },
  transactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  txAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfoCol: {
    flex: 1,
    gap: 4,
  },
  txName: {
    fontSize: 14,
    fontWeight: "700",
  },
  txCategoryChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txCategoryChipText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  transactionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  txDateText: {
    fontSize: 11,
    marginTop: 2,
  },
  txChevron: {
    fontSize: 18,
    fontWeight: "600",
  },
  transactionsFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerLinkBtn: {
    paddingVertical: 4,
  },
  footerLinkPrimary: {
    fontSize: 12,
    fontWeight: "700",
  },
  footerLinkDanger: {
    fontSize: 12,
    fontWeight: "700",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  navTabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: 2,
  },
  navTabIcon: {
    fontSize: 18,
  },
  navTabLabel: {
    fontSize: 11,
  },
  sheetModal: {
    marginHorizontal: 14,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: "800",
  },
  sheetCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseText: {
    fontSize: 13,
    fontWeight: "700",
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 10,
  },
  cleanInputWrap: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
    justifyContent: "center",
  },
  cleanInput: {
    fontSize: 14,
    fontWeight: "500",
  },
  currencyInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 54,
    gap: 8,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: "700",
  },
  currencyInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  contextAlert: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  contextAlertBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  contextAlertBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  contextAlertText: {
    fontSize: 11,
    fontWeight: "600",
    fontStyle: "italic",
    flex: 1,
  },
  twoColRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  pickerContainer: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "center",
  },
  modalPrimaryBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  modalDeleteBtn: {
    marginTop: 10,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDeleteBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  instructionsLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingVertical: 4,
    gap: 6,
  },
  questionCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  questionCircleText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  instructionsLinkText: {
    fontSize: 12,
    fontWeight: "700",
  },
  instructionBox: {
    padding: 12,
    borderRadius: 10,
  },
  subScreenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  subScreenTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  profileAvatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    fontSize: 20,
    fontWeight: "800",
  },
  profileName: {
    fontSize: 18,
    fontWeight: "800",
  },
  profileEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  settingsGroupLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 8,
  },
  settingsCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  settingsItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsItemText: {
    fontSize: 14,
    fontWeight: "600",
  },
  versionFooter: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 12,
  },
  warningCircleLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  warningSubtitle: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  pinDotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 6,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

