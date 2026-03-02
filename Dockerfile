FROM node:20-alpine

WORKDIR /app

# Copy all files
COPY package.json ./
COPY server.js ./
COPY index.html ./

# Expose port
EXPOSE 3000

# Start
CMD ["node", "server.js"]
