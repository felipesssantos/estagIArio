# --- Estágio 1: Build ---
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# --- Estágio 2: Produção ---
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/package*.json ./
RUN npm install --only=production
COPY --from=build /app .

# Dá ao usuário 'node' a propriedade de toda a pasta da aplicação.
RUN chown -R node:node /app

# Adiciona uma camada de segurança rodando com um usuário não-root
USER node

# Comando para iniciar
CMD [ "npm", "start" ]