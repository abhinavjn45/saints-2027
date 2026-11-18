# Build stage: regenerate the minified CSS and the ?v= cache-busting hashes from the source,
# so a deploy can never ship a stale stylesheet or unstamped URLs.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:css && npm run stamp \
 && rm assets/styles/main.css assets/styles/tailwind.src.css

# Serve stage: only the site itself, no sources or build tooling.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/*.html /app/robots.txt /app/sitemap.xml /usr/share/nginx/html/
COPY --from=build /app/assets /usr/share/nginx/html/assets

EXPOSE 8080
