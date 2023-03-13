const express = require('express');
const app = express();
const route = require('./routes')
const cors = require('cors');

app.use(cors());
app.use(express.json());
app.use(route);

app.listen(process.env.PORT || 3000, ()=>{
    console.log("Servidor Online")
})