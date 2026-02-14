# # Use a lightweight Node.js image
# FROM node:20-alpine

# # Set the working directory inside the container
# WORKDIR /app

# # Copy package.json and lock file first to leverage Docker cache
# COPY package*.json ./

# # Install dependencies
# RUN npm install

# # Copy the rest of your frontend code
# COPY . .

# # Expose the default Vite port
# EXPOSE 5173

# # Start the development server and force it to listen on all interfaces
# CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# --- Stage 1: Build the React app ---
FROM node:20-alpine AS build

WORKDIR /app

# Accept the API URL from GitHub Actions (passed in via --build-arg)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Stage 2: Serve the app with Nginx ---
FROM nginx:stable-alpine

# Copy the build output from the first stage to Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy a custom nginx config (see note below)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]