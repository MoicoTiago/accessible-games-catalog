FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend .

ARG VITE_API_BASE=http://localhost:5000/api
ENV VITE_API_BASE=$VITE_API_BASE
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
