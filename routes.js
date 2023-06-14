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

//rota para listar todos os amigos
route.get('/listFriends/:userId', async (req, res) => {
  // res.status(200).json([{ friendsData: "friendData" }]);
  // console.log(req.params);
  firebase.collection("usuários").doc(req.params.userId).collection("friends")
    .get().then(async (query) => {
      // console.log(query.docs);
      let friendsData = [];
      for (let doc of query.docs) {
        let data = (await firebase.collection("usuários").doc(doc.id).get()).data();
        friendsData.push(data);
      }
      // console.log(friendsData);
      res.status(200).json(friendsData);
    }).catch((error) =>
      res.status(500).send('Erro ao listar amigos')
    );
});

//rota para limpar todos os usuários
route.get('/clearUsers', async (req, res) => {
  let usersQuery = await firebase.collection("usuários").get();
  for (let doc of usersQuery.docs) {
    doc.ref.delete();
  }
});

//rota para buscar amigos filtrados
route.get('/listFriends/:userId/filter/:filter', (req, res) => {
  firebase.collection("usuários")
    .doc(req.params.userId)
    .collection("friends")
    .where("nome", "array-contains", req.params.filter)
    .orderBy("nome")
    .get().then(async (query) => {
      let friendsData = [];
      for (let doc of query.docs) {
        let docUser = await firebase.collection("usuários").doc(doc.id).get();
        friendsData.push(docUser);
      }
      res.status(200).json(friendsData);
    }).catch((error) =>
      res.status(500).send('Erro ao listar amigos')
    );
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
  let userRef = firebase.collection('usuários').doc(req.body.userId);
  userRef.update({ new_notifications: 0 });
  userRef.collection("notifications").where("visualized", "==", false)
    .get().then((snapshot) => {
      snapshot.forEach((doc) => {
        doc.ref.update({ visualized: true });
      });
      res.status(200);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Erro ao limpar novas notificações');
    });
});


// Rota para criar um usuário
route.post('/users', async (req, res) => {
  const { username, email, password, phrase } = req.body;

  if (!username || !email || !password || typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).send('Dados inválidos');
    return;
  }

  await firebase.collection('usuários').add({
    "nome": username,
    "senha": password,
    "email": email,
    "photo": "",
    "new_notifications": 0,
    "credit": 0,
    "favorite_phrase": phrase,
    "current_section_id": null,
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

// Salva a foto do usuário no banco
route.post('/upload', (req, res) => {

  if (!req.files.photo || !req.files.photo.data) {
    res.status(400).send('Nenhuma foto encontrada');
    return;
  }

  const photoBuffer = req.files.photo.data;

  // Converte o buffer da foto em base64
  const base64Photo = photoBuffer.toString('base64');

  // Salva a foto no banco de dados
  firebase.collection('usuários').doc(req.body.userId).update({
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
route.post('/addFriend', async (req, res) => {
  const friendName = req.body.nome;
  const friendId = req.body.friendId; // Obtém o ID do usuário logado da variável de solicitação
  const userId = req.body.userId;

  if (!friendId) {
    res.status(400).send('O cabeçalho "user-id" não foi fornecido.');
    return;
  }

  let doc = await firebase.collection("usuários").doc(friendId).get();

  if (!doc.exists) {
    res.status(404).send('Usuário logado não encontrado.');
    return;
  }

  let friendDoc = await doc.ref.collection("friends").doc(friendId).get();

  // Verificar se o amigo já está na lista de amigos
  if (friendDoc.exists) {
    res.status(400).send('O amigo já está na lista de amigos.');
    return;
  }

  let userData = (await firebase.collection("usuários").doc(userId).get()).data();

  let notRef = doc.ref.collection("notifications").doc();

  // console.log(`${notRef.id}`);

  await notRef.set({
    id: notRef.id,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    type: "FRIEND_REQUEST",
    title: "Convite",
    content: `${userData["nome"]} quer ser seu amigo, você aceita?`,
    from: userData["id"],
    to: friendId,
    visualized: false,
    status: "WAITING_ANSWER",
  }).then((result) => {
    doc.ref.update({ new_notifications: admin.firestore.FieldValue.increment(1) });
    res.status(200).send(`Convite de amizade enviado para ${friendName}.`);
  }).catch((error) => {
    console.error(error);
    res.status(500).send('Erro ao adicionar o amigo.');
  });
});
// Responder à uma solicitação de amizade 
// body = [notification, answer]
route.post("/answerFriendRequest", async (req, res) => {
  let notification = req.body.notification;
  let answer = req.body.answer

  // console.log(req.body);

  const userDoc = firebase.collection("usuários").doc(notification.to);
  const invitingDoc = firebase.collection("usuários").doc(notification.from);
  const userNotification = userDoc.collection("notifications").doc(notification.id);

  if (answer) {
    const invitingFriendRef = invitingDoc.collection("friends").doc(userDoc.id);
    await invitingFriendRef.set({
      "id": userDoc.id,
      "created_at": admin.firestore.FieldValue.serverTimestamp(),
    });
    const userFriendRef = userDoc.collection("friends").doc(invitingDoc.id);
    await userFriendRef.set({
      "id": invitingDoc.id,
      "created_at": admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await userNotification.update({
    "status": answer ? "FRIEND_REQUEST_ACCEPTED" : "FRIEND_REQUEST_REFUSED",
    "updated_at": admin.firestore.FieldValue.serverTimestamp(),
  });
  let notRef = invitingDoc.collection("notifications").doc();
  await notRef.set({
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    id: notRef.id,
    type: "FRIEND_REQUEST_ANSWER",
    title: "Resposta do convite",
    content: `${(await userDoc.get()).get("nome")} ${answer ? "aceitou" : "recusou"} o seu pedido de amizade.`,
    from: userDoc.id,
    to: invitingDoc.id,
    visualized: false,
    status: answer ? "FRIEND_REQUEST_ACCEPTED" : "FRIEND_REQUEST_REFUSED",
  });
});

// Rota para incrementar nos créditos do usuário o valor passado
route.post("/earnReward", async (req, res) => {
  await firebase
    .collection("usuários")
    .doc(req.body.userId)
    .update({
      credit: admin.firestore.FieldValue.increment(req.body.value),
    });
});

// Rota para criar uma sessão com um amigo
// body = [userId, friendId]
route.post("/createSection", async (req, res) => {
  let userDoc = await firebase.collection("usuários").doc(req.body.userId).get();
  let friendDoc = await firebase.collection("usuários").doc(req.body.friendId).get();
  let sectionRef = firebase
    .collection("sections")
    .doc();
  let sectionData = {
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    id: sectionRef.id,
    admin_id: userDoc,
    admin_name: userDoc.get("nome"),
    invited_id: friendDoc.get("id"),
    invited_name: userDoc.get("nome"),
  };
  await sectionRef.set(sectionData);
  await userDoc.ref.update({ current_section_id: sectionRef.id });
  await userDoc.ref.update({ current_section_id: sectionRef.id });
  res.status(200).send(sectionData);
});

module.exports = route;

// Functions created:
// /users => Rota para listar todos os usuários
// /listFriends/:userId => rota para listar todos os amigos
// /listFriends/:userId/filter/:filter => rota para buscar amigos filtrados
// /notifications => Rota para listar notificações
// /clearNotifications => Rota para limpar notificações visuzalizadas
// /users => Rota para criar um usuário
// /auth => Rota para autenticar um usuário
// /upload => Salva a foto do usuário no banco
// /addFriend => Rota para adicionar amigo ao usuário logado
// /inviteFriend Rota para covidar amigo para um jogo
// /answerFriendRequest => Responder à uma solicitação de amizade
// /earnReward => Rota para incrementar nos créditos do usuário o valor passado
// /createSection => Rota para criar uma sessão com um amigo