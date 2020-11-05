const mongoose = require("mongoose");
const config = require('./config')

const user = config.userdb;
const password = config.passworddb;

const url = config.mongourl;

connect();

function connect() {
  try {
    mongoose.connect(url, {
      auth: {
        user,
        password,
      },
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connecting to mongodb');
  } catch (error) {
    console.log("Unable to connect to mongodb");
    throw error;
  }
}

const Updates = mongoose.model("Updates", { data: { type: String } });

async function saveLastUpdate(data) {
  try {
    const oggi = new Updates({ data: data });
    await oggi.save();
    console.log(`${data} salvato nel DB`);
  } catch (error) {
    console.log(`Unable to save ${data} to mongodb`);
    throw error;
  }
}

function disconnect() {
  mongoose.connection.close();
  console.log("Disconnecting from DB");
}

async function isNew(d) {
  try {
    const update = await Updates.find({});
    for (let u of update) {
      if ((u["data"] == d)) {
        console.log(`${d} is already present inside the DB`);
        return false;
      }
    }
    console.log(`${d} is not present inside the DB`);
    return true;
  } catch (error) {
    console.log(`Unable to find ${d} inside the mongodb`);
    throw error;
  }
}


module.exports = {
  saveLastUpdate,
  disconnect,
  connect,
  isNew,
};
