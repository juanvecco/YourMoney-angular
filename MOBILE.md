# YourMoney no celular

O projeto possui duas formas de instalação usando o mesmo código Angular:

- **PWA**: o usuário instala pelo navegador depois que o site estiver publicado em HTTPS.
- **Android**: o Capacitor empacota o build Angular no projeto nativo em `android/`.

## API

Antes de testar em um aparelho físico, substitua `https://localhost:5001/api` em
`src/environments/environment.ts` pelo endereço HTTPS público da API. No celular,
`localhost` aponta para o próprio aparelho e não para o computador de desenvolvimento.

Não publique chaves JWT ou senhas do banco no aplicativo. Elas devem permanecer no
servidor e ser fornecidas à API por variáveis de ambiente.

## PWA

```powershell
npm run build
```

O build de produção gera o manifesto, os ícones e o service worker. A PWA guarda apenas
os arquivos da interface; respostas autenticadas da API financeira não são colocadas no
cache compartilhado do service worker.

## Android

Instale o Android Studio e o Android SDK. Depois execute:

```powershell
npm run build:mobile
npm run mobile:open
```

O primeiro comando gera a aplicação e sincroniza os arquivos com o projeto Android. O
segundo abre o projeto no Android Studio para executar no emulador/aparelho ou gerar o
APK/AAB.

O identificador atual é `com.yourmoney.app`, definido em `capacitor.config.ts`. Confirme
o identificador definitivo antes da primeira publicação na Play Store, pois ele não pode
ser alterado livremente depois que o aplicativo for publicado.
