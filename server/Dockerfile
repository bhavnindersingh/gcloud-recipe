FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Set production environment
ENV NODE_ENV=production

# Create required directories and set permissions
RUN mkdir -p uploads && \
    chown -R node:node /app

# Copy service account keys
COPY recipe-storage-sa-key.json /app/
COPY service-account-key.json /app/

# Set proper permissions for service account keys
RUN chown node:node /app/*.json && \
    chmod 600 /app/*.json

# Set port
ENV PORT=8080
EXPOSE 8080

# Switch to non-root user
USER node

# Start the server
CMD ["node", "server.js"]
