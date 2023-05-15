const express = require('express');
const firebase = require('./src/Database/db');
require('firebase/compat/app')


const route = express();

// Rota para listar todos os usuários
route.get('/users', (req, res) => {
    firebase.collection('usuários').get()
        .then((snapshot) => {
            const results = [];
            snapshot.forEach((doc) => {
                results.push(doc.data());
            });
            res.status(200).json(results);
        })
        .catch((error) => {
            console.error(error);
            res.status(500).send('Erro ao listar usuários');
        });
});

// Rota para criar um usuário
route.post('/users', (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password || typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).send('Dados inválidos');
        return;
    }

    firebase.collection('usuários').add({
        "nome": username,
        "senha": password,
        "email": email
    })
      .then(() => {
        res.status(201).send(`Usuário ${username} criado com sucesso.`);
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send('Erro ao criar usuário');
      });
});


// Rota para autenticar um usuário
route.post('/auth', (req, res) => {
    const { email, senha } = req.body;
    
    firebase.collection('usuários')
        .where('email', '==', email)
        .where('senha', '==', senha)
        .get()
        .then((snapshot) => {
            if (snapshot.size === 1) {
                // Usuário autenticado com sucesso
                res.status(200).send('Usuário autenticado com sucesso.');
            } else {
                // Falha na autenticação
                res.status(401).send('Email ou senha incorretos.');
            }
        })
        .catch((error) => {
            console.error(error);
            res.status(500).send('Erro ao autenticar usuário');
        });
});


module.exports = route;