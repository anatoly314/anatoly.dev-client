import '../styles/index.scss';
import Xterm from "./xterm";

if (process.env.NODE_ENV === 'development') {
  require('../index.html');
}

const xterm = new Xterm('xterm');

window.onresize = () => xterm.fitAddon.fit();

console.log(xterm);

