const http = require('http');
const Koa = require('koa');
const app = new Koa();
const uuid = require('uuid');

class SetDayNow {
  constructor(date) {
    this.month = date.getMonth() + 1;
    this.day = date.getDate();
    this.year = String(date.getFullYear()).slice(2);
    this.hours = date.getHours();
    this.min = date.getMinutes();
    this.sec = date.getSeconds();
  }

  create() {
    const dateTime = `${this.check(this.day)}.${this.check(this.month)}.${this.year}`;
    const time = `${this.check(this.hours)}:${this.check(this.min)}:${this.check(this.sec)}`;
    return this.final(dateTime, time);
  }

  check(elem) {
    if (elem < 10) {
      return `0${elem}`;
    }
    return elem;
  }

  final(dateTime, time) {
    return `${dateTime}  ${time}`;
  }
}

// генерируем таймера число
function generateTime() {
  return Math.random() * (2500 - 1000) + 500;
}
// генерируем таймера число

const servers = [];

function splitString(stringToSplit) {
  const arrayOfStrings = stringToSplit.split(',');
  return arrayOfStrings;
}



app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (!origin) {
    return await next();
  }

  const headers = { 'Access-Control-Allow-Origin': '*', };

  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({ ...headers });
    try {
      return await next();
    } catch (e) {
      e.headers = { ...e.headers, ...headers };
      throw e;
    }
  }

  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
    ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUD, DELETE, PATCH',
    });

    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
    }
  
    ctx.response.status = 204;
  }
});



// Предыдущий код
const port = process.env.PORT || 7075;
const server = http.createServer(app.callback());

const WS = require('ws');

const wsServer = new WS.Server({ server });

wsServer.on('connection', (ws, req) => {
  function statusCreated(serverId) {
    // обновляем статус на "создан"
    setTimeout(() => {
      const serverIndex = servers.findIndex(x => x.id === serverId);
      servers[serverIndex].state = 'Created';
      const timeNow = new SetDayNow(new Date()).create();
      let messArr = ['created', servers[serverIndex].id, servers[serverIndex].state, timeNow];
      ws.send(messArr.toString());
    }, generateTime());    
  }
  function statusChange(serverId, text) {
    setTimeout(() => {
      servers[serverId].state = text;
      const timeNow = new SetDayNow(new Date()).create();
      let messArr = [text, servers[serverId].id, servers[serverId].state, timeNow];
      ws.send(messArr.toString());
    }, generateTime());
  }
  function statusRemoved(serverId) {
    // обновляем статус на "удалён"
    setTimeout(() => {
      servers[serverId].state = 'Removed';
      const timeNow = new SetDayNow(new Date()).create();
      let messArr = ['removed', servers[serverId].id, servers[serverId].state, timeNow];

      servers.splice(serverId, 1);

      ws.send(messArr.toString());
    }, generateTime());
  }

  // получаем на сервере через "this.ws.send"
  ws.on('message', (data) => {
    console.log(data);

    const dataArr = splitString(data);

    // messagesStorage.push(data);
    if (dataArr[0] === 'createNewInstance') {
      const serverId = uuid.v4(); // чтобы найти индекс, сохраняем ID отдельно
      // создаём сервер
      servers.push({id: serverId, state: 'Recieved "Create command"'});
      // индекс нужен, чтобы отправить не весь список серверов, а только тот, что нам нужен
      // (в данный момент это новый сервер)
      const serverIndex = servers.findIndex(x => x.id === serverId);
      const timeNow = new SetDayNow(new Date()).create();
      let messArr = ['true', servers[serverIndex].id, servers[serverIndex].state, timeNow];
      ws.send(messArr.toString());

      setTimeout(() => {
        statusCreated(serverId);
      }, 100);
    }

    if (dataArr[0] === 'start') {
      setTimeout(() => {
        console.log('запускаем сервер');
        const serverIndex = servers.findIndex(x => x.id === dataArr[1]);
        servers[serverIndex].state = 'Recieved "Start command"';
        const timeNow = new SetDayNow(new Date()).create();
        let messArr = ['StartCommand', servers[serverIndex].id, servers[serverIndex].state, timeNow];
        ws.send(messArr.toString());

        statusChange(serverIndex, 'started');
      }, generateTime());
    }

    if (dataArr[0] === 'pause') {
      setTimeout(() => {
        console.log('приостанавливаем сервер');
        const serverIndex = servers.findIndex(x => x.id === dataArr[1]);
        servers[serverIndex].state = 'Recieved "Pause command"';
        const timeNow = new SetDayNow(new Date()).create();
        let messArr = ['PauseCommand', servers[serverIndex].id, servers[serverIndex].state, timeNow];
        ws.send(messArr.toString());

        statusChange(serverIndex, 'paused');
      }, generateTime());
    }

    if (dataArr[0] === 'remove') {
      setTimeout(() => {
        console.log('удаляем совсем сервер');
        const serverIndex = servers.findIndex(x => x.id === dataArr[1]);
        servers[serverIndex].state = 'Recieved "Remove command"';
        const timeNow = new SetDayNow(new Date()).create();
        let messArr = ['RemoveCommand', servers[serverIndex].id, servers[serverIndex].state, timeNow];
        ws.send(messArr.toString());

        statusRemoved(serverIndex);
      }, generateTime());
    }

    // восстановить закрытые "блоки управления"
    if (dataArr[0] === 'getHistory') {
      console.log('Отправляю список серверов');
      let messArr = ['giveHistory'];
      for (let i = 0; i < servers.length; i += 1) {
        messArr.push(servers[i].id, servers[i].state);
      }
      ws.send(messArr.toString());
    }
  })
  
  // ws.send(makeArr().toString());
});

server.listen(port);
