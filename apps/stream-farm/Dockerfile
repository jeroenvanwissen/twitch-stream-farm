# Build the backend
FROM node:lts-alpine AS backend

WORKDIR /app
COPY ./package.json ./package-lock.json ./
RUN npm install

COPY . .
RUN npm run build stream-farm

FROM node:lts-alpine

WORKDIR /apps
COPY --from=backend /app/dist/apps/stream-farm /apps
COPY --from=backend /app/node_modules /apps/node_modules
COPY ./apps/stream-farm/package.json /apps/package.json

EXPOSE 3001
CMD ["npm", "run", "start:prod"]
