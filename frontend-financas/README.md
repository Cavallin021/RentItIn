# Rein It In — Guia de Desenvolvimento e Geração de APK

Este guia explica como rodar o aplicativo em modo de desenvolvimento (para ver alterações em tempo real) e como gerar o arquivo `.apk` final para Android.

---

## 🛠️ Como Rodar o App em Desenvolvimento

Todas as opções abaixo atualizam a tela automaticamente sempre que você salvar alterações no código (`Fast Refresh`).

### 1. Direto no Navegador do PC (Mais rápido)
No terminal, execute:

```bash
cd /home/joao/Documentos/Pessoal/ReinItIn/frontend-financas
npm run web
```
*(Ou rode `npm start` e aperte a tecla **`w`** no terminal — o app abrirá em `http://localhost:8081`).*

> **Dica no navegador:** Pressione `F12` para abrir o DevTools e clique no ícone de celular (`Ctrl + Shift + M`) para visualizar no formato de tela mobile.

### 2. No Celular usando o app Expo Go (Via Wi-Fi / QR Code)
1. Conecte o computador e o celular na mesma rede Wi-Fi.
2. No terminal, execute:
   ```bash
   cd /home/joao/Documentos/Pessoal/ReinItIn/frontend-financas
   npm start
   ```
3. Escaneie o **QR Code** que aparecerá no terminal usando o aplicativo **Expo Go** no celular.

### 3. No Emulador Android ou Celular via Cabo USB
Com o emulador aberto ou celular conectado via USB (com Depuração USB ativa), rode:

```bash
cd /home/joao/Documentos/Pessoal/ReinItIn/frontend-financas
npm start
```
E pressione a tecla **`a`** no terminal (ou rode diretamente `npm run android`).

---

## 📦 Como Gerar o APK do Aplicativo (Android)

### Método 1: Compilação Local Rápida (Recomendado — Sem Fila)

O projeto já está configurado com o **Java 17** (`android/gradle.properties`) e o caminho do **Android SDK** (`android/local.properties`).

#### Passo 1: Gerar o APK pelo Terminal
Abra o terminal e execute:

```bash
cd /home/joao/Documentos/Pessoal/ReinItIn/frontend-financas/android
./gradlew assembleRelease
```

#### Passo 2: Onde encontrar o APK gerado
Assim que aparecer `BUILD SUCCESSFUL`, o arquivo `.apk` estará pronto em:

```text
/home/joao/Documentos/Pessoal/ReinItIn/frontend-financas/android/app/build/outputs/apk/release/app-release.apk
```

Basta enviar esse arquivo `app-release.apk` para o celular (via WhatsApp, Telegram, Google Drive ou cabo USB) e instalar!

> **Dica (Instalar direto via cabo USB):**
> Se o celular estiver conectado no PC com a Depuração USB ligada, você pode instalar direto rodando:
>
> ```bash
> adb install -r app/build/outputs/apk/release/app-release.apk
> ```

---

### Método 2: Pela Nuvem usando o EAS Build (Alternativa)

Caso queira gerar pela nuvem do Expo:

```bash
cd /home/joao/Documentos/Pessoal/ReinItIn/frontend-financas
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

---

## ☕ Como selecionar o Java 17 no VS Code (caso apareça aviso do Gradle)

Já deixamos configurado automaticamente no arquivo `.vscode/settings.json` (`"java.import.gradle.java.home": "/usr/lib/jvm/java-1.17.0-openjdk-amd64"`).

Se algum dia precisar alterar manualmente no VS Code:

1. Pressione `Ctrl + Shift + P` (ou `F1`) para abrir a paleta de comandos.
2. Digite **`Preferences: Open User Settings (JSON)`** (ou `Open Workspace Settings (JSON)`) e aperte Enter.
3. Adicione a linha abaixo dentro das chaves `{ }`:
   ```json
   "java.import.gradle.java.home": "/usr/lib/jvm/java-1.17.0-openjdk-amd64"
   ```
4. Ou, pelo menu visual: pressione `Ctrl + ,` (Configurações), pesquise por **`gradle java home`** e coloque `/usr/lib/jvm/java-1.17.0-openjdk-amd64`.
