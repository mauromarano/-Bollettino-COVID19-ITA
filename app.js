"use strict";

// Importing
const config = require("./config");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const DB = require("./Model");
const fs = require("fs");
const Path = require("path");

// Express
const app = express();
const port = process.env.PORT || 3000;

// Bot config
const bot = new TelegramBot(config.token, {
  polling: true,
});
const channelID = config.channelID;

// Global variables
const url =
  "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale.json";
// const today_url =
("https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale-latest.json");
const imageFolder = "images";
const imageName = "chart.png";

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

// ritorna un array contenente una serie di oggetti. Ognuno rappresenta i dati di un giorno
async function get_all_data_to_send() {
  try {
    const days = await getSource(url);

    let results = [];
    let ultimi_tamponi = 0;
    let terapia_intensiva_ieri = 0;
    let totale_deceduti = 0;

    for (let day of days) {
      const new_infections = day["nuovi_positivi"];
      const terapia_intensiva = day["terapia_intensiva"];
      const delta_terapia_intensiva =
        terapia_intensiva - terapia_intensiva_ieri;
      const deceduti = day["deceduti"] - totale_deceduti;
      totale_deceduti = day["deceduti"];
      let tests = 0;

      if (ultimi_tamponi <= 0) {
        tests = day["tamponi"];
        ultimi_tamponi += tests;
        terapia_intensiva_ieri += terapia_intensiva;
      } else {
        tests = day["tamponi"] - ultimi_tamponi;
        ultimi_tamponi += tests;
        terapia_intensiva_ieri = terapia_intensiva;
      }
      const new_infections_ratio = parseFloat(
        ((100 / tests) * new_infections).toFixed(2)
      );

      const date = clean_date(day["data"]);

      const result = {
        nuovi_positivi: new_infections,
        tamponi: tests,
        percentuale_positivi_tamponi: new_infections_ratio,
        terapia_intensiva,
        delta_terapia_intensiva,
        deceduti,
        data: date,
      };
      results.push(result);
    }
    return results;
  } catch (error) {
    console.log("Impossibile scaricare i dati dalla repo");
    throw error;
  }
}

async function send_notification(stats) {
  let message = `Data: ${stats.data}\nNuovi positivi: ${stats.nuovi_positivi}\nTamponi effettuati: ${stats.tamponi}\nPercentuale positivita su tamponi effettuati: ${stats.percentuale_positivi_tamponi}\nPersone in terapia intensiva: ${stats.terapia_intensiva}\nNuove terapie intensive: ${stats.delta_terapia_intensiva}\nNuovi deceduti: ${stats.deceduti}`;
  await bot.sendMessage(channelID, message);
}

// funzione che scarica l immagine in se partendo dall url
// Riceve in ingresso un oggetto di tipo chart.js che serve per specificare le opzioni del grafico
async function downloadImage(chart) {
  try {
    const path = Path.resolve(__dirname, imageFolder, imageName);
    const writer = fs.createWriteStream(path);

    const response = await axios({
      url: "https://quickchart.io/chart",
      method: "POST",
      responseType: "stream",
      data: {
        chart: chart,
      },
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    console.log(`Impossibile scaricare l immagine usando la chart ${chart}`);
    throw error;
  }
}

// x corrisponde all'asse X. Quindi un array contenente delle date. Le date deveono essere di tipo OGGETTO e convertite prima in toLocaleString() e poi tutto l array va convertito in JSON.stringify()
// y corrisponde ai dati veri e propri da mostrare sul grafico
// label è il nome da dare alla tabella
function makeChart(label, x, y) {
  return `{type:'line',data:{labels:${x},datasets:[{label:'${label}',data:${y}}]},options: {scales: {xAxes: [{type: 'time',time: {unit: 'day'}}]}}}`;
}

// y deve essere uno dei seguenti indici
// nuovi_positivi
// tamponi
// percentuale_positivi_tamponi
// terapia_intensiva
// delta_terapia_intensiva
// deceduti
// data
async function getDataForChart(y, day = 0) {
  try {
    const results = await get_all_data_to_send();
    let xaxis = [];
    let yaxis = [];

    for (let result of results) {
      let day = new Date(result["data"]);

      // Aggiungiamo in questo array una stringa rappresentate la data a cui i dati fanno riferimento
      xaxis.push(day.toLocaleString().split(",")[0]);

      // Aggiungiamo in questo array il dato in sè
      yaxis.push(result[y]);
    }

    // Se viene passato il parametro day restitusce solo gli ultimi day giorni
    if (day !== 0) {
      xaxis = xaxis.slice(Math.max(xaxis.length - day, 1));
      yaxis = yaxis.slice(Math.max(yaxis.length - day, 1));
    }

    // I due array vanno trasformati cosi per fare in modo che chart.js li legga
    xaxis = JSON.stringify(xaxis);
    yaxis = JSON.stringify(yaxis);
    return [xaxis, yaxis];
  } catch (error) {
    console.log(`Impossibile recuperare i dati con l indice ${y}`);
    throw error;
  }
}

// Prende in ingresso il nome da dare ai dati da mostrare (label)
// ed il nome dei dati da mostrare sull asse y
// In più si può specificare il parametro day per ricevere solo i dati degli ultimi x giorni
async function sendChart(label, indexName, day = 0) {

  // Ricevo i dati
  const dataForChart = await getDataForChart(indexName, day);
  let xaxis = dataForChart[0];
  let yaxis = dataForChart[1];

  // creo l oggetto chart.js con i dati ricevuti
  const chart = makeChart(label, xaxis, yaxis);

  // scarico l immagine
  await downloadImage(chart);

  // Invio dell immagine
  await bot.sendPhoto(channelID, `./${imageFolder}/${imageName}`);
}

async function main() {
  // Mi connetto al DB
  DB.connect();

  // Verifica che ci sia un aggiornamento da fare
  const to_update = await is_there_an_update();
  if (to_update) {
    // Recupera tutti i dati dalla repo
    let results = await get_all_data_to_send();

    // Prendo solo l ultimo oggetto dell array
    let result = results[results.length - 1];

    // Manda la notifica
    send_notification(result);

    // Salva la data dell ultima notifica inviata nel DB
    await DB.saveLastUpdate(result["data"]);

    // se il giorno corrente è multiplo di tre allora manda i grafici
    let current_day = new Date();
    current_day = current_day.getDate();
    if (current_day % 3 == 0) {
      try {
        // Creazione del grafico
        await sendChart("Nuovi Positivi - 30 giorni", "nuovi_positivi", 30);
        await sendChart(
          "Percentuale di positivi su tamponi effettuati - 30 giorni",
          "percentuale_positivi_tamponi",
          30
        );
        await sendChart(
          "Terapie Intensive - 30 giorni",
          "terapia_intensiva",
          30
        );
      } catch (error) {
        console.log(`Impossibile creare il grafico`);
        throw error;
      }
    }
  } else {
    console.log("Nothing to update");
  }

  // Chiudo la connessione al DB
  DB.disconnect();
}

app.get(`/covid19/${config.password}`, async (req, res) => {
  main();
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`Listening on localhost:${port}/covid19/${config.password}/`);
});
