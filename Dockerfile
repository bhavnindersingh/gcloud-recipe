# Build stage
FROM node:18-slim as build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app files
COPY . .

# Set production environment
ENV NODE_ENV=production
ENV REACT_APP_API_URL=https://recipe-backend-786959629970.us-central1.run.app
ENV REACT_APP_STORAGE_URL=https://storage.googleapis.com/conscious-cafe-recipe-2024-uploads
ENV REACT_APP_BUCKET_NAME=conscious-cafe-recipe-2024-uploads
ENV REACT_APP_PUBLIC_URL=/

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Create nginx log directory
RUN mkdir -p /var/log/nginx

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
