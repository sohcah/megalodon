FROM node:20

WORKDIR /usr/src/Megalodon

COPY package*.json ./
COPY yarn.lock ./
COPY .yarnrc.yml ./
COPY .yarn ./.yarn
COPY prisma ./prisma

RUN yarn install

COPY . .

RUN yarn build

CMD [ "node", "lib/index.js" ]

