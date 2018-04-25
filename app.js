'use strict';

const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const sanitize = require('./helpers/sanitize')
const port = 5000;

// Should be using memcached here
let connections = {};

// Allow CORS
app.use(cors());
//io.origins('*:*');
//io.transports = ['polling'];

app.get('/', (req, res, next) =>{
  res.send('This route works.');
});

server.listen(5000, () => {
  console.log(`Server running on localhost:${port}`)
})

io.on('connect', connectionHandler);

function connectionHandler(client) {
  let name = client.handshake.query.name;
  console.log(`${name} has connected.`);

  let nameFound = Object.values(connections).findIndex(ele => {
    return ele === name;
  });

  if (nameFound > -1) {
    console.log('Name already taken. Notifying client and disconnecting session.');
    client.emit('connection-error', 'Name already taken.');
    client.disconnect();
    return;
  }

  connections[client.id] = name;

  let payload = [
    name,
    connections
  ]

  console.log('Successful client connections.');
  client.emit('connection-success');
  console.log('Broadcasting connection to all users.');
  io.emit('participant-connected', payload);

  client.on('disconnect', function(reason){
    disconnectHandler(client, reason);
  });

  client.on('client-message', function(data){
    messageHandler(client, data);
  });

}

function disconnectHandler(client, reason) {

  let name = connections[client.id]

  delete connections[client.id]

  if (!name) return

  let payload = [
    name,
    connections
  ]
  
  io.emit('user-disconnected', payload)

}

function messageHandler(client, data) {

  let name = connections[client.id]

  io.emit('message', {'name': name, 'message': sanitize(data)})
}


