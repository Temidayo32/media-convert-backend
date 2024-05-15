const express = require('express');
const path = require('path');
const cors = require('cors'); 
const videoRoutes = require('./routes/videoRoutes');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors()); 
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Use video routes
app.use('/', videoRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
