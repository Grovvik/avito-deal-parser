FROM mcr.microsoft.com/playwright:v1.62.0-noble

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npx playwright install

COPY . .

RUN cd frontend && npm install && npm run build

CMD ["node", "index.js"]