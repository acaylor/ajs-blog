---
title: GitLab CI/CD and building containers
author: aj
date: 2022-01-02
updated: 2025-10-15
categories:
  - Software Development
tags:
  - Hugo
  - gitlab
  - markdown
  - blog
  - containers
  - docker

---

**Update 2025-10-15: This method of building containers should be considered deprecated. The kaniko project is not maintained**

[GitLab CI/CD][1] is a feature of the [GitLab][2] platform that is used in software development for [Continuous Integration][3], [Delivery][4], and [Deployment][5] of software. The idea is that software source code will grow and evolve over time but you do not want to have to manually compile your code each time a change is made. This is especially true when you develop software as a team and multiple changes might be made in a single day.

## Building a container to host hugo sites

Building container images is a good use case for a continuous deployment pipeline. If you are not familiar with docker or containers, check out [a previous post][6].

Instead of running a command like `docker build $image:tag` every time you make a change to your Dockerfile, GitLab CI can detect changes to the source code file and trigger scripts to generate the container image and deploy it to a container registry.

Create a git repository with two files:

- `Dockerfile`
- `.gitlab-ci.yml`

In the example, the primary protected branch is called "main".

In [a previous post][7], I demonstrated how this site is hosted on the internet using markdown templates and hugo. Check that out for more details and how to set up a new git repository.

It is also possible to build a container image with static files to host a site with a simple webserver such as [nginx][8].

```Dockerfile
# Build static site
ARG HUGOVERSION=0.83.1

FROM klakegg/hugo:${HUGOVERSION}-ext-onbuild AS hugo

# Build stateless image with static site files
FROM nginx:alpine

WORKDIR /usr/share/nginx/html/

COPY --from=hugo /target /usr/share/nginx/html
```

Building from this container file will use the image `klakegg/hugo` from the [Docker Hub][9] to render the site with Hugo. Once the site files have been generated, the final image is based on `nginx:alpine` and simply adds the site files to the nginx web server.

This image can be hosted on any container platform. The final image should be very small in size as the hugo container is only used during the build process.

By default, this image will start a web server on port 80 using the content copied to `usr/share/nginx/html`

You can run the image on port 80 of the host or use a proxy server to do things like SSL/TLS encryption, or copy the image to a container platform such as kubernetes.

### GitLab CI config

When changes are made to protected branches, the GitLab CI pipeline will build the container image based on the latest changes to the container file template.

This pipeline uses a tool called [kaniko][10] to build container images based on a Dockerfile all within a container (or container platform such as kubernetes).

Update the `.gitlab-ci.yml` file to include the following:

```yaml
---
stages:
  - build
buildTesting:
  stage: build
  image:
    name: gcr.io/kaniko-project/executor:debug
    entrypoint: [""]
  variables:
    GIT_SUBMODULE_STRATEGY: recursive
  script:
    - mkdir -p /kaniko/.docker
    - echo "{\"auths\":{\"$CI_REGISTRY\":{\"username\":\"$CI_REGISTRY_USER\",\"password\":\"$CI_REGISTRY_PASSWORD\"}}}" > /kaniko/.docker/config.json
    - >-
      /kaniko/executor
      --context $CI_PROJECT_DIR
      --dockerfile $CI_PROJECT_DIR/Dockerfile
      --destination $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only:
    - testing
buildProduction:
  stage: build
  image:
    name: gcr.io/kaniko-project/executor:debug
    entrypoint: [""]
  variables:
    GIT_SUBMODULE_STRATEGY: recursive
  script:
    - mkdir -p /kaniko/.docker
    - echo "{\"auths\":{\"$CI_REGISTRY\":{\"username\":\"$CI_REGISTRY_USER\",\"password\":\"$CI_REGISTRY_PASSWORD\"}}}" > /kaniko/.docker/config.json
    - >-
      /kaniko/executor
      --context $CI_PROJECT_DIR
      --dockerfile $CI_PROJECT_DIR/Dockerfile
      --destination $CI_REGISTRY_IMAGE:latest
  only:
    - main
```

This will define a build stage. There is one stage defined for building the image. Any changes made to `origin/testing` branch will generate a container image tagged with a CI variable that is the SHA hash value of associated git commit.

The second stage defined is the primary stage that will build from the main branch and tag the container image with the "latest" tag.

### Pulling the new image

The image is now on the GitLab registry and can be pulled from `registry.gitlab.com`.

For example to pull the image, add your GitLab username and repository name and image tag like this:

```bash
docker pull registry.gitlab.com/acaylor/hugobuild:latest
```

The GitLab CI file uses variables recognized by the CI system so this can be used in any number of container build repos with no modification.

 [1]: https://docs.gitlab.com/ee/ci/
 [2]: https://en.wikipedia.org/wiki/GitLab
 [3]: https://docs.gitlab.com/ee/ci/introduction/index.html#continuous-integration
 [4]: https://docs.gitlab.com/ee/ci/introduction/index.html#continuous-delivery
 [5]: https://docs.gitlab.com/ee/ci/introduction/index.html#continuous-deployment
 [6]: /posts/containers/
 [7]: /posts/building-this-blog/
 [8]: https://docs.nginx.com/nginx/admin-guide/web-server/
 [9]: https://hub.docker.com/
 [10]: https://github.com/GoogleContainerTools/kaniko
