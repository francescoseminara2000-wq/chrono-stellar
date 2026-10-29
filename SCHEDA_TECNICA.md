# Scheda Tecnica e Infrastruttura di Hosting

**Progetto:** Chrono Stellar (Piattaforma E-Commerce e Gestione Ordini / Logistica)  
**Data stesura:** Ottobre 2026  
**Documento:** Specifiche Tecniche, Architettura e Hosting  

---

## 1. Panoramica del Sistema

Chrono Stellar è un'applicazione web completa per la vendita e gestione ordini (e-commerce con catalogo prodotti, checkout, gestione fasce/zone di consegna, calcolo pesi/prezzi finali, notifiche multicanale e pannello di amministrazione avanzato).

L'architettura è basata sul pattern **SPA (Single Page Application) + API RESTful disaccoppiata**:
- **Frontend:** SPA reattiva ad alte prestazioni.
- **Backend:** Server API RESTful modulare e tipizzato.
- **Database:** Relazionale, gestito tramite ORM.
- **Reverse Proxy & Web Server:** Nginx per il routing, SSL e gestione dei bot social.
- **Process Manager:** PM2 per garantire alta disponibilità e riavvio continuo del servizio backend.

```
                     [ Internet / Utenti & Social Bot ]
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │       Nginx Reverse Proxy       │
                    │   (Porta 80 / 443 HTTPS - SSL)  │
                    └───────┬─────────────────┬───────┘
                            │                 │
           Richieste statiche / Frontend      │ Chiamate API (/api/*) & Crawler (/og/*)
                            │                 │
                            ▼                 ▼
             ┌─────────────────────┐   ┌───────────────────────────┐
             │ File Statici HTML/JS│   │ Backend Node.js (Express) │
             │   (Dist compilata)  │   │  PM2 - Porta locale 3001  │
             └─────────────────────┘   └─────────────┬─────────────┘
                                                     │
                                                     ▼
                                        ┌─────────────────────────┐
                                        │     MySQL Database      │
                                        │  (Gestito con Prisma)   │
                                        └─────────────────────────┘
```

---

## 2. Stack Tecnologico

### Frontend
- **Linguaggio:** TypeScript
- **Libreria Core:** React 18
- **Tooling & Bundler:** Vite (build veloce in ES Modules)
- **Stile & Design System:** Tailwind CSS (utility-first), animazioni con Framer Motion, icone con Lucide React
- **Routing:** React Router v7
- **State Management:** Zustand (gestione stato carrello, preferenze, autenticazione)
- **Mappe & Logistica:** Leaflet & React-Leaflet (per visualizzazione geolocalizzata e zone di consegna)
- **Editor WYSIWYG:** React-Quill

### Backend
- **Ambiente di Esecuzione:** Node.js (LTS)
- **Linguaggio:** TypeScript (compilato in JavaScript via `tsc`)
- **Framework Web:** Express.js
- **ORM & Database Modeling:** Prisma ORM (migrazioni schema, tipizzazione automatica e query builder)
- **Autenticazione & Sicurezza:** JSON Web Token (JWT), Hashing password con Bcrypt, CORS
- **Gestione File & Uploads:** Multer (immagini prodotti e avatar)
- **Generazione Documenti:** PDFKit (bolle di consegna/ricevute), QRCode (generazione codici QR)
- **Comunicazione & Notifiche:**
  - **Email:** Nodemailer (notifiche di conferma, promemoria ordini, template personalizzati)
  - **Notifiche Push Web:** Web-Push (standard VAPID per notifiche browser desktop e mobile)
  - **WhatsApp:** WhatsApp-Web.js (automazione notifiche transazionali)
  - **Pagamenti:** Integrazione API & Webhook Revolut

### Database
- **Engine:** MySQL 8.x
- **Gestione Schema:** Prisma (`prisma/schema.prisma`) con migrazioni automatiche (`prisma db push`)
- **Database Name:** `greengrocer` / `chrono_stellar`

---

## 3. Infrastruttura di Hosting e Deployment (Produzione)

L'ambiente di produzione è configurato su un server dedicato/VPS Linux.

### Specifiche Server
- **Sistema Operativo:** Linux Ubuntu (LTS)
- **Percorso Applicazione:** `/var/www/chrono-stellar`
- **Gestore Processi:** **PM2**
  - Nome processo: `chrono-backend`
  - Esecuzione persistente con auto-restart in caso di crash
  - Avvio automatico al boot del sistema (`pm2 startup` / `pm2 save`)

### Web Server & Reverse Proxy (Nginx)
Nginx è configurato come entry-point principale del server:
1. **Servizio Frontend:** Serve direttamente i file statici compilati (`frontend/dist`) con gestione fallback delle rotte SPA (`try_files $uri $uri/ /index.html`).
2. **Reverse Proxy Backend:** Inoltra le richieste `/api/*` e `/uploads/*` al backend Node.js in ascolto locale sulla porta `3001` (o `5000`).
3. **Proxy Open Graph Dinamico (Social Crawler):**
   - Intercetta le richieste provenienti da bot social (WhatsApp, Facebook, Telegram, Twitter, LinkedIn).
   - Esegue il proxy verso l'endpoint backend `/og/products/:id` che genera meta-tag HTML dinamici (titolo, descrizione, anteprima immagine del prodotto per la condivisione su chat e social).
4. **Limiti Upload:** `client_max_body_size 50M;` per consentire il caricamento di immagini ad alta risoluzione.

---

## 4. Pipeline di Aggiornamento e Deploy

Il progetto include uno script automatizzato di deploy per Ubuntu (`update.sh`):

```bash
# Esecuzione deploy sul server:
./update.sh
```

**Fasi eseguite dallo script:**
1. **Git Pull:** Scaricamento dell'ultima versione del codice dal repository.
2. **Backend Update:**
   - Esecuzione `npm install`
   - Generazione client Prisma (`npx prisma generate`)
   - Allineamento schema database (`npx prisma db push --accept-data-loss`)
   - Compilazione TypeScript in JS (`npm run build`)
3. **Frontend Update:**
   - Esecuzione `npm install`
   - Compilazione bundle statico per produzione (`npm run build` -> genera `frontend/dist`)
4. **Nginx & Servizi:**
   - Verifica e aggiornamento dei limiti `client_max_body_size` e regole Open Graph per social bot
   - Test configurazione (`nginx -t`) e reload di Nginx (`systemctl reload nginx`)
   - Riavvio del demone backend con PM2 (`pm2 restart chrono-backend`)
5. **Health Check:** Verifica dello stato attivo tramite `pm2 status`.

---

## 5. Ambiente di Sviluppo Locale (Windows)

Per lo sviluppo in locale su ambiente Windows:
- Avvio rapido tramite `start_progetto.bat`:
  - Avvia il backend in watch mode con nodemon/ts-node (`PORT=3001`)
  - Avvia il frontend con Vite Dev Server (`PORT=5173`)
- Il server di sviluppo Vite instrada le chiamate `/api` e `/uploads` direttamente a `http://localhost:3001` tramite proxy integrato.

---

## 6. Variabili d'Ambiente e Configurazioni Principali

I file di configurazione `.env` (collocati in `backend/.env`) gestiscono i parametri chiave:
- `DATABASE_URL`: Stringa di connessione a MySQL (`mysql://utente:password@localhost:3306/nome_db`)
- `PORT`: Porta locale di ascolto del backend (default `3001`)
- `JWT_SECRET`: Chiave crittografica per la generazione e verifica dei token utente/admin
- `SMTP_*`: Parametri server di posta (host, porta, credenziali, mittente) per Nodemailer
- `VAPID_PUBLIC_KEY` & `VAPID_PRIVATE_KEY`: Coppia di chiavi per il servizio Web Push Notifications
- `REVOLUT_*`: API Key e Secret Webhook per la gestione transazioni di pagamento
