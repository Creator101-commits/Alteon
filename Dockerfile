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
    rm instantclient-basic-linux.x64-19.23.0.0.0dbru.zip

# Set Oracle environment variables
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_19_23:$LD_LIBRARY_PATH
ENV ORACLE_HOME=/opt/oracle/instantclient_19_23

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for building)
RUN npm install

# Copy the rest of the application
COPY . .

# Fix permissions on Oracle wallet files
RUN chmod -R 755 /app/server/oracle_wallet && \
    chmod 644 /app/server/oracle_wallet/*

# Build TypeScript
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Expose port (Railway will override this)
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
