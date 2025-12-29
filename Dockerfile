# syntax=docker/dockerfile:1.4

# Use Debian slim image with Go and necessary tools
FROM debian:bookworm-slim AS hugo

# Install Hugo extended dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    ca-certificates \
    libsass-dev \
    && rm -rf /var/lib/apt/lists/*

# Download Hugo Extended binary
ENV HUGO_VERSION=0.153.3
RUN curl -L -o hugo.tar.gz https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_Linux-64bit.tar.gz \
    && tar -xzf hugo.tar.gz \
    && mv hugo /usr/local/bin/hugo \
    && chmod +x /usr/local/bin/hugo

WORKDIR /site
COPY . .

# Build the Hugo site
RUN hugo --minify

# Final stateless NGINX image
FROM nginx:alpine

COPY --from=hugo /site/public /usr/share/nginx/html