"use strict";

// Importing
const config = require("./config");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const DB = require("./Model");


// Express
const app = express();
const port = process.env.PORT || 3000;

// Bot config
const bot = new TelegramBot(config.token, { polling: true });
const channelID = config.channelID;

// Global variables
const url =
  "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale.json";
// const today_url =
("https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale-latest.json");

// get a source code of an html page
async function getSource(url, proxy = false) {
  const timOut = 4000;
  if (proxy != false) {
    console.log("checking with proxy");
    const response = await axios.get(url, {
      proxy: {
        host: proxy.host,
        port: proxy.port,
      },
      timeout: timeOut,
    });
    return response["data"];
  } else {
    try {
      const response = await axios.get(url, {
        timeout: timOut,
      });
      return response["data"];
    } catch (error) {
      throw new Error(`Impossibile ottere l html della pagina ${url}`);
    }
  }
}

function clean_date(date) {
  return date.split("T")[0].trim();
}

async function get_last_update_online() {
  const source = await getSource(url);
  const today_index = source.length - 1;
  let date = source[today_index]["data"];
  date = clean_date(date);
  return date;
}


function get_today_date() {
  let today = new Date().toISOString();
  return clean_date(today);
}



async function is_there_an_update() {
  const last_update_online = await get_last_update_online();
  console.log(`The last online update is ${last_update_online}`);

  const toUpdate = await DB.isNew(last_update_online);
  return toUpdate;

}

async function get_data_to_send() {
  const data = await getSource(url);

  const today_index = data.length - 1;
  const yesterday_index = today_index - 1;
  const new_infections = data[today_index]["nuovi_positivi"];
  const tests = data[today_index]["tamponi"] - data[yesterday_index]["tamponi"];
  const new_infections_ratio = parseFloat(
    ((100 / tests) * new_infections).toFixed(2)
  );
  const terapia_intensiva = data[today_index]["terapia_intensiva"];
  const terapia_intensiva_ieri = data[yesterday_index]["terapia_intensiva"];
  const delta_terapia_intensiva = terapia_intensiva - terapia_intensiva_ieri;
  const deceduti =
    data[today_index]["deceduti"] - data[yesterday_index]["deceduti"];
  const day = clean_date(data[today_index]["data"]);
  const result = {
    nuovi_positivi: new_infections,
    tamponi: tests,
    percentuale_positivi_tamponi: new_infections_ratio,
    terapia_intensiva,
    delta_terapia_intensiva,
    deceduti,
    data: day,
  };
  return result;
}


async function send_notification(stats) {
  let message = `Data: ${stats.data}\nNuovi positivi: ${stats.nuovi_positivi}\nTamponi effettuati: ${stats.tamponi}\nPercentuale positivita su tamponi effettuati: ${stats.percentuale_positivi_tamponi}\nPersone in terapia intensiva: ${stats.terapia_intensiva}\nNuove terapie intensive: ${stats.delta_terapia_intensiva}\nNuovi deceduti: ${stats.deceduti}`;
  await bot.sendMessage(channelID, message);
}

async function main() {
  DB.connect();
  const to_update = await is_there_an_update();
  if (to_update) {
    const result = await get_data_to_send();
    send_notification(result);

    await DB.saveLastUpdate(result["data"]);
  } else {
    console.log("Nothing to update");
  }
  DB.disconnect();
}

// self invoking function
// (async () => {
//   main();
// })();

app.get(`/covid19/${config.password}`, async (req, res) => {
  main();
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`Listening on localhost:${port}/covid19/${config.password}/`);
});
