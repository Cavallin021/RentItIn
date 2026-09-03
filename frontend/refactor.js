const fs = require('fs');

let content = fs.readFileSync('App.js', 'utf8');

// 1. Add context imports
content = content.replace(
  'import React, { useState, useEffect } from "react";',
  'import React, { useState, useEffect, createContext, useContext, useCallback } from "react";\nexport const AppContext = createContext();'
);

// 2. Extract state block from DashboardScreen
const stateBlockRegex = /const \[total, setTotal\].*?const Meses = \[.*?\];/s;
const stateBlockMatch = content.match(stateBlockRegex);
if (!stateBlockMatch) throw new Error("Could not find state block");
const stateBlock = stateBlockMatch[0];

// Remove state block from DashboardScreen
content = content.replace(stateBlockRegex, '  const { total, totalLC, seletorMes, setSeletorMes, mesesDisponiveis, setVisible, visible, name, setName, valor, setValor, categoria, setCategoria, parcelas, setParcelas, grupoColuna, setGrupoColuna, handleSalvar, loadingSave, enableSave, defaultDebitMonth, defaultCreditoMonth, Meses, loading, localMessage } = useContext(AppContext);');

// 3. Extract loadTotal and handleLimpeza, etc.
// It's getting too complex. I will rewrite the file using my own logic.
