# Use a lightweight Node.js image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and lock file first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your frontend code
COPY . .

# Expose the default Vite port
EXPOSE 5173

# Start the development server and force it to listen on all interfaces
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]