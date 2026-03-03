FROM node:24

WORKDIR /usr/src/Megalodon
RUN corepack enable

COPY package*.json ./
COPY yarn.lock ./
COPY .yarnrc.yml ./
COPY prisma ./prisma

RUN yarn install

COPY . .

RUN yarn build

CMD [ "node", "lib/index.js" ]

