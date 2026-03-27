# --- Stage 1: Build the React app ---
FROM node:20-alpine AS build

WORKDIR /app

# Accept the API URL from GitHub Actions (passed in via --build-arg)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Accept the MAPS API KEY from GitHub Actions (passed in via --build-arg)
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Accept the Google Client ID from GitHub Actions (passed in via --build-arg)
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Stage 2: Serve the app with Nginx ---
FROM nginx:stable-alpine

# Copy the build output from the first stage
COPY --from=build /app/dist /usr/share/nginx/html

# ADD THIS LINE: Copy your custom nginx config into the image
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]