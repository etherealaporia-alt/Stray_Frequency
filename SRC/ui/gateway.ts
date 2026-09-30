import { gameState } from '../core/state';
import type { BodyType } from '../core/types';
import { CHARACTER_APPEARANCES } from '../data/character-appearances';
import { loadCharacterProgress } from '../services/persistence';
import {
  type AuthenticatedUser,
  createCharacter,
  findCharacterByAccount,
  getAuthSession,
  loginAccount,
  logoutAccount,
  registerAccount,
  subscribeToAuthChanges
} from '../services/supabase';
import { roomFromCharacterLocation } from '../systems/navigation';
import { characterRendererMarkup } from './character-renderer';
import { escapeHtml } from './html';
import { startGame } from './interactions';

let currentUser: AuthenticatedUser | null = null;

function renderAuth(app: HTMLDivElement, message = ''): void {
  app.innerHTML = `
    <main class="gateway-shell"><section class="gateway-card panel">
      <div class="gateway-brand"><span>STRAY</span> <b>FREQUENCY</b></div>
      <p class="gateway-tagline">some places never log off</p>
      <div class="gateway-tabs">
        <button id="login-tab" class="active" type="button">LOG IN</button>
        <button id="register-tab" type="button">CREATE ACCOUNT</button>
      </div>
      <form id="auth-form" class="gateway-form">
        <label>EMAIL<input id="auth-email" type="email" autocomplete="email" required /></label>
        <label>PASSWORD<input id="auth-password" type="password" autocomplete="current-password" minlength="6" required /></label>
        <label id="confirm-password-row" hidden>CONFIRM PASSWORD<input id="auth-confirm-password" type="password" autocomplete="new-password" minlength="6" /></label>
        <label class="password-toggle"><input id="show-password" type="checkbox" /><span>SHOW PASSWORD</span></label>
        <button id="auth-submit" class="gateway-primary" type="submit">LOG IN</button>
      </form>
      <p id="auth-message" class="gateway-message">${escapeHtml(message)}</p>
    </section></main>`;

  let mode: 'login' | 'register' = 'login';
  const loginTab = document.querySelector<HTMLButtonElement>('#login-tab')!;
  const registerTab = document.querySelector<HTMLButtonElement>('#register-tab')!;
  const submit = document.querySelector<HTMLButtonElement>('#auth-submit')!;
  const password = document.querySelector<HTMLInputElement>('#auth-password')!;
  const confirmRow = document.querySelector<HTMLElement>('#confirm-password-row')!;
  const confirmPassword = document.querySelector<HTMLInputElement>('#auth-confirm-password')!;
  const showPassword = document.querySelector<HTMLInputElement>('#show-password')!;
  const messageNode = document.querySelector<HTMLElement>('#auth-message')!;

  const setMode = (next: 'login' | 'register') => {
    mode = next;
    const registering = mode === 'register';
    loginTab.classList.toggle('active', !registering);
    registerTab.classList.toggle('active', registering);
    submit.textContent = registering ? 'CREATE ACCOUNT' : 'LOG IN';
    confirmRow.hidden = !registering;
    confirmPassword.required = registering;
    password.autocomplete = registering ? 'new-password' : 'current-password';
    confirmPassword.value = '';
    messageNode.textContent = '';
  };

  loginTab.addEventListener('click', () => setMode('login'));
  registerTab.addEventListener('click', () => setMode('register'));
  showPassword.addEventListener('change', () => {
    const type = showPassword.checked ? 'text' : 'password';
    password.type = type;
    confirmPassword.type = type;
  });

  document.querySelector<HTMLFormElement>('#auth-form')!.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.querySelector<HTMLInputElement>('#auth-email')!.value.trim();
    const passwordValue = password.value;

    if (mode === 'register' && passwordValue !== confirmPassword.value) {
      messageNode.textContent = 'Passwords do not match. Check both entries and try again.';
      confirmPassword.focus();
      return;
    }

    submit.disabled = true;
    messageNode.textContent = mode === 'register' ? 'Creating account…' : 'Signing in…';

    if (mode === 'register') {
      const { data, error } = await registerAccount(email, passwordValue);
      if (error) {
        messageNode.textContent = error.message;
        submit.disabled = false;
        return;
      }
      if (!data.session) {
        setMode('login');
        messageNode.textContent = 'Account created. Check your email to verify it, then log in.';
        submit.disabled = false;
        return;
      }
      currentUser = data.user;
      await routeAuthenticatedUser(app);
      return;
    }

    const { data, error } = await loginAccount(email, passwordValue);
    if (error) {
      messageNode.textContent = error.message;
      submit.disabled = false;
      return;
    }
    currentUser = data.user;
    await routeAuthenticatedUser(app);
  });
}

function renderCharacterCreation(app: HTMLDivElement, message = ''): void {
  app.innerHTML = `
    <main class="gateway-shell">
      <section class="creator-card panel">
        <div class="gateway-brand"><span>STRAY</span> <b>FREQUENCY</b></div>
        <div class="panel-kicker">CHARACTER CREATION // PROTOTYPE</div>
        <h1>Who answers the frequency?</h1>
        <div class="creator-grid">
          <div class="creator-preview">
            ${characterRendererMarkup(CHARACTER_APPEARANCES.maraPrototype, {
              className: 'creator-character-preview',
              ariaLabel: 'Modular Mara appearance prototype'
            })}
            <strong>MODULAR APPEARANCE TEST</strong>
            <small>Body, hair and clothing are separate registered assets composited by the character renderer. Character customisation is not persisted yet.</small>
          </div>
          <form id="character-form" class="gateway-form">
            <label>CHARACTER NAME<input id="character-name" type="text" required minlength="3" maxlength="24" autocomplete="off" /></label>
            <fieldset>
              <legend>BODY TYPE</legend>
              <label class="creator-choice"><input type="radio" name="body-type" value="female" checked /> FEMALE</label>
              <label class="creator-choice"><input type="radio" name="body-type" value="male" /> MALE</label>
            </fieldset>
            <div class="creator-disabled"><span>APPEARANCE</span><strong>MODULAR PIPELINE PROTOTYPE</strong><small>The preview now proves the layer pipeline. Selection and persistence come after layer registration is visually verified.</small></div>
            <button class="gateway-primary" type="submit">SKIP APPEARANCE & ENTER CITY</button>
            <button class="gateway-secondary" id="creator-signout" type="button">LOG OUT</button>
          </form>
        </div>
        <p id="gateway-message" class="gateway-message">${escapeHtml(message)}</p>
      </section>
    </main>`;

  document.querySelector<HTMLButtonElement>('#creator-signout')?.addEventListener('click', async () => {
    await logoutAccount();
  });

  document.querySelector<HTMLFormElement>('#character-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser) return;

    const name = document.querySelector<HTMLInputElement>('#character-name')!.value.trim();
    const bodyType = document.querySelector<HTMLInputElement>('input[name="body-type"]:checked')?.value as BodyType;
    const messageNode = document.querySelector<HTMLElement>('#gateway-message');
    if (messageNode) messageNode.textContent = 'Registering character…';

    const { data, error } = await createCharacter({
      account_id: currentUser.id,
      name,
      body_type: bodyType,
      appearance_skipped: true
    });

    if (error) {
      if (messageNode) messageNode.textContent = error.message;
      return;
    }

    gameState.character = data!;
    await loadCharacterProgress();
    gameState.roomId = roomFromCharacterLocation(gameState.character.location_id);
    startGame(app);
  });
}

async function routeAuthenticatedUser(app: HTMLDivElement): Promise<void> {
  if (!currentUser) {
    renderAuth(app);
    return;
  }

  const { data, error } = await findCharacterByAccount(currentUser.id);

  if (error) {
    app.innerHTML = `<main class="gateway-shell"><section class="gateway-card panel"><div class="gateway-brand"><span>STRAY</span> <b>FREQUENCY</b></div><p class="gateway-message">Character lookup failed: ${escapeHtml(error.message)}</p><button id="retry-auth" class="gateway-primary" type="button">RETRY</button></section></main>`;
    document.querySelector<HTMLButtonElement>('#retry-auth')?.addEventListener('click', () => {
      void routeAuthenticatedUser(app);
    });
    return;
  }

  if (!data) {
    renderCharacterCreation(app);
    return;
  }

  gameState.character = data;
  await loadCharacterProgress();
  gameState.roomId = roomFromCharacterLocation(gameState.character.location_id);
  startGame(app);
}

export async function bootstrap(app: HTMLDivElement): Promise<void> {
  app.innerHTML = `<main class="gateway-shell"><section class="gateway-card panel"><div class="gateway-brand"><span>STRAY</span> <b>FREQUENCY</b></div><p class="gateway-message">Tuning frequency…</p></section></main>`;

  const { data, error } = await getAuthSession();
  if (error) {
    renderAuth(app, error.message);
    return;
  }

  currentUser = data.session?.user ?? null;
  if (currentUser) await routeAuthenticatedUser(app);
  else renderAuth(app);

  subscribeToAuthChanges((event, session) => {
    currentUser = session?.user ?? null;
    if (event === 'SIGNED_OUT' || !currentUser) {
      gameState.character = null;
      renderAuth(app);
    }
  });
}
