# --- Estágio 1: Build ---
# Usamos a imagem completa do Node para ter todas as ferramentas de build
FROM node:20 AS build

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala TODAS as dependências, incluindo as de desenvolvimento (para testes, etc.)
# Se sua aplicação não tiver devDependencies, pode usar "npm install --only=production" aqui
RUN npm install

# Copia o resto do código
COPY . .

# (Opcional) Se você tivesse um passo de build (ex: TypeScript, Webpack)
# RUN npm run build

# --- Estágio 2: Produção ---
# Começamos de novo com uma imagem limpa e leve do Node
FROM node:20-alpine

WORKDIR /app

# Copia os arquivos de dependência da aplicação do estágio de build
COPY --from=build /app/package*.json ./

# Instala APENAS as dependências de produção
RUN npm install --only=production

# Copia o código da aplicação do estágio de build (incluindo a correção do CORS)
COPY --from=build /app .

# Expõe a porta que a aplicação usa (definida pela variável de ambiente)
# O EXPOSE é mais uma documentação, mas é uma boa prática
EXPOSE 3000

# Cria o diretório de uploads ANTES de mudar de usuário
RUN mkdir -p /app/uploads
# Dá a propriedade do diretório de uploads ao usuário 'node'
RUN chown -R node:node /app/uploads

# Adiciona uma camada de segurança rodando com um usuário não-root
# O usuário 'node' já existe na imagem oficial do Node.js
USER node

# Comando para iniciar
# Usamos "npm start" que você definiu no seu package.json
CMD [ "npm", "start" ]