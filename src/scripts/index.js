import Xterm from "./xterm";
import Socket from "./socket";
import '../favicon.ico';
import { filteredFingerPrintComponents } from "./fingerprint";

import '../styles/index.scss';

let SOCKET_URL = '192.168.1.6:3001';

if (process.env.NODE_ENV === 'development') {
  require('../index.html');
} else {
  SOCKET_URL = 'https://anatoly.dev/';
}

const socket = new Socket(SOCKET_URL);
const xterm = new Xterm('xterm', socket);

window.onresize = () => xterm.fitAddon.fit();

