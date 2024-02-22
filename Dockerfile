# syntax=docker/dockerfile:1

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY ./ ./
RUN npm run build
CMD ["node", "dist/main.js"]
EXPOSE 3001
