require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const pointRoutes = require("./routes/pointRoutes");
const chatRoutes = require("./routes/modelsRoutes");
require("./utils/streakResetter");

const authenticate = require("./middlewares/authenticate");

const app = express();

app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(bodyParser.json());

app.use("/api/vminds/auth", authRoutes);
app.use("/api/vminds/points", authenticate, pointRoutes);
app.use("/api/vminds/models", authenticate, chatRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
