const express = require('express');
const pool = require('./src/Database/db')
const route = express();


// Rota para listar todos os usuários
route.get('/users', (req, res) => {
    pool.query('SELECT * FROM login', (error, results) => {
        if (error) {
            return res.status(404).json("Sucesso");
        }
        res.status(200).json(results.rows);
    });
});

// Rota para adicionar um novo usuário
route.post('/users', (req, res) => {
    const { username, password,email,nickname } = req.body;

    if(username == null){
        return res.status(400).json("Por gentileza insira o username");
    }
    
    if(password==null){
        return res.status(400).json("Por gentileza insira o password");
    }
    
    if(email==null){
        return res.status(400).json("Por gentileza insira o email");
    }

    pool.query('INSERT INTO login (username, email, password,nickname) VALUES ($1, $2,$3,$4)', [username, password,email,nickname], (error, result) => {
        if (error) {
            throw error;
        }
        res.status(201).send(`Usuário ${username} criado com sucesso.`);
    });
});
// Rota para autenticar um usuário
route.post('/auth', (req, res) => {
    const { email, password } = req.body;
    pool.query('SELECT * FROM login WHERE email = $1 AND password = $2', [email, password], (error, results) => {
        if (error) {
            throw error;
        }
        if (results.rowCount === 1) {
            // Usuário autenticado com sucesso
            res.status(200).send('Usuário autenticado com sucesso.');
        } else {
            // Falha na autenticação
            res.status(401).send('Email ou senha incorretos.');
        }
    });
});

module.exports = route;