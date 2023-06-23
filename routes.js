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
  firebase.collection('users').get()
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


// Rota para obter um campo específico do usuário
route.get('/idusers/:userId', (req, res) => {
  const { userId } = req.params;

  firebase
    .collection('users')
    .doc(userId)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).send('Usuário não encontrado');
      }

      const userData = doc.data();
      const username = userData.username; // Aqui nós pegamos o campo específico

      res.status(200).json({
        username: username,
      });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Erro ao recuperar o campo específico');
    });
});

//rota para listar todos os amigos
route.get('/listFriends/:userId', async (req, res) => {
  // res.status(200).json([{ friendsData: "friendData" }]);
  // console.log(req.params);
  firebase.collection("users").doc(req.params.userId).collection("friends")
    .get().then(async (query) => {
      // console.log(query.docs);
      let friendsData = [];
      for (let doc of query.docs) {
        let data = (await firebase.collection("users").doc(doc.id).get()).data();
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
  let usersQuery = await firebase.collection("users").get();
  for (let doc of usersQuery.docs) {
    doc.ref.delete();
  }
});

//rota para buscar amigos filtrados
route.get('/listFriends/:userId/filter/:filter', (req, res) => {
  firebase.collection("users")
    .doc(req.params.userId)
    .collection("friends")
    .where("username", "array-contains", req.params.filter)
    .orderBy("username")
    .get().then(async (query) => {
      let friendsData = [];
      for (let doc of query.docs) {
        let docUser = await firebase.collection("users").doc(doc.id).get();
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
    .collection('users')
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
  let userRef = firebase.collection('users').doc(req.body.userId);
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
route.post('/sign-up', async (req, res) => {
  const { userId, username, email, phrase } = req.body;

  if (!username || !email || typeof username !== 'string' || typeof email !== 'string') {
    res.status(400).send('Dados inválidos');
    return;
  }

  let userCol = await firebase.collection("users").where("email", "==", email).get();

  if (!userCol.empty) {
    res.status(401).send("Já existe uma conta com este email.");
  }

  let userRef = firebase.collection('users').doc(userId);
  await userRef.set({
    "id": userRef.id,
    "username": username,
    "email": email,
    "photo": "",
    "new_notifications": 0,
    "credit": 0,
    "favorite_phrase": phrase,
    "current_section_id": null,
    "current_game": null,
    "status": "AWAITING_VALIDATE",
  })
    .then((result) => {
      res.status(201).send(`Usuário ${username} criado com sucesso.`);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Erro ao criar usuário');
    });
});


// Rota para autenticar um usuário
route.post('/sign-in', async (req, res, next) => {
  const { email, userId } = req.body;

  if (!email || typeof email !== 'string') {
    res.status(400).send('Erro nos parâmetros.');
    return;
  }

  try {
    const userDoc = await firebase
      .collection('users')
      .doc(userId)
      .get();

    if (userDoc.get("email") != email) {
      res.status(401).send("Erro no email do usuário");
    }

    if (userDoc.exists) {

      await userDoc.ref.update({ status: "OK" });
      res.status(200).json({ userId });
    } else {
      res.status(401).send('Usuário não encontrado.');
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
  firebase.collection('users').doc(req.body.userId).update({
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
// body = [userId, friendId, username]
route.post('/addFriend', async (req, res) => {
  const friendName = req.body.username;
  const friendId = req.body.friendId; // Obtém o ID do usuário logado da variável de solicitação
  const userId = req.body.userId;

  if (!friendId) {
    res.status(400).send('O cabeçalho "user-id" não foi fornecido.');
    return;
  }

  let doc = await firebase.collection("users").doc(friendId).get();

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

  let userData = (await firebase.collection("users").doc(userId).get()).data();

  let notRef = doc.ref.collection("notifications").doc();

  // console.log(`${notRef.id}`);

  await notRef.set({
    id: notRef.id,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    type: "FRIEND_REQUEST",
    title: "Convite",
    content: `${userData["username"]} quer ser seu amigo, você aceita?`,
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

  const userDoc = firebase.collection("users").doc(notification.to);
  const invitingDoc = firebase.collection("users").doc(notification.from);
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
    content: `${(await userDoc.get()).get("username")} ${answer ? "aceitou" : "recusou"} o seu pedido de amizade.`,
    from: userDoc.id,
    to: invitingDoc.id,
    visualized: false,
    status: answer ? "FRIEND_REQUEST_ACCEPTED" : "FRIEND_REQUEST_REFUSED",
  });
});

// Rota para covidar amigo para um jogo 
// body = [userId, friendId, game]
route.post('/inviteFriend', async (req, res) => {
  const friendId = req.body.friendId;
  const userId = req.body.userId;
  const game = req.body.game;

  let userDoc = await firebase.collection("users").doc(userId).get();
  let friendDoc = await firebase.collection("users").doc(friendId).get();
  let notRef = friendDoc.ref.collection("notifications").doc();

  await notRef.set({
    id: notRef.id,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    type: "GAME_INVITE",
    title: "Convite",
    content: `${userDoc.get("username")} está te chamado para jogar ${game}, você aceita?`,
    from: userDoc.id,
    to: friendId,
    visualized: false,
    status: "WAITING_ANSWER",
    game: game,
  }).then(() => {
    friendDoc.ref.update({ new_notifications: admin.firestore.FieldValue.increment(1) });
    res.status(200).send(`Convite de amizade enviado para ${friendDoc.get("username")}.`);
  }).catch((error) => res.status(500).send('Erro ao adicionar o amigo.'));
});

// Responder a um convite de jogo 
// body = [notification, answer]
route.post("/answerGameInvite", async (req, res) => {
  let notification = req.body.notification;
  let answer = req.body.answer

  const toRef = firebase.collection("users").doc(notification.to);
  const fromRef = firebase.collection("users").doc(notification.from);
  const notificationRef = toRef.collection("notifications").doc(notification.id);

  await notificationRef.update({
    "status": answer ? "GAME_INVITE_ACCEPTED" : "GAME_INVITE_REFUSED",
    "updated_at": admin.firestore.FieldValue.serverTimestamp(),
  });

  let notRef = fromRef.collection("notifications").doc();
  await notRef.set({
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    id: notRef.id,
    type: "GAME_INVITE_ANSWER",
    title: "Resposta do convite",
    content: `${(await toRef.get()).get("username")} ${answer ? "aceitou" : "recusou"} o seu convite de jogo.`,
    from: toRef.id,
    to: fromRef.id,
    visualized: false,
    status: answer ? "GAME_INVITE_ACCEPTED" : "GAME_INVITE_REFUSED",
    game: notification.game,
  }).then(async (result) => {
    await fromRef.update({ new_notifications: admin.firestore.FieldValue.increment(1) });
  });

  if (answer) {
    let sectionRef = firebase
      .collection("sections")
      .doc();
    let sectionData = {
      admin_id: fromRef.id,
      admin_username: (await fromRef.get()).get("username"),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      id: sectionRef.id,
      invited_id: toRef.id,
      invited_username: (await toRef.get()).get("username"),
      game: notification.game,
      allow_rematch: false,
      player_turn: fromRef.id,
      status: "IN_PROGRESS",
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (notification.game == "VELHA") {
      sectionData.admin_player = "X"
      sectionData.invited_player = "O"
    } else if (notification.game == "DAMA") {
      sectionData.admin_player = "1"
      sectionData.invited_player = "2"
      const board = [[0, 1, 0, 1, 0, 1, 0, 1], [1, 0, 1, 0, 1, 0, 1, 0], [0, 1, 0, 1, 0, 1, 0, 1], [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [2, 0, 2, 0, 2, 0, 2, 0], [0, 2, 0, 2, 0, 2, 0, 2], [2, 0, 2, 0, 2, 0, 2, 0]];
      for (let line in board) {
        let lineRef = sectionRef.collection("board").doc(line);
        await lineRef.set({ value: board[line] });
      }
    }
    await sectionRef.set(sectionData);
    await toRef.update({ current_section_id: sectionRef.id, current_game: notification.game });
    await fromRef.update({ current_section_id: sectionRef.id, current_game: notification.game });
    res.status(200).json(sectionData);
  }
});

//Rota para finalizar uma sessão
// body = [sectionId]
route.post("/endSection", async (req, res) => {
  let sectionDoc = await firebase.collection("sections").doc(req.body.sectionId).get();
  await sectionDoc.ref.update({
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    status: "FINISHED",
  });
  await firebase.collection("users").doc(sectionDoc.get("admin_id")).update({ current_section_id: null });
  await firebase.collection("users").doc(sectionDoc.get("invited_id")).update({ current_section_id: null });
});

// Rota para incrementar nos créditos do usuário o valor passado
route.post("/earnReward", async (req, res) => {
  await firebase
    .collection("users")
    .doc(req.body.userId)
    .update({
      credit: admin.firestore.FieldValue.increment(req.body.value),
    });
});

// Rota para criar uma sessão com um amigo
// body = [userId, friendId]
route.post("/createSection", async (req, res) => {
  let userDoc = await firebase.collection("users").doc(req.body.userId).get();
  let friendDoc = await firebase.collection("users").doc(req.body.friendId).get();
  let sectionRef = firebase
    .collection("sections")
    .doc();
  let sectionData = {
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    id: sectionRef.id,
    admin_id: userDoc,
    admin_username: userDoc.get("username"),
    invited_id: friendDoc.get("id"),
    invited_username: userDoc.get("username"),
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