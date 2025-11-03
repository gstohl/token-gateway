FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (if any)
RUN bun install

# Copy application code
COPY . .

# Expose the backend port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1))" || exit 1

# Run the application
CMD ["bun", "run", "start"]
