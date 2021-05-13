FROM node:14

WORKDIR /usr/src/Megalodon

COPY package*.json ./

RUN yarn install --prod

COPY . .

CMD [ "node", "lib/index.js" ]

