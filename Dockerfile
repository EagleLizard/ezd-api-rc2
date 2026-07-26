FROM node:22-alpine AS base

ENV USER=ezd
ENV HOME=/home/$USER
ENV APP_DIR=app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN mkdir -p ${HOME}/${APP_DIR}/node_modules

# see: https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#non-root-user

WORKDIR $HOME
# COPY .env .

COPY package.json .
COPY pnpm-lock.yaml .
COPY pnpm-workspace.yaml .
COPY .npmrc .
COPY tsconfig.json .
COPY vite.config.js .
COPY eslint.config.mjs .
COPY ./src src
COPY ./extern extern

# RUN ls -al src

RUN pnpm ci
RUN pnpm exec tsc
RUN pnpm run test

CMD ["pnpm", "start"]