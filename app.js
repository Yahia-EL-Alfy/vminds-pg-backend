require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors"); // Import the CORS middleware
const authRoutes = require("./routes/authRoutes");
const pointRoutes = require("./routes/pointRoutes");
const chatRoutes = require("./routes/modelsRoutes");
const dataRoutes = require("./routes/dataRoutes");
const reportRoutes = require("./routes/reportRoutes");
const tokensRoutes = require("./routes/tokensRoutes");
const paymentRoutes = require('./routes/paymentRoutes');
const packageRoutes = require('./routes/packageRoutes');
const callbackRoutes = require('./routes/callbackRoutes');
const PT2Routes = require('./routes/PT2Routes');
const uiDataRoutes = require('./routes/uiDataRoutes');
const adminRoutes = require('./routes/adminRoutes');
const passwordRoutes = require('./routes/passwordRoutes');

require("./utils/streakResetter");
require("./utils/consecutiveResseter");
require("./utils/resetTokensUsed");
require("./utils/populartools");

const authenticate = require("./middlewares/authenticate");

const app = express();

// Use CORS middleware to allow all origins
app.use(cors());

app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/views', express.static(path.join(__dirname, 'views')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/vminds/auth", authRoutes);
app.use("/api/vminds/points", authenticate, pointRoutes);
app.use("/api/vminds/models", authenticate, chatRoutes);
app.use("/api/vminds/data", dataRoutes);
app.use("/api/vminds/support", authenticate, reportRoutes);
app.use("/api/vminds/tokens", authenticate, tokensRoutes);
app.use("/api/vminds/packages", packageRoutes);
app.use('/api/vminds/payment', authenticate, paymentRoutes);
app.use('/api/vminds/call', callbackRoutes);
app.use('/api/vminds/PT2', authenticate, PT2Routes);
app.use('/api/vminds/UI-Data', authenticate, uiDataRoutes);
app.use('/api/vminds/password', passwordRoutes);
app.use("/api/vminds/admin", adminRoutes);

// Serve cancel-requests HTML page
app.get('/cancel-requests', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'cancel-requests/cancel-requests.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
