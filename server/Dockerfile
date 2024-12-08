FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port for Cloud Run
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
