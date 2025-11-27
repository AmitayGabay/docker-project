# Stage 1: Build the React application
FROM node:18-alpine as builder

WORKDIR /app

# Copy dependency files and install them
COPY package*.json ./
RUN npm install

# Copy source code and build the app (creates the 'build' folder)
COPY . .
RUN npm run build

# Stage 2: Serve the static files using a lightweight server
FROM node:18-alpine

# Install 'serve' - a simple static file server
RUN npm install -g serve

WORKDIR /app

# Copy the build output from the builder stage
COPY --from=builder /app/build .

# Expose the port where the React app will be served
EXPOSE 3000

# Startup command: serve the current directory on port 3000
CMD ["serve", "-s", ".", "-l", "3000"]