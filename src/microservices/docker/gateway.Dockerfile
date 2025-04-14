FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Remove development dependencies
RUN pnpm prune --prod

EXPOSE 3000
CMD ["pnpm", "start:prod"] 