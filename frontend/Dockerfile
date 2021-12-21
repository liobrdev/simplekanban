FROM node:lts-alpine@sha256:8569c8f07454ec42501e5e40a680e49d3f9aabab91a6c149e309bac63a3c8d54 AS compiler
RUN apk add --no-cache libc6-compat
WORKDIR /frontend
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm install
COPY . ./
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN npm run build

FROM node:lts-alpine@sha256:8569c8f07454ec42501e5e40a680e49d3f9aabab91a6c149e309bac63a3c8d54 AS cleanup
WORKDIR /frontend
COPY --from=compiler /frontend/.next ./.next
COPY --from=compiler /frontend/public ./public
COPY --from=compiler /frontend/package.json ./package.json
COPY --from=compiler /frontend/package-lock.json ./package-lock.json
RUN npm install --only=production

FROM node:lts-alpine@sha256:8569c8f07454ec42501e5e40a680e49d3f9aabab91a6c149e309bac63a3c8d54 AS runner
WORKDIR /frontend
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
COPY --from=cleanup --chown=nextjs:nodejs /frontend ./
EXPOSE 3000