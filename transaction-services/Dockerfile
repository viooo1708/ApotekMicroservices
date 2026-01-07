# Gunakan Node 20 LTS
FROM node:20

WORKDIR /app

# Copy package.json dulu
COPY package.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy seluruh source code
COPY . .

EXPOSE 5001

CMD ["node", "index.js"]
