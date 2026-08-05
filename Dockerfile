FROM mcr.microsoft.com/playwright:v1.62.0-noble

WORKDIR /app

# Install root dependencies
COPY package*.json ./
RUN npm install
RUN npx playwright install

# Copy source files
COPY . .

# Install frontend dependencies and build
RUN cd frontend && npm install && npm run build

# Start the application
CMD ["node", "index.js"]