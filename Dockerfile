FROM node:20-alpine

# Install Docker CLI to interact with the host Docker daemon
RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "dev"]
