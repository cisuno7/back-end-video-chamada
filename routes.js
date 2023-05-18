const express = require('express');
const firebase = require('./src/Database/db');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const bodyParser = require('body-parser');

const route = express();


// Middleware para processar o upload de arquivos
route.use(fileUpload());

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
route.post('/auth', async (req, res) => {
    const { email, senha } = req.body;
  
    if (!email || !senha || typeof email !== 'string' || typeof senha !== 'string') {
      res.status(400).send('Campos de email e senha são obrigatórios e devem ser strings.');
      return;
    }
  
    try {
      const snapshot = await firebase
        .collection('usuários')
        .where('email', '==', email)
        .where('senha', '==', senha)
        .get();
  
      if (!snapshot.empty) {
        res.status(200).send('Usuário autenticado com sucesso.');
      } else {
        res.status(401).send('Email ou senha incorretos.');
      }
    } catch (error) {
      console.error(error);
      res.status(500).send('Erro ao autenticar usuário');
    }
  });
  

route.post('/upload', (req, res) => {
    if (!req.files || !req.files.photo) {
      res.status(400).send('Nenhuma foto encontrada');
      return;
    }
  
    const photo = req.files.photo;
  
    // Lê o arquivo da foto
    fs.readFile(photo.tempFilePath, (error, data) => {
      if (error) {
        console.error(error);
        res.status(500).send('Erro ao ler a foto');
        return;
      }
  
      // Converte a foto em base64
      const base64Photo = data.toString('base64');
  
      // Salva a foto no banco de dados
      firebase.collection('fotos').add({
        photo: base64Photo, // Salva a foto no campo 'photo'
      })
        .then(() => {
          res.status(201).send('Foto enviada com sucesso');
        })
        .catch((error) => {
          console.error(error);
          res.status(500).send('Erro ao enviar a foto');
        });
    });
  });
  
  
  module.exports = route;
  