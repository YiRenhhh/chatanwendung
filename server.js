var WebSocket = require('ws');
var WebSocketServer = WebSocket.Server,
    wss = new WebSocketServer({port: 8181});
var uuid = require('node-uuid');

var clients = [];

function heartbeat() {
  this.isAlive = true;
}

function logInactiveClientMessage(ws) {
  for(var i=0; i<clients.length; i++) {
    if (ws == clients[i].ws){
      console.log("Client with ID " + clients[i].id + " and nickname " + clients[i].nickname + " is not reachable anymore");
    }
  }
}

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      logInactiveClientMessage(ws);
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 3000);

wss.on('close', function close() {
  clearInterval(interval);
});

function wsSend(type, client_uuid, nickname, message) {
  for(var i=0; i<clients.length; i++) {
    var clientSocket = clients[i].ws;
    if(clientSocket.readyState === WebSocket.OPEN) {
      console.log("send message to client " + clients[i].id + " with nickname " + clients[i].nickname + ": " + message);
      clientSocket.send(JSON.stringify({
        "type": type,
        "id": client_uuid,
        "nickname": nickname,
        "message": message
      }));
    }
  }
}


var clientIndex = 1;

function changeNickname(ws, newNickname){
  for(var i=0; i<clients.length; i++) {
    if (ws == clients[i].ws){
      clients[i].nickname = newNickname;
    }
  }
}

wss.on('connection', function(ws) {
  var client_uuid = uuid.v4();
  var nickname = "AnonymousUser"+clientIndex;
  clientIndex+=1;
  clients.push({"id": client_uuid, "ws": ws, "nickname": nickname});
  console.log('client [%s] connected', client_uuid);


  var connect_message = nickname + " has connected";
  wsSend("notification", client_uuid, nickname, connect_message);

  ws.isAlive = true;
  ws.on('pong', heartbeat);

  ws.on("error", function(err) {
    console.error(err);
  });

  ws.on('message', function(m) {
    var message = m.toString()
    if(message.indexOf('/nick') === 0) {
      var nickname_array = message.split(' ');
      if(nickname_array.length >= 2) {
        var old_nickname = nickname;
        nickname = nickname_array[1];
        changeNickname(ws, nickname);
        var nickname_message = "Client "+old_nickname+" changed to "+nickname;
        wsSend("nick_update", client_uuid, nickname, nickname_message);
      }
    } else if(message.indexOf('client_id:') === 0) {
      var client_id_array = message.split(' ');
      if(client_id_array.length >= 2) {
        
        var client_id = client_id_array[1];
        var client_message = "Client "+ client_id + " has connected with server ID " + client_uuid;
        console.log(client_message)
        
      }

    } else {
      wsSend("message", client_uuid, nickname, message);
    }
  });

  var closeSocket = function(customMessage) {
    for(var i=0; i<clients.length; i++) {
        if(clients[i].id == client_uuid) {
            var disconnect_message;
            if(customMessage) {
                disconnect_message = customMessage;
            } else {
                disconnect_message = nickname + " has disconnected";
            }
          wsSend("notification", client_uuid, nickname, disconnect_message);
          clients.splice(i, 1);
        }
    }
  }
  ws.on('close', function() {
      closeSocket();
  });

  process.on('SIGINT', function() {
      console.log("Closing things");
      closeSocket('Server has disconnected');
      process.exit();
  });
});