import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
} from "react-native";
import {
  Button,
  Modal,
  Portal,
  TextInput,
  Provider,
  MD3LightTheme,
  MD3DarkTheme,
} from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import { STORAGE_KEYS } from "./constants";
import axios from "axios";

const API_URL = "https://rentitin-api.onrender.com/finance";
//const API_URL = "http://192.168.15.15:3000/finance";

export default function App() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const paperTheme = isDark ? MD3DarkTheme : MD3LightTheme;

  const [total, setTotal] = useState(0);
  const [totalLC, setTotalLC] = useState(0);
  const [visible, setVisible] = useState(false);
  const [visibleInstructions, setVisibleInstructions] = useState(false);
  const [name, setName] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);
  const [parcelas, setParcelas] = useState(1);
  const [localMessage, setLocalMessage] = useState("");

  const [showChart, setShowChart] = useState(false);
  const [recentesDebito, setRecentesDebito] = useState([]);
  const [recentesLenicard, setRecentesLenicard] = useState([]);
  const [showRecentes, setShowRecentes] = useState(false);

  const date = new Date();
  const currentDay = date.getDate();
  const currentMonthIndex = date.getMonth() + 1; // 1-indexed: Jan=1...

  const defaultDebitMonth = currentMonthIndex;

  const CLOSING_DAY = 28;
  const defaultLenicardMonth = currentDay > CLOSING_DAY
    ? (currentMonthIndex + 2 > 12 ? (currentMonthIndex + 2) - 12 : currentMonthIndex + 2)
    : (currentMonthIndex + 1 > 12 ? (currentMonthIndex + 1) - 12 : currentMonthIndex + 1);

  // Default picker state defaults to Lenicard month or next month
  const mesDefault = currentDay > CLOSING_DAY
    ? (currentMonthIndex + 2 > 12 ? (currentMonthIndex + 2) - 12 : currentMonthIndex + 2)
    : (currentMonthIndex + 1 > 12 ? (currentMonthIndex + 1) - 12 : currentMonthIndex + 1);

  const [seletorMes, setSeletorMes] = useState(mesDefault);
  const [grupoColuna, setGrupoColuna] = useState(mesDefault);

  const categorias = ["Lenicard", "Débito"];

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

  const loadTotal = async () => {
    const [cachedTotal, cachedLC] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.TOTAL_GERAL),
      AsyncStorage.getItem(STORAGE_KEYS.TOTAL_LC),
    ]);

    if (cachedTotal) setTotal(JSON.parse(cachedTotal));
    if (cachedLC) setTotalLC(JSON.parse(cachedLC));

    try {
      const [res, resLC, resRecDeb, resRecLC] = await Promise.all([
        axios.get(`${API_URL}/total?mes=${seletorMes}`),
        axios.get(`${API_URL}/total/LC?mes=${seletorMes}`),
        axios.get(`${API_URL}/recentes?mes=${seletorMes}&categoria=Débito`),
        axios.get(`${API_URL}/recentes?mes=${seletorMes}&categoria=Lenicard`),
      ]);

      const totalVal = res.data.total;
      const totalLCVal = resLC.data.total;

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
    setCategoria("");
    setGrupoColuna(mesDefault);
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

  const enableSave = name && valor && categoria;

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

  return (
    <Provider theme={paperTheme}>
      <View style={[styles.container, { backgroundColor: isDark ? "#121214" : "#F5F7FA" }]}>
        {setTotal === 0 ? (
          <View style={[styles.containerCentered, { backgroundColor: isDark ? "#121214" : "#fdfdfd" }]}>
            <Text style={{ color: isDark ? "#FFFFFF" : "#1A1A1A" }}> Problemas com conexão</Text>
            <Text style={{ color: isDark ? "#FFFFFF" : "#1A1A1A" }}>Contactar o Jão</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.containerCaixas} showsVerticalScrollIndicator={false}>
            <Image
              source={require("./assets/banner.png")}
              style={styles.imagem}
            />
            <View style={styles.seletoresCaixas}>
              <TouchableOpacity
                style={[
                  styles.buttonDate,
                  {
                    backgroundColor: isDark ? "#1E1E24" : "#ffffff",
                    borderColor: isDark ? "#2D3748" : "#ccc",
                  },
                ]}
                onPress={handlePrevMonth}
              >
                <Image
                  source={require("./assets/left.png")}
                  style={[styles.imagemButtons, { tintColor: isDark ? "#FFFFFF" : "#1A1A1A" }]}
                />
              </TouchableOpacity>
              <Text style={{ fontSize: 30, color: isDark ? "#FFFFFF" : "#1A1A1A" }}>{`${Meses[seletorMes - 1]}`}</Text>
              <TouchableOpacity
                style={[
                  styles.buttonDate,
                  {
                    backgroundColor: isDark ? "#1E1E24" : "#ffffff",
                    borderColor: isDark ? "#2D3748" : "#ccc",
                  },
                ]}
                onPress={handleNextMonth}
              >
                <Image
                  source={require("./assets/right.png")}
                  style={[styles.imagemButtons, { tintColor: isDark ? "#FFFFFF" : "#1A1A1A" }]}
                />
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.caixa,
                {
                  backgroundColor: isDark ? "#1E1E24" : "#ffffff",
                  borderColor: isDark ? "#2D3748" : "#ccc",
                },
              ]}
            >
              <Text
                style={[
                  styles.totalText,
                  { color: total[seletorMes] <= 0 ? (isDark ? "#FF4D4D" : "#D63031") : (isDark ? "#2ECC71" : "#27AE60") },
                ]}
              >
                Total
              </Text>
              <Text
                style={[
                  styles.totalText,
                  { color: total[seletorMes] <= 0 ? (isDark ? "#FF4D4D" : "#D63031") : (isDark ? "#2ECC71" : "#27AE60") },
                ]}
              >
                R$ {total[seletorMes]}
              </Text>
            </View>
            <View
              style={[
                styles.caixa,
                {
                  backgroundColor: isDark ? "#1E1E24" : "#ffffff",
                  borderColor: isDark ? "#2D3748" : "#ccc",
                },
              ]}
            >
              <Text style={[styles.totalText, { color: isDark ? "#FF4D4D" : "#D63031" }]}>LENICARD</Text>
              <Text style={[styles.totalText, { color: isDark ? "#FF4D4D" : "#D63031" }]}>
                R$ {totalLC[seletorMes]}
              </Text>
            </View>

            {!loading && (
              <Button
                mode="contained"
                onPress={() => setVisible(true)}
                style={[styles.button, { backgroundColor: isDark ? "#5C6BC0" : "#3F51B5", marginVertical: 10 }]}
              >
                Adicionar Item
              </Button>
            )}

            {/* CHART COMPONENT */}
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => setShowChart(!showChart)}
              style={{ marginTop: 10, backgroundColor: isDark ? "#1E1E24" : "#ffffff", borderRadius: 10, borderWidth: 1, borderColor: isDark ? "#2D3748" : "#ccc", padding: 15 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#1A1A1A' }}>
                  📊 Comparativo de Gastos Anual
                </Text>
                <Text style={{ fontSize: 16, color: isDark ? '#74B9FF' : '#3F51B5', fontWeight: 'bold' }}>
                  {showChart ? "▲" : "▼"}
                </Text>
              </View>

              {showChart && (
                <View style={{ marginTop: 15 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, paddingHorizontal: 5 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                      const debVal = Array.isArray(total) ? (total[m] || 0) : 0;
                      const lcVal = Array.isArray(totalLC) ? (totalLC[m] || 0) : 0;

                      const maxVal = Math.max(
                        ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(x => Array.isArray(total) ? (total[x] || 0) : 0),
                        ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(x => Array.isArray(totalLC) ? (totalLC[x] || 0) : 0),
                        100
                      );

                      const debHeight = maxVal > 0 ? (debVal / maxVal) * 100 : 0;
                      const lcHeight = maxVal > 0 ? (lcVal / maxVal) * 100 : 0;

                      return (
                        <View key={m} style={{ alignItems: 'center', flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 100 }}>
                            <View style={{
                              width: 8,
                              height: Math.max(debHeight, 3),
                              backgroundColor: isDark ? '#2ECC71' : '#27AE60',
                              borderRadius: 2
                            }} />
                            <View style={{
                              width: 8,
                              height: Math.max(lcHeight, 3),
                              backgroundColor: isDark ? '#FF4D4D' : '#D63031',
                              borderRadius: 2
                            }} />
                          </View>

                          <Text style={{ fontSize: 9, color: isDark ? '#FFFFFF' : '#1A1A1A', fontWeight: m === seletorMes ? 'bold' : 'normal', marginTop: 6 }}>
                            {Meses[m - 1].substring(0, 3)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 15, marginTop: 15 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View style={{ width: 12, height: 12, backgroundColor: isDark ? '#2ECC71' : '#27AE60', borderRadius: 2 }} />
                      <Text style={{ fontSize: 12, color: isDark ? '#A0AEC0' : '#636E72' }}>Débito / Geral</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View style={{ width: 12, height: 12, backgroundColor: isDark ? '#FF4D4D' : '#D63031', borderRadius: 2 }} />
                      <Text style={{ fontSize: 12, color: isDark ? '#A0AEC0' : '#636E72' }}>Lenicard</Text>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* RECENT TRANSACTIONS */}
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => setShowRecentes(!showRecentes)}
              style={{ marginTop: 10, backgroundColor: isDark ? "#1E1E24" : "#ffffff", borderRadius: 10, borderWidth: 1, borderColor: isDark ? "#2D3748" : "#ccc", padding: 15 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: showRecentes ? 10 : 0 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#1A1A1A' }}>
                  🕒 Lançamentos Recentes ({Meses[seletorMes - 1]})
                </Text>
                <Text style={{ fontSize: 16, color: isDark ? '#74B9FF' : '#3F51B5', fontWeight: 'bold' }}>
                  {showRecentes ? "▲" : "▼"}
                </Text>
              </View>

              {showRecentes && (
                <>
                  {recentesDebito.length === 0 && recentesLenicard.length === 0 ? (
                    <Text style={{ color: isDark ? '#A0AEC0' : '#636E72', fontStyle: 'italic', textAlign: 'center', marginVertical: 10 }}>
                      Nenhuma transação registrada neste mês.
                    </Text>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {recentesDebito.map((t, idx) => (
                        <View key={`deb-${idx}`} style={[styles.transacaoItem, { backgroundColor: isDark ? "#121214" : "#F5F7FA", borderColor: isDark ? "#2D3748" : "#E2E8F0" }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Text style={{ fontSize: 18 }}>💰</Text>
                            <View>
                              <Text style={{ fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#1A1A1A', fontSize: 14 }}>{t.name}</Text>
                              <Text style={{ fontSize: 11, color: isDark ? '#A0AEC0' : '#636E72' }}>Débito</Text>
                            </View>
                          </View>
                          <Text style={{ fontWeight: 'bold', color: isDark ? '#2ECC71' : '#27AE60', fontSize: 14 }}>
                            R$ {t.valor.toFixed(2)}
                          </Text>
                        </View>
                      ))}

                      {recentesLenicard.map((t, idx) => (
                        <View key={`lc-${idx}`} style={[styles.transacaoItem, { backgroundColor: isDark ? "#121214" : "#F5F7FA", borderColor: isDark ? "#2D3748" : "#E2E8F0" }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Text style={{ fontSize: 18 }}>💳</Text>
                            <View>
                              <Text style={{ fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#1A1A1A', fontSize: 14 }}>{t.name}</Text>
                              <Text style={{ fontSize: 11, color: isDark ? '#A0AEC0' : '#636E72' }}>Lenicard</Text>
                            </View>
                          </View>
                          <Text style={{ fontWeight: 'bold', color: isDark ? '#FF4D4D' : '#D63031', fontSize: 14 }}>
                            R$ {t.valor.toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </TouchableOpacity>

            {loading ? (
              <View style={styles.containerLoading}>
                <ActivityIndicator size="large" color={isDark ? "#74B9FF" : "#3F51B5"} />
              </View>
            ) : localMessage ? (
              <Text
                style={{
                  textAlign: "center",
                  paddingTop: 20,
                  color: isDark ? "#A0AEC0" : "#636E72",
                }}
              >
                {localMessage}
              </Text>
            ) : null}
          </ScrollView>
        )}

        <Portal>
          <Modal
            visible={visible}
            onDismiss={() => setVisible(false)}
            contentContainerStyle={[styles.modal, { backgroundColor: isDark ? "#1E1E24" : "white" }]}
          >
            <TextInput
              label="Nome"
              value={name}
              onChangeText={setName}
              style={styles.input}
              theme={paperTheme}
            />
            <TextInput
              label="Valor"
              value={valor}
              onChangeText={setValor}
              keyboardType="numeric"
              style={styles.input}
              theme={paperTheme}
            />
            <Text style={{ color: isDark ? "#FFFFFF" : "#1A1A1A", marginTop: 10, fontWeight: "bold" }}>Categoria:</Text>
            <View style={{
              borderRadius: 8,
              borderWidth: 1,
              borderColor: isDark ? "#2D3748" : "#ccc",
              overflow: 'hidden',
              marginTop: 5,
              backgroundColor: isDark ? '#121214' : '#FFFFFF'
            }}>
              <Picker
                selectedValue={categoria}
                onValueChange={(itemValue) => {
                  setCategoria(itemValue);
                  if (itemValue === "Débito") {
                    setGrupoColuna(defaultDebitMonth);
                  } else if (itemValue === "Lenicard") {
                    setGrupoColuna(defaultLenicardMonth);
                  }
                }}
                style={{
                  color: isDark ? '#FFFFFF' : '#1A1A1A',
                  backgroundColor: isDark ? '#121214' : '#FFFFFF'
                }}
                dropdownIconColor={isDark ? '#FFFFFF' : '#1A1A1A'}
              >
                <Picker.Item label="Selecione uma categoria..." value="" style={{ color: isDark ? '#FFFFFF' : '#1A1A1A', backgroundColor: isDark ? '#121214' : '#FFFFFF' }} />
                {categorias.map((cat, index) => (
                  <Picker.Item key={index} label={cat} value={cat} style={{ color: isDark ? '#FFFFFF' : '#1A1A1A', backgroundColor: isDark ? '#121214' : '#FFFFFF' }} />
                ))}
              </Picker>
            </View>

            {categoria === "Lenicard" && (
              <Text style={{ fontSize: 13, color: isDark ? "#81C784" : "#27AE60", marginTop: 5, fontWeight: "500" }}>
                {currentDay > CLOSING_DAY
                  ? `📅 Fatura de ${Meses[defaultLenicardMonth - 1]} (Fecha dia 28 - Fechada)`
                  : `📅 Fatura de ${Meses[defaultLenicardMonth - 1]} (Fecha dia 28 - Aberta)`}
              </Text>
            )}
            {categoria === "Débito" && (
              <Text style={{ fontSize: 13, color: isDark ? "#64B5F6" : "#2980B9", marginTop: 5, fontWeight: "500" }}>
                {`💵 Lançando no saldo de ${Meses[defaultDebitMonth - 1]} (Desconto imediato)`}
              </Text>
            )}

            <Text style={{ color: isDark ? "#FFFFFF" : "#1A1A1A", marginTop: 10, fontWeight: "bold" }}>Mês:</Text>
            <View style={{
              borderRadius: 8,
              borderWidth: 1,
              borderColor: isDark ? "#2D3748" : "#ccc",
              overflow: 'hidden',
              marginTop: 5,
              backgroundColor: isDark ? '#121214' : '#FFFFFF'
            }}>
              <Picker
                selectedValue={grupoColuna}
                onValueChange={setGrupoColuna}
                style={{
                  color: isDark ? '#FFFFFF' : '#1A1A1A',
                  backgroundColor: isDark ? '#121214' : '#FFFFFF'
                }}
                dropdownIconColor={isDark ? '#FFFFFF' : '#1A1A1A'}
              >
                {Meses.map((mes, index) => (
                  <Picker.Item key={index} label={mes} value={index + 1} style={{ color: isDark ? '#FFFFFF' : '#1A1A1A', backgroundColor: isDark ? '#121214' : '#FFFFFF' }} />
                ))}
              </Picker>
            </View>

            <Text style={{ color: isDark ? "#FFFFFF" : "#1A1A1A", marginTop: 10, fontWeight: "bold" }}>Parcelas:</Text>
            <View style={{
              borderRadius: 8,
              borderWidth: 1,
              borderColor: isDark ? "#2D3748" : "#ccc",
              overflow: 'hidden',
              marginTop: 5,
              backgroundColor: isDark ? '#121214' : '#FFFFFF'
            }}>
              <Picker
                selectedValue={parcelas}
                onValueChange={(itemValue) => setParcelas(itemValue)}
                style={{
                  color: isDark ? '#FFFFFF' : '#1A1A1A',
                  backgroundColor: isDark ? '#121214' : '#FFFFFF'
                }}
                dropdownIconColor={isDark ? '#FFFFFF' : '#1A1A1A'}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                  <Picker.Item key={num} label={num.toString()} value={num} style={{ color: isDark ? '#FFFFFF' : '#1A1A1A', backgroundColor: isDark ? '#121214' : '#FFFFFF' }} />
                ))}
              </Picker>
            </View>

            <Button
              mode="contained"
              onPress={handleSalvar}
              style={[
                { marginTop: 20 },
                (!name || !valor || !categoria || loadingSave)
                  ? {}
                  : { backgroundColor: isDark ? "#5C6BC0" : "#3F51B5" }
              ]}
              disabled={!name || !valor || !categoria || loadingSave}
              theme={paperTheme}
            >
              Salvar
            </Button>

            <Button
              mode="outlined"
              onPress={() => setVisibleInstructions(true)}
              style={{ marginTop: 10, borderColor: isDark ? "#2D3748" : "#ccc" }}
              textColor={isDark ? "#74B9FF" : "#3F51B5"}
              theme={paperTheme}
            >
              Instruções de Uso
            </Button>
          </Modal>

          <Modal
            visible={visibleInstructions}
            onDismiss={() => setVisibleInstructions(false)}
            contentContainerStyle={[styles.modal, { backgroundColor: isDark ? "#1E1E24" : "white" }]}
            theme={paperTheme}
          >
            <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15, color: isDark ? '#FFFFFF' : '#1A1A1A', textAlign: 'center' }}>
              💡 Instruções de Uso
            </Text>

            <View style={{ gap: 12, marginBottom: 20 }}>
              <View>
                <Text style={{ fontWeight: 'bold', color: isDark ? '#FF8A80' : '#D63031', fontSize: 16 }}>
                  💳 Categoria: Lenicard vs Débito
                </Text>
                <Text style={{ color: isDark ? '#DFE6E9' : '#2D3436', marginTop: 2 }}>
                  Use <Text style={{ fontWeight: 'bold' }}>Lenicard</Text> para compras no cartão de crédito. Use <Text style={{ fontWeight: 'bold' }}>Débito</Text> para despesas pagas à vista no débito.
                </Text>
              </View>

              <View>
                <Text style={{ fontWeight: 'bold', color: isDark ? '#81C784' : '#27AE60', fontSize: 16 }}>
                  📅 Mês
                </Text>
                <Text style={{ color: isDark ? '#DFE6E9' : '#2D3436', marginTop: 2 }}>
                  Escolha o mês de referência em que a despesa deve ser contabilizada.
                </Text>
              </View>

              <View>
                <Text style={{ fontWeight: 'bold', color: isDark ? '#64B5F6' : '#2980B9', fontSize: 16 }}>
                  🔄 Parcelas
                </Text>
                <Text style={{ color: isDark ? '#DFE6E9' : '#2D3436', marginTop: 2 }}>
                  Digite o valor correspondente a <Text style={{ fontWeight: 'bold' }}>cada parcela</Text> (e não o valor total). Esse valor será repetido nos meses subsequentes conforme a quantidade de parcelas selecionada.
                </Text>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={() => setVisibleInstructions(false)}
              style={{ backgroundColor: isDark ? "#5C6BC0" : "#3F51B5" }}
              theme={paperTheme}
            >
              Entendido
            </Button>
          </Modal>
        </Portal>
      </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#F5F7FA",
  },
  containerCentered: {
    flexDirection: "col",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#fdfdfd",
  },
  totalText: {
    fontSize: 32,
    width: "100%",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  button: { marginHorizontal: 50, backgroundColor: "blue" },
  modal: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 10,
  },
  input: { marginBottom: 10 },
  containerCaixas: {
    flexDirection: "col",
    gap: 10,
    padding: 10,
  },
  caixa: {
    backgroundColor: "#ffffff",
    width: "100%", // Define a largura para caberem duas na mesma linha
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  seletoresCaixas: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    borderColor: "#ccc",
  },
  buttonDate: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: "#ccc",
    alignItems: "center", // Centraliza horizontalmente
    justifyContent: "center", // Centraliza verticalmente
    backgroundColor: "#ffffff",
  },
  imagemButtons: {
    width: 40, // Use um tamanho fixo em pixels para ícones
    height: 40, // Mantenha proporcional
    resizeMode: "contain", // Importante para não cortar ou esticar
    // Remova o marginBottom e alignItems daqui
  },
  containerLoading: {
    flex: 1,
    justifyContent: "center", // Centraliza verticalmente
    alignItems: "center", // Centraliza horizontalmente
    marginTop: 50, // Ajuste conforme necessário
  },
  imagem: {
    width: "100%", // Largura fixa
    height: 100, // Altura fixa
    marginBottom: 20,
  },
  transacaoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
});

import { registerRootComponent } from "expo";
registerRootComponent(App);
