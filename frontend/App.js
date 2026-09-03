import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import React, { useState, useEffect, createContext, useContext, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, StyleSheet, Text, ActivityIndicator, Image, TouchableOpacity, useColorScheme, ScrollView, Alert } from "react-native";
import { Button, Modal, Portal, TextInput, Provider, MD3LightTheme, MD3DarkTheme } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import { STORAGE_KEYS } from "./constants";
import axios from "axios";

const API_URL = "http://192.168.15.20:3000/finance";
const Meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const CLOSING_DAY = 28;

export const AppContext = createContext();

function DashboardScreen() {
  const { isDark, paperTheme, seletorMes, setSeletorMes, mesesDisponiveis, total, totalLC, loading, localMessage } = useContext(AppContext);
  const [visible, setVisible] = useState(false);
  const [visibleInstructions, setVisibleInstructions] = useState(false);
  const [name, setName] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const { currentMonthIndex, defaultDebitMonth, defaultCreditoMonth, loadTotal } = useContext(AppContext);
  const [grupoColuna, setGrupoColuna] = useState(defaultDebitMonth);
  const [loadingSave, setLoadingSave] = useState(false);

  const handleResetStates = () => {
    setName("");
    setValor("");
    setCategoria("");
    setGrupoColuna(defaultDebitMonth);
    setParcelas(1);
  };

  const handleSalvar = async () => {
    setLoadingSave(true);
    await axios.post(`${API_URL}/adicionar`, {
      name,
      valor: parseFloat(valor),
      categoria,
      grupoColuna,
      parcelas,
    });
    handleResetStates();
    setVisible(false);
    setLoadingSave(false);
    loadTotal();
  };

  const handlePrevMonth = () => {
    if (mesesDisponiveis.length === 0) return;
    const currentIndex = mesesDisponiveis.indexOf(seletorMes);
    if (currentIndex > 0) {
      setSeletorMes(mesesDisponiveis[currentIndex - 1]);
    }
  };

  const handleNextMonth = () => {
    if (mesesDisponiveis.length === 0) return;
    const currentIndex = mesesDisponiveis.indexOf(seletorMes);
    if (currentIndex !== -1 && currentIndex < mesesDisponiveis.length - 1) {
      setSeletorMes(mesesDisponiveis[currentIndex + 1]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#121214" : "#F5F7FA" }]}>
      {total === 0 && totalLC === 0 && localMessage.includes("Erro") ? (
        <View style={[styles.containerCentered, { backgroundColor: isDark ? "#121214" : "#fdfdfd" }]}>
          <Text style={{ color: isDark ? "#FFFFFF" : "#1A1A1A" }}> Problemas com conexão</Text>
          <Text style={{ color: isDark ? "#FFFFFF" : "#1A1A1A" }}>Contactar o Jão</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.containerCaixas} showsVerticalScrollIndicator={false}>
          <Image source={require("./assets/banner.png")} style={styles.imagem} />
          
          <View style={styles.seletoresCaixas}>
            <TouchableOpacity style={[styles.buttonDate, { backgroundColor: isDark ? "#1E1E24" : "#ffffff", borderColor: isDark ? "#2D3748" : "#ccc", opacity: mesesDisponiveis.length === 0 || mesesDisponiveis.indexOf(seletorMes) <= 0 ? 0.3 : 1 }]} onPress={handlePrevMonth} disabled={mesesDisponiveis.length === 0 || mesesDisponiveis.indexOf(seletorMes) <= 0}>
              <Image source={require("./assets/left.png")} style={[styles.imagemButtons, { tintColor: isDark ? "#FFFFFF" : "#1A1A1A" }]} />
            </TouchableOpacity>
            <Text style={{ fontSize: 30, color: isDark ? "#FFFFFF" : "#1A1A1A" }}>{`${Meses[seletorMes - 1]}`}</Text>
            <TouchableOpacity style={[styles.buttonDate, { backgroundColor: isDark ? "#1E1E24" : "#ffffff", borderColor: isDark ? "#2D3748" : "#ccc", opacity: mesesDisponiveis.length === 0 || mesesDisponiveis.indexOf(seletorMes) >= mesesDisponiveis.length - 1 ? 0.3 : 1 }]} onPress={handleNextMonth} disabled={mesesDisponiveis.length === 0 || mesesDisponiveis.indexOf(seletorMes) >= mesesDisponiveis.length - 1}>
              <Image source={require("./assets/right.png")} style={[styles.imagemButtons, { tintColor: isDark ? "#FFFFFF" : "#1A1A1A" }]} />
            </TouchableOpacity>
          </View>

          <View style={[styles.caixa, { backgroundColor: isDark ? "#1E1E24" : "#ffffff", borderColor: isDark ? "#2D3748" : "#ccc" }]}>
            <Text style={[styles.totalText, { color: total[seletorMes] <= 0 ? (isDark ? "#FF4D4D" : "#D63031") : (isDark ? "#2ECC71" : "#27AE60") }]}>Total</Text>
            <Text style={[styles.totalText, { color: total[seletorMes] <= 0 ? (isDark ? "#FF4D4D" : "#D63031") : (isDark ? "#2ECC71" : "#27AE60") }]}>R$ {total[seletorMes] || 0}</Text>
          </View>
          
          <View style={[styles.caixa, { backgroundColor: isDark ? "#1E1E24" : "#ffffff", borderColor: isDark ? "#2D3748" : "#ccc" }]}>
            <Text style={[styles.totalText, { color: isDark ? "#FF4D4D" : "#D63031" }]}>CRÉDITO</Text>
            <Text style={[styles.totalText, { color: isDark ? "#FF4D4D" : "#D63031" }]}>R$ {totalLC[seletorMes] || 0}</Text>
          </View>

          {!loading && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 10 }}>
              <Button mode="contained" onPress={() => setVisible(true)} style={[styles.button, { backgroundColor: isDark ? "#5C6BC0" : "#3F51B5", flex: 1, marginHorizontal: 5 }]}>
                Adicionar Item
              </Button>
            </View>
          )}

          {loading ? (
            <View style={styles.containerLoading}>
              <ActivityIndicator size="large" color={isDark ? "#74B9FF" : "#3F51B5"} />
            </View>
          ) : localMessage ? (
            <Text style={{ textAlign: "center", paddingTop: 20, color: isDark ? "#A0AEC0" : "#636E72" }}>{localMessage}</Text>
          ) : null}
        </ScrollView>
      )}

      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: isDark ? "#1E1E24" : "white" }]}>
          <TextInput label="Nome" value={name} onChangeText={setName} style={styles.input} theme={paperTheme} />
          <TextInput label="Valor" value={valor} onChangeText={setValor} keyboardType="numeric" style={styles.input} theme={paperTheme} />
          <Text style={{ color: isDark ? "#FFFFFF" : "#1A1A1A", marginTop: 10, fontWeight: "bold" }}>Categoria:</Text>
          <View style={{ borderRadius: 8, borderWidth: 1, borderColor: isDark ? "#2D3748" : "#ccc", overflow: 'hidden', marginTop: 5, backgroundColor: isDark ? '#121214' : '#FFFFFF' }}>
            <Picker selectedValue={categoria} onValueChange={(itemValue) => { setCategoria(itemValue); if (itemValue === "Débito") { setGrupoColuna(defaultDebitMonth); } else if (itemValue === "Crédito") { setGrupoColuna(defaultCreditoMonth); } }} style={{ color: isDark ? '#FFFFFF' : '#1A1A1A', backgroundColor: isDark ? '#121214' : '#FFFFFF' }} dropdownIconColor={isDark ? '#FFFFFF' : '#1A1A1A'}>
              <Picker.Item label="Selecione uma categoria..." value="" style={{ color: isDark ? '#FFFFFF' : '#1A1A1A', backgroundColor: isDark ? '#121214' : '#FFFFFF' }} />
              <Picker.Item label="Crédito" value="Crédito" style={{ color: isDark ? '#FFFFFF' : '#1A1A1A', backgroundColor: isDark ? '#121214' : '#FFFFFF' }} />
              <Picker.Item label="Débito" value="Débito" style={{ color: isDark ? '#FFFFFF' : '#1A1A1A', backgroundColor: isDark ? '#121214' : '#FFFFFF' }} />
            </Picker>
          </View>
          
          <Text style={{ color: isDark ? "#FFFFFF" : "#1A1A1A", marginTop: 10, fontWeight: "bold" }}>Mês:</Text>
          <View style={{ borderRadius: 8, borderWidth: 1, borderColor: isDark ? "#2D3748" : "#ccc", overflow: 'hidden', marginTop: 5, backgroundColor: isDark ? '#121214' : '#FFFFFF' }}>
            <Picker selectedValue={grupoColuna} onValueChange={setGrupoColuna} style={{ color: isDark ? '#FFFFFF' : '#1A1A1A', backgroundColor: isDark ? '#121214' : '#FFFFFF' }} dropdownIconColor={isDark ? '#FFFFFF' : '#1A1A1A'}>
              {Meses.map((mes, index) => (
                <Picker.Item key={index} label={mes} value={index + 1} style={{ color: isDark ? '#FFFFFF' : '#1A1A1A', backgroundColor: isDark ? '#121214' : '#FFFFFF' }} />
              ))}
            </Picker>
          </View>

          <Text style={{ color: isDark ? "#FFFFFF" : "#1A1A1A", marginTop: 10, fontWeight: "bold" }}>Parcelas:</Text>
          <View style={{ borderRadius: 8, borderWidth: 1, borderColor: isDark ? "#2D3748" : "#ccc", overflow: 'hidden', marginTop: 5, backgroundColor: isDark ? '#121214' : '#FFFFFF' }}>
            <Picker selectedValue={parcelas} onValueChange={setParcelas} style={{ color: isDark ? '#FFFFFF' : '#1A1A1A', backgroundColor: isDark ? '#121214' : '#FFFFFF' }} dropdownIconColor={isDark ? '#FFFFFF' : '#1A1A1A'}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                <Picker.Item key={num} label={num.toString()} value={num} style={{ color: isDark ? '#FFFFFF' : '#1A1A1A', backgroundColor: isDark ? '#121214' : '#FFFFFF' }} />
              ))}
            </Picker>
          </View>

          <Button mode="contained" onPress={handleSalvar} style={[{ marginTop: 20 }, (!name || !valor || !categoria || loadingSave) ? {} : { backgroundColor: isDark ? "#5C6BC0" : "#3F51B5" }]} disabled={!name || !valor || !categoria || loadingSave} theme={paperTheme}>
            Salvar
          </Button>

          <Button mode="outlined" onPress={() => setVisibleInstructions(true)} style={{ marginTop: 10, borderColor: isDark ? "#2D3748" : "#ccc" }} textColor={isDark ? "#74B9FF" : "#3F51B5"} theme={paperTheme}>
            Instruções de Uso
          </Button>
        </Modal>

        <Modal visible={visibleInstructions} onDismiss={() => setVisibleInstructions(false)} contentContainerStyle={[styles.modal, { backgroundColor: isDark ? "#1E1E24" : "white" }]} theme={paperTheme}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15, color: isDark ? '#FFFFFF' : '#1A1A1A', textAlign: 'center' }}>💡 Instruções de Uso</Text>
          <View style={{ gap: 12, marginBottom: 20 }}>
            <View>
              <Text style={{ fontWeight: 'bold', color: isDark ? '#FF8A80' : '#D63031', fontSize: 16 }}>💳 Categoria: Crédito vs Débito</Text>
              <Text style={{ color: isDark ? '#DFE6E9' : '#2D3436', marginTop: 2 }}>Use Crédito para compras no cartão de crédito. Use Débito para despesas pagas à vista no débito.</Text>
            </View>
          </View>
          <Button mode="contained" onPress={() => setVisibleInstructions(false)} style={{ backgroundColor: isDark ? "#5C6BC0" : "#3F51B5" }} theme={paperTheme}>
            Entendido
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

function LancamentosMesScreen() {
  const { isDark, seletorMes, loadTotal } = useContext(AppContext);
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchLancamentos = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/mes?mes=${seletorMes}`);
        setLancamentos(res.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchLancamentos();
  }, [seletorMes]);

  const handleDelete = (item) => {
    Alert.alert(
      "Confirmar exclusão",
      `Deseja excluir '${item.name}'? Se houver parcelas futuras, elas também serão excluídas.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await axios.delete(`${API_URL}/remover`, {
                data: {
                  mes: seletorMes,
                  rowIndex: item.rowIndex,
                  nome: item.name,
                  parcela: item.parcela
                }
              });
              // Refresh list
              const res = await axios.get(`${API_URL}/mes?mes=${seletorMes}`);
              setLancamentos(res.data || []);
              loadTotal();
              setLoading(false);
            } catch (error) {
              console.error(error);
              Alert.alert("Erro", "Falha ao excluir o lançamento.");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const filteredLancamentos = lancamentos.filter(t => {
    const query = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(query) || t.valor.toString().includes(query);
  });

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#121214" : "#F5F7FA" }]}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#1A1A1A', marginBottom: 15, textAlign: 'center' }}>
        Lançamentos de {Meses[seletorMes - 1]}
      </Text>
      
      <TextInput
        style={[styles.input, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: isDark ? '#2D3748' : '#ccc', color: isDark ? '#FFFFFF' : '#1A1A1A', marginBottom: 15 }]}
        placeholder="Pesquisar por nome ou valor..."
        placeholderTextColor={isDark ? '#A0AEC0' : '#636E72'}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {loading ? (
        <ActivityIndicator size="large" color={isDark ? "#74B9FF" : "#3F51B5"} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView>
          {filteredLancamentos.length === 0 ? (
            <Text style={{ textAlign: 'center', color: isDark ? '#A0AEC0' : '#636E72', marginTop: 20 }}>Nenhum lançamento encontrado.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {filteredLancamentos.map((t, idx) => (
                <View key={`lan-${idx}`} style={[styles.transacaoItem, { backgroundColor: isDark ? "#1E1E24" : "#ffffff", borderColor: isDark ? "#2D3748" : "#E2E8F0" }]}>
                  <View>
                    <Text style={{ fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#1A1A1A', fontSize: 16 }}>{t.name}</Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#A0AEC0' : '#636E72' }}>Parcela: {t.parcela} • Data: {t.data}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 15 }}>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontWeight: 'bold', color: t.categoria === 'Crédito' ? (isDark ? '#FF4D4D' : '#D63031') : (isDark ? '#2ECC71' : '#27AE60'), fontSize: 16 }}>
                        R$ {t.valor.toFixed(2)}
                      </Text>
                      <Text style={{ fontSize: 11, color: isDark ? '#A0AEC0' : '#636E72' }}>{t.categoria}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(t)} style={{ padding: 5 }}>
                      <Text style={{ fontSize: 20 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function RecentesScreen() {
  const { isDark } = useContext(AppContext);
  const [recentes, setRecentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentes = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/recentes`);
        setRecentes(res.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecentes();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#121214" : "#F5F7FA" }]}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#1A1A1A', marginBottom: 15, textAlign: 'center' }}>
        Últimos 5 Lançamentos (Global)
      </Text>
      {loading ? (
        <ActivityIndicator size="large" color={isDark ? "#74B9FF" : "#3F51B5"} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView>
          {recentes.length === 0 ? (
            <Text style={{ textAlign: 'center', color: isDark ? '#A0AEC0' : '#636E72', marginTop: 20 }}>Nenhum lançamento recente.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {recentes.map((t, idx) => (
                <View key={`rec-${idx}`} style={[styles.transacaoItem, { backgroundColor: isDark ? "#1E1E24" : "#ffffff", borderColor: isDark ? "#2D3748" : "#E2E8F0" }]}>
                  <View>
                    <Text style={{ fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#1A1A1A', fontSize: 16 }}>{t.name}</Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#A0AEC0' : '#636E72' }}>Data: {t.data}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontWeight: 'bold', color: t.categoria === 'Crédito' ? (isDark ? '#FF4D4D' : '#D63031') : (isDark ? '#2ECC71' : '#27AE60'), fontSize: 16 }}>
                      R$ {t.valor.toFixed(2)}
                    </Text>
                    <Text style={{ fontSize: 11, color: isDark ? '#A0AEC0' : '#636E72' }}>{t.categoria}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function LimpezaScreen({ navigation }) {
  const { isDark, paperTheme, seletorMes, loadTotal } = useContext(AppContext);
  const [mesAlvo, setMesAlvo] = useState(seletorMes);
  const [senha, setSenha] = useState("");
  const [loadingLimpeza, setLoadingLimpeza] = useState(false);
  const [message, setMessage] = useState("");

  const handleLimpeza = async () => {
    setLoadingLimpeza(true);
    setMessage("");
    try {
      await axios.post(`${API_URL}/limpar`, {
        senha,
        mes: mesAlvo,
      });
      setSenha("");
      setMessage("✅ Aba limpa com sucesso! As parcelas futuras foram mantidas.");
      loadTotal();
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setMessage("❌ Senha incorreta!");
      } else {
        setMessage("❌ Erro ao tentar realizar a limpeza.");
      }
      setSenha("");
    } finally {
      setLoadingLimpeza(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#121214" : "#F5F7FA", justifyContent: 'center' }]}>
      <View style={[styles.modal, { backgroundColor: isDark ? "#1E1E24" : "white", borderWidth: 1, borderColor: isDark ? '#2D3748' : '#ccc' }]}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15, color: isDark ? '#FFFFFF' : '#1A1A1A', textAlign: 'center' }}>
          🧹 Limpar aba de {Meses[mesAlvo - 1]}?
        </Text>
        
        <Text style={{ color: isDark ? '#A0AEC0' : '#636E72', marginBottom: 20, textAlign: 'center', lineHeight: 22 }}>
          Essa ação irá excluir os lançamentos antigos desta aba. Parcelas em andamento que vencem neste ano ou no próximo serão mantidas intactas. Requer senha administrativa.
        </Text>

        <Text style={{ color: isDark ? "#FFFFFF" : "#1A1A1A", fontWeight: "bold", marginBottom: 5 }}>Mês a limpar:</Text>
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: isDark ? "#2D3748" : "#ccc", overflow: 'hidden', marginBottom: 15, backgroundColor: isDark ? '#121214' : '#FFFFFF' }}>
          <Picker
            selectedValue={mesAlvo}
            onValueChange={setMesAlvo}
            style={{ color: isDark ? '#FFFFFF' : '#1A1A1A', backgroundColor: isDark ? '#121214' : '#FFFFFF' }}
            dropdownIconColor={isDark ? '#FFFFFF' : '#1A1A1A'}
          >
            {Meses.map((mes, index) => (
              <Picker.Item key={index} label={mes} value={index + 1} style={{ color: isDark ? '#FFFFFF' : '#1A1A1A', backgroundColor: isDark ? '#121214' : '#FFFFFF' }} />
            ))}
          </Picker>
        </View>

        <TextInput
          label="Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          style={styles.input}
          theme={paperTheme}
        />

        {message ? (
          <Text style={{ textAlign: 'center', marginBottom: 15, fontWeight: 'bold', color: message.includes('✅') ? (isDark ? '#2ECC71' : '#27AE60') : (isDark ? '#FF4D4D' : '#D63031') }}>
            {message}
          </Text>
        ) : null}

        <Button
          mode="contained"
          onPress={handleLimpeza}
          style={[
            { marginTop: 10 },
            (!senha || loadingLimpeza)
              ? {}
              : { backgroundColor: isDark ? "#FF4D4D" : "#D63031" }
          ]}
          disabled={!senha || loadingLimpeza}
          theme={paperTheme}
        >
          {loadingLimpeza ? "Processando..." : "Confirmar Limpeza"}
        </Button>
      </View>
    </View>
  );
}

function SettingsScreen() {
  const { isDark } = useContext(AppContext);
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#121214' : '#fdfdfd' }}>
      <Text style={{ fontSize: 18, color: isDark ? '#ffffff' : '#1A1A1A' }}>Configurações em breve!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-start", padding: 20, paddingTop: 20, backgroundColor: "#F5F7FA" },
  containerCentered: { flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 20, paddingTop: 50, backgroundColor: "#fdfdfd" },
  totalText: { fontSize: 32, width: "100%", fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  button: { backgroundColor: "blue" },
  modal: { backgroundColor: "white", padding: 20, borderRadius: 10 },
  input: { marginBottom: 10 },
  containerCaixas: { flexDirection: "column", gap: 10, paddingBottom: 20 },
  caixa: { backgroundColor: "#ffffff", width: "100%", height: 160, justifyContent: "center", alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: "#ccc" },
  seletoresCaixas: { flexDirection: "row", width: "100%", justifyContent: "space-between", alignItems: "center", borderColor: "#ccc" },
  buttonDate: { width: 50, height: 50, borderWidth: 1, borderRadius: 10, borderColor: "#ccc", alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff" },
  imagemButtons: { width: 40, height: 40, resizeMode: "contain" },
  containerLoading: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 50 },
  imagem: { width: "100%", height: 100, marginBottom: 20 },
  transacaoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 10, borderWidth: 1 },
});

const Drawer = createDrawerNavigator();

export default function App() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const paperTheme = isDark ? MD3DarkTheme : MD3LightTheme;

  const date = new Date();
  const currentDay = date.getDate();
  const currentMonthIndex = date.getMonth() + 1;
  const defaultDebitMonth = currentMonthIndex;
  const defaultCreditoMonth = currentDay > CLOSING_DAY
    ? (currentMonthIndex + 2 > 12 ? (currentMonthIndex + 2) - 12 : currentMonthIndex + 2)
    : (currentMonthIndex + 1 > 12 ? (currentMonthIndex + 1) - 12 : currentMonthIndex + 1);

  const mesDefault = currentMonthIndex;

  const [seletorMes, setSeletorMes] = useState(mesDefault);
  const [mesesDisponiveis, setMesesDisponiveis] = useState([]);
  const [total, setTotal] = useState(new Array(13).fill(0));
  const [totalLC, setTotalLC] = useState(new Array(13).fill(0));
  const [loading, setLoading] = useState(true);
  const [localMessage, setLocalMessage] = useState("");

  const loadTotal = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    setLocalMessage("");
    try {
      const resMeses = await axios.get(`${API_URL}/meses-disponiveis`);
      if (isMounted) {
        const parsedMeses = (resMeses.data || []).map(Number);
        setMesesDisponiveis(parsedMeses);
        if (parsedMeses.length > 0 && !parsedMeses.includes(seletorMes)) {
          setSeletorMes(parsedMeses[parsedMeses.length - 1]);
        }
      }

      const [res, resLC] = await Promise.all([
        axios.get(`${API_URL}/total?mes=${seletorMes}`),
        axios.get(`${API_URL}/total/LC?mes=${seletorMes}`),
      ]);

      const totalVal = res.data.total || new Array(13).fill(0);
      const totalLCVal = resLC.data.total || new Array(13).fill(0);

      setTotal(totalVal);
      setTotalLC(totalLCVal);
      setLocalMessage("");
    } catch (error) {
      setLocalMessage("Os dados podem estar desatualizados");
    } finally {
      setLoading(false);
    }
  }, [seletorMes]);

  useEffect(() => {
    loadTotal();
    const interval = setInterval(() => loadTotal(), 30000);
    return () => clearInterval(interval);
  }, [loadTotal]);

  const contextValue = {
    isDark, paperTheme, currentMonthIndex, defaultDebitMonth, defaultCreditoMonth,
    seletorMes, setSeletorMes, mesesDisponiveis, total, totalLC, loading, localMessage, loadTotal
  };

  return (
    <AppContext.Provider value={contextValue}>
      <Provider theme={paperTheme}>
        <NavigationContainer>
          <Drawer.Navigator
            initialRouteName="Dashboard"
            screenOptions={{
              headerStyle: { backgroundColor: isDark ? "#121214" : "#ffffff", shadowColor: 'transparent', elevation: 0 },
              headerTintColor: isDark ? "#ffffff" : "#1A1A1A",
              drawerStyle: { backgroundColor: isDark ? "#1E1E24" : "#ffffff" },
              drawerActiveTintColor: isDark ? "#ffffff" : "#1A1A1A",
              drawerInactiveTintColor: isDark ? "#888888" : "#666666",
            }}
          >
            <Drawer.Screen name="Dashboard" component={DashboardScreen} />
            <Drawer.Screen name="Lançamentos do Mês" component={LancamentosMesScreen} />
            <Drawer.Screen name="Últimos 5 Lançamentos" component={RecentesScreen} />
            <Drawer.Screen name="Limpar Mês" component={LimpezaScreen} />
            <Drawer.Screen name="Configurações" component={SettingsScreen} />
          </Drawer.Navigator>
        </NavigationContainer>
      </Provider>
    </AppContext.Provider>
  );
}

import { registerRootComponent } from "expo";
registerRootComponent(App);
