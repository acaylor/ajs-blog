# Build static site
FROM docker.io/klakegg/hugo:0.111.3-ext-onbuild AS hugo

# Build stateless image with static site files
FROM docker.io/nginx:alpine

WORKDIR /usr/share/nginx/html/

COPY --from=hugo /target /usr/share/nginx/html
