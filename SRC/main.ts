import './styles/index.css';
import { bootstrap } from './ui/gateway';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) throw new Error('App root missing');

void bootstrap(app);
