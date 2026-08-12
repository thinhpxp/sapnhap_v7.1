FROM node:22-alpine

WORKDIR /app

# Copy backend package files and install production dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy compiled backend dist
COPY backend/dist ./dist

# Copy static data file (old_data.js ~2.2MB)
COPY data ./data

EXPOSE 3000

USER node

CMD ["node", "dist/index.js"]
