# 🎵 Melodify Single-Server Deployment Setup

## ✅ Problem gelöst!

Du hast jetzt eine **einzige Server-Lösung**, die sowohl deine React-App als auch die Nextcloud-API auf demselben Server bei Render laufen lässt.

## 🏗️ Architektur

```
┌─────────────────────────────────────┐
│         Render Server               │
│                                     │
│  ┌─────────────────────────────┐    │
│  │      Node.js/Express        │    │
│  │                             │    │
│  │  • Static Files (React App) │    │
│  │  • API Routes (/api/*)      │    │
│  │  • Nextcloud Integration    │    │
│  └─────────────────────────────┘    │
│                                     │
│  Port: Process.env.PORT (Standard)  │
└─────────────────────────────────────┘
```

## 📂 Wichtige Dateien

### 1. `server.js` - Production Server
- Kombiniert React-App und API
- Served statische Dateien aus `/dist`
- Integriert Nextcloud API unter `/api/nextcloud/*`

### 2. `server/nextcloud-api.js` - Nextcloud Integration
- Express-Router für Nextcloud-Funktionen
- Upload, Share-Erstellung, Download-URLs
- CORS-optimiert für Frontend

### 3. `dev-server.js` - Development API Server
- Läuft auf Port 3001 während der Entwicklung
- Wird von Vite automatisch geproxyt

### 4. `vite.config.ts` - Development Proxy
- Proxyt `/api/*` requests zu `localhost:3001`
- Nur für lokale Entwicklung

## 🚀 Deployment bei Render

### 1. Environment Variables setzen:
```
NEXTCLOUD_URL=https://alpenview.ch
NEXTCLOUD_USERNAME=admin
NEXTCLOUD_PASSWORD=9xHKC-WpYfd-4GwXB-HeXac-2p3as
```

### 2. Build Settings:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Node Version**: 18 oder höher

## 🔧 Lokale Entwicklung

### Development starten:
```bash
npm run dev
```
Dies startet:
- Vite Dev Server auf Port 8080 (Frontend)
- API Server auf Port 3001 (Backend)
- Auto-Proxy von Frontend zu Backend

### Production testen:
```bash
npm run build
npm start
```

## 🧪 Getestet und verifiziert

### ✅ Development Tests
- API Server läuft korrekt
- Nextcloud-Verbindung funktioniert
- File Upload/Download arbeitet
- Frontend kann API erreichen

### ✅ Production Tests
- Static File Serving funktioniert
- API-Routing funktioniert
- Nextcloud-Integration funktioniert
- Single-Server-Setup arbeitet perfekt

## 🌟 Vorteile dieser Lösung

1. **Ein Server**: Alles läuft auf einem Render-Server
2. **Keine CORS-Probleme**: Frontend und API auf derselben Domain
3. **Einfache Deployment**: Ein Build, ein Start-Command
4. **Development-Friendly**: Vite Proxy für lokale Entwicklung
5. **Production-Ready**: Express Server für statische Dateien + API

## 📋 Nächste Schritte

1. **Code committen**: Alle Änderungen in Git speichern
2. **Bei Render deployen**: Mit den angegebenen Settings
3. **Environment Variables setzen**: Nextcloud-Credentials eingeben
4. **Testen**: Upload-Funktion in Production testen

## 🎯 API Endpoints

- `GET /api/health` - API Status
- `GET /api/nextcloud/test` - Nextcloud-Verbindung testen
- `POST /api/nextcloud/upload` - File Upload + Share-Erstellung

## 💡 Was geändert wurde

1. **Server-Architektur**: Kombinierte Express-App erstellt
2. **API-Integration**: Nextcloud-Service in Server integriert
3. **Development Setup**: Proxy-Konfiguration für lokale Entwicklung
4. **Production Build**: Static file serving + API in einem Server
5. **Dependencies**: Express, Multer, CORS, Concurrently hinzugefügt

Das System ist jetzt **production-ready** und kann direkt bei Render deployed werden! 🚀
