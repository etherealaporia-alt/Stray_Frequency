import './styles/index.css';
import { preloadCoreAssets } from './core/assets';
import { bootstrap } from './ui/gateway';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root missing');

void (async () => {
  await preloadCoreAssets();
  await bootstrap(app);
})();
