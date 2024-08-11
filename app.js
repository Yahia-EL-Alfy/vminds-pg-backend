require('dotenv').config(); 
const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const pointRoutes = require('./routes/pointRoutes');
require('./utils/streakResetter'); 



const app = express();

app.use(bodyParser.json());

app.use('/api/vminds/auth', authRoutes);
app.use('/api/vminds/points', pointRoutes);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
