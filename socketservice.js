const socketIo = require('socket.io');

class SocketService {
   constructor(server) {
        this.io = socketIo(server);
        this.io.on('connection', body => {
            //console.log(body);
        });
 } 

  emiter(event, body) {
    if(body)
      this.io.emit(event, body);
      console.log(body);
  }
}

module.exports = SocketService;