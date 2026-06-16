#!/usr/bin/env bash

# Script di aggiornamento automatico per Chrono Stellar su Ubuntu
# Istruzioni:
# 1. Rendi lo script eseguibile: chmod +x update.sh
# 2. Esegui lo script: ./update.sh

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Avvio Aggiornamento Chrono Stellar ===${NC}"

# 1. Pull delle ultime modifiche da Git
echo -e "\n${BLUE}[1/5] Download delle ultime modifiche da Git...${NC}"
git pull
if [ $? -ne 0 ]; then
    echo -e "${RED}Errore durante il git pull. Operazione annullata.${NC}"
    exit 1
fi
echo -e "${GREEN}Git pull completato con successo.${NC}"

# 2. Installazione e Build del Backend
echo -e "\n${BLUE}[2/5] Aggiornamento del Backend...${NC}"
cd backend || exit 1

echo "Installazione dipendenze backend..."
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}Errore durante npm install nel backend.${NC}"
    exit 1
fi

echo "Generazione Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo -e "${RED}Errore durante la generazione di Prisma.${NC}"
    exit 1
fi

echo "Applicazione migrazioni del database..."
npx prisma migrate deploy
if [ $? -ne 0 ]; then
    echo -e "${RED}Errore durante l'applicazione delle migrazioni Prisma.${NC}"
    exit 1
fi

echo "Compilazione del codice backend (TypeScript)..."
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Errore durante la build del backend.${NC}"
    exit 1
fi
echo -e "${GREEN}Backend aggiornato e compilato.${NC}"

# 3. Installazione e Build del Frontend
echo -e "\n${BLUE}[3/5] Aggiornamento del Frontend...${NC}"
cd ../frontend || exit 1

echo "Installazione dipendenze frontend..."
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}Errore durante npm install nel frontend.${NC}"
    exit 1
fi

echo "Compilazione dei file statici del frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Errore durante la build del frontend.${NC}"
    exit 1
fi
echo -e "${GREEN}Frontend compilato con successo.${NC}"

# 4. Riavvio dei Servizi PM2
echo -e "\n${BLUE}[4/5] Riavvio del server di backend tramite PM2...${NC}"
echo "Terminazione di eventuali processi Chrome orfani..."
pkill -f chrome || true
pm2 restart chrono-backend
if [ $? -ne 0 ]; then
    echo -e "${RED}Impossibile riavviare PM2. Provo ad avviarlo per la prima volta...${NC}"
    pm2 start /var/www/chrono-stellar/backend/dist/server.js --name "chrono-backend"
fi
echo -e "${GREEN}Servizi PM2 riavviati con successo.${NC}"

# 5. Verifica Stato di Salute
echo -e "\n${BLUE}[5/5] Verifica dello stato dell'applicazione...${NC}"
sleep 2
pm2 status chrono-backend

echo -e "\n${GREEN}=== Aggiornamento Completato con Successo! ===${NC}"
cd ..
