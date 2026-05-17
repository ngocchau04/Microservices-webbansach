FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --package-lock=false

COPY . .

EXPOSE 4003

CMD ["node", "src/index.js"]

