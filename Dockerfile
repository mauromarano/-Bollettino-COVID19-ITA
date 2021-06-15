FROM node

EXPOSE 5000

COPY . /bollettinocovid19ita/

WORKDIR /bollettinocovid19ita

RUN npm install

CMD ["npm", "run", "start"]
