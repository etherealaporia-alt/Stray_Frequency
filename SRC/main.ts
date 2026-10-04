import './styles/index.css';
import './ui/multiplayer';
import { bootstrap } from './ui/gateway';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root missing');

void bootstrap(app);
