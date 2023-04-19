# Build static site
ARG HUGOVERSION=0.107.0

FROM klakegg/hugo:${HUGOVERSION}-ext-onbuild AS hugo

# Build stateless image with static site files
FROM nginx:alpine

WORKDIR /usr/share/nginx/html/

COPY --from=hugo /target /usr/share/nginx/html
