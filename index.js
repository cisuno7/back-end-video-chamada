const express = require('express');
const app = express();
const route = require('./routes')
const cors = require('cors');

const corsOptions = {
    origin: 'http://localhost:19006/',
    credentials: true,
    optionSuccessStatus: 200
}

app.use(cors(corsOptions));

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', "http://localhost:19006");
    res.header('Access-Control-Allow-Headers', true);
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    next();
});
app.use(express.json());
app.use(route);

app.listen(process.env.PORT || 3000, ()=>{
    console.log("Servidor da Bipix Online")
})