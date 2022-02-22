FROM node:16-alpine

WORKDIR /usr/src/Megalodon

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install --prod

COPY . .

CMD [ "node", "lib/index.js" ]

