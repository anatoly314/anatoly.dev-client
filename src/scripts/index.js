import Xterm from "./xterm";
import Socket from "./socket";
import '../favicon.ico';
import { getFingerPrintComponents } from "./fingerprint";

import '../styles/index.scss';

let SOCKET_URL = '192.168.1.6:3001';

if (process.env.NODE_ENV === 'development') {
  require('../index.html');
} else {
  SOCKET_URL = 'https://anatoly.dev/';
}

const socket = new Socket(SOCKET_URL);
socket.addEventListener('socket', async connected => {
  const components = await getFingerPrintComponents();
  console.log(components);
});

const xterm = new Xterm('xterm', socket);

window.onresize = () => xterm.fitAddon.fit();

