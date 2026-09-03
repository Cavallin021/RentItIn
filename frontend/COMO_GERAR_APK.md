# Como Gerar o APK do Aplicativo (Android)

Este guia explica os dois caminhos disponíveis para gerar o arquivo `.apk` de testes para instalar diretamente no seu celular Android.

---

## Método 1: Pela Nuvem usando o EAS Build (Recomendado)

Este é o método mais fácil porque toda a compilação pesada roda nos servidores do Expo. Você não precisa ter o Java, Gradle ou o Android SDK instalados ou configurados no seu computador.

### Passo 1: Instalar o EAS CLI
Instale a ferramenta oficial do EAS de forma global no seu sistema:
```bash
npm install -g eas-cli
```

### Passo 2: Fazer Login na Conta do Expo
Se você não tiver uma conta, crie-a gratuitamente em [expo.dev](https://expo.dev/) ou digite o comando abaixo para criar/entrar:
```bash
npx eas login
```

### Passo 3: Executar a Compilação
Envie o projeto para ser compilado no perfil de `preview` (que já foi configurado para gerar formato `.apk` em `eas.json`):
```bash
npx eas build --platform android --profile preview
```

### Passo 4: Instalar no Celular
1. Durante a build, o terminal exibirá o progresso.
2. Ao terminar (geralmente leva entre 3 e 7 minutos), um **QR Code** e um link de download serão impressos no terminal.
3. Abra a câmera do seu celular, escaneie o QR Code e baixe o arquivo `.apk` para instalar diretamente.

---

## Método 2: Compilação Local (No seu Computador)

Use este método caso prefira rodar a compilação utilizando os recursos da sua máquina física. Devido aos erros locais identificados anteriormente (incompatibilidade da versão do Java e caminhos de SDK), será necessário ajustar o seu ambiente Linux antes de iniciar.

### Passo 1: Instalar o Java JDK 17 (Estável para React Native)
O Gradle utilizado no projeto é compatível com o Java 17. Remova ou substitua versões mais recentes (como o Java 25) para evitar erros:
```bash
sudo apt update
sudo apt install openjdk-17-jdk
```

### Passo 2: Configurar as Variáveis de Ambiente
Você precisa informar ao terminal onde estão o Java e o Android SDK. Adicione as linhas abaixo ao final do seu arquivo de configuração do terminal (geralmente `~/.bashrc` ou `~/.zshrc`) para que sejam persistidas:

```bash
# Caminho do JDK 17 instalado
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# Caminho padrão do Android SDK no Linux
export ANDROID_HOME=$HOME/Android/Sdk

# Adicionando ferramentas do Android ao PATH do sistema
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

*Após editar o arquivo, lembre-se de rodar `source ~/.bashrc` (ou reabrir o terminal) para aplicar as configurações.*

### Passo 3: Compilar o Aplicativo localmente
Com o emulador Android aberto ou um celular conectado via USB com a depuração USB ativa, execute o comando de geração do APK:
```bash
npx expo run:android --variant release
```

### Passo 4: Onde encontrar o APK gerado
A compilação local salvará o arquivo `.apk` final no seguinte diretório do seu projeto:
`android/app/build/outputs/apk/release/app-release.apk`

Você pode copiar este arquivo para o armazenamento do seu celular e executá-lo para instalar.
