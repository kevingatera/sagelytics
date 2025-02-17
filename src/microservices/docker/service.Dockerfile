FROM node:20-alpine

WORKDIR /app

ARG SERVICE
ENV SERVICE_NAME=$SERVICE

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

# Run the microservice
CMD ["sh", "-c", "node dist/src/$SERVICE_NAME/$SERVICE_NAME.service.js"] 