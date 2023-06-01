const express = require('express');
const firebase = require('./src/Database/db');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const route = express();
route.use(bodyParser.urlencoded({ extended: true }));
route.use(bodyParser.json());

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

//rota para listar os amigos adicionados
route.get('/listfriends', (req, res) => {
  firebase
    .collection('usuários')
    .get()
    .then((snapshot) => {
      const results = [];
      snapshot.forEach((doc) => {
        const userData = doc.data();
        const friends = userData.friends || [];

        // Modify the user data to include friends with friendName and friendId
        const modifiedUserData = {
          ...userData,
          friends: friends.map(friend => ({
            friendName: friend.friendName,
            friendId: friend.friendId
          }))
        };

        results.push(modifiedUserData);
      });

      // Flatten the array of friends from all users
      const friendsList = results.reduce((accumulator, user) => {
        accumulator.push(...user.friends);
        return accumulator;
      }, []);

      res.status(200).json(friendsList);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Erro ao listar amigos');
    });
});

// Rota para listar notificações 
route.post("/notifications", async (req, res) => {
  firebase
    .collection('usuários')
    .doc(req.body.userId)
    .collection("notifications")
    .get().then((snapshot) => {
      const results = [];
      snapshot.forEach((doc) => {
        results.push(doc.data());
      });
      res.status(200).json(results);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Erro ao listar notificações');
    });
});

// Rota para limpar notificações visuzalizadas
route.post("/clearNewNotifications", async (req, res) => {
  console.log("clearNewNotifications");
  firebase
    .collection('usuários')
    .doc(req.body.userId)
    .collection("notifications")
    .where("visualized", "==", false)
    .get().then((snapshot) => {
      snapshot.forEach((doc) => {
        doc.ref.update({ visualized: true });
      });
      res.status(200);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Erro ao listar notificações');
    });
});


// Rota para criar um usuário
route.post('/users', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password || typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).send('Dados inválidos');
    return;
  }

  await firebase.collection('usuários').add({
    "nome": username,
    "senha": password,
    "email": email,
    "photo": "",
  })
    .then((doc) => {
      doc.update({ "id": doc.id });
      res.status(201).send(`Usuário ${username} criado com sucesso.`);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Erro ao criar usuário');
    });
});


// Rota para autenticar um usuário
route.post('/auth', async (req, res, next) => {
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
      const userId = snapshot.docs[0].id; // Obtém o ID do usuário logado
      req.userId = userId; // Armazena o ID do usuário logado na variável de solicitação
      res.status(200).json({ userId });
    } else {
      res.status(401).send('Email ou senha incorretos.');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao autenticar usuário');
  }
});

route.post('/upload', (req, res) => {
  if (!req.files.photo || !req.files.photo.data) {
    res.status(400).send('Nenhuma foto encontrada');
    return;
  }

  const photoBuffer = req.files.photo.data;

  // Converte o buffer da foto em base64
  const base64Photo = photoBuffer.toString('base64');

  // Salva a foto no banco de dados
  firebase.collection('usuários').add({
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

// Rota para adicionar amigo ao usuário logado 
// body = [userId, friendId, nome]
route.post('/addFriend', (req, res) => {
  const friendName = req.body.nome;
  const friendId = req.body.friendId; // Obtém o ID do usuário logado da variável de solicitação
  const userId = req.body.userId;

  if (!friendId) {
    res.status(400).send('O cabeçalho "user-id" não foi fornecido.');
    return;
  }

  // Verificar se o usuário logado existe
  firebase
    .collection('usuários')
    .doc(userId)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        res.status(404).send('Usuário logado não encontrado.');
        return;
      }

      const userData = doc.data();
      const friends = userData.friends || [];

      // Verificar se o amigo já está na lista de amigos
      if (friends.includes(friendName)) {
        res.status(400).send('O amigo já está na lista de amigos.');
        return;
      }

      // Adicionar o amigo à lista de amigos
      friends.push(friendName);

      // Atualizar os dados do usuário logado no banco de dados
      doc
        .ref
        .update({ friends: friends })
        .then(() => {
          firebase
            .collection("usuários")
            .doc(friendId)
            .collection("notifications")
            .add({
              created_at: admin.firestore.FieldValue.serverTimestamp(),
              type: "INVITE",
              title: "Convite",
              content: `${userData["nome"]} está te convidando para jogar com ele.`,
              from: userData["id"],
              to: friendId,
              visualized: false,
            });
          res.status(200).send(`O amigo ${friendName} foi adicionado com sucesso.`);
        })
        .catch((error) => {
          console.error(error);
          res.status(500).send('Erro ao adicionar o amigo.');
        });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Erro ao buscar usuário logado.');
    });
});

module.exports = route;
