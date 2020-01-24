const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const api = require("./routes/api");

app.use(bodyParser.json());

app.use(cors());

app.use("/api", api);

app.enable("trust proxy");

app.use((err, req, res, next) => {
  res.status(424).send({ error: err.message });
});

module.exports = app;
