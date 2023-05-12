const express = require('express');
const firebase = require('./src/Database/db');

const route = express();

// Rota para listar todos os usuários
route.get('/users', (req, res) => {
    firebase.firestore().collection('usuários').get()
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

// Rota para adicionar um novo usuário
route.post('/users', (req, res) => {
    const { Nome, senha, email } = req.body;

    firebase.firestore().collection('usuários').add({
        senha: senha,
        email: email,
        Nome: nome
    })
        .then(() => {
            res.status(201).send(`Usuário ${Nome} criado com sucesso.`);
        })
        .catch((error) => {
            console.error(error);
            res.status(500).send('Erro ao criar usuário');
        });
});

// Rota para autenticar um usuário
route.post('/auth', (req, res) => {
    const { email, senha } = req.body;

    firebase.firestore().collection('usuários')
        .where('email', '==', email)
        .where('password', '==', senha)
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
