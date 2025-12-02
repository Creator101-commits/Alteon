# Use Node.js base image
FROM node:18-slim

# Install required dependencies for Oracle Instant Client
RUN apt-get update && apt-get install -y \
    libaio1 \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Download and install Oracle Instant Client
WORKDIR /opt/oracle
RUN wget https://download.oracle.com/otn_software/linux/instantclient/1923000/instantclient-basic-linux.x64-19.23.0.0.0dbru.zip && \
    unzip instantclient-basic-linux.x64-19.23.0.0.0dbru.zip && \
    rm instantclient-basic-linux.x64-19.23.0.0.0dbru.zip && \
    cd instantclient_19_23 && \
    ln -s libclntsh.so.19.1 libclntsh.so && \
    ln -s libocci.so.19.1 libocci.so

# Set Oracle environment variables
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_19_23:$LD_LIBRARY_PATH
ENV ORACLE_HOME=/opt/oracle/instantclient_19_23
# Production environment - will use bundled wallet from server/oracle_wallet
ENV NODE_ENV=production
ENV TNS_ADMIN=/app/server/oracle_wallet

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (include dev deps for build, then prune)
RUN npm ci

# Copy the rest of the application
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Expose port (Railway will override this)
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
