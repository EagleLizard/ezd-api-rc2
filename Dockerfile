FROM node:22-alpine AS base

ENV USER=ezd
ENV HOME=/home/$USER
ENV APP_DIR=app

RUN mkdir -p ${HOME}/${APP_DIR}/node_modules

# see: https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#non-root-user

WORKDIR $HOME
# COPY .env .

COPY package.json .
COPY package-lock.json .
COPY .npmrc .
COPY tsconfig.json .
COPY vite.config.js .
COPY eslint.config.mjs .
COPY ./src src
COPY ./extern extern

# RUN ls -al src

RUN npm ci
RUN npx tsc
RUN npm run test

CMD ["npm", "start"]