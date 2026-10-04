import { gameState } from '../core/state';
import type { BodyType, CharacterAppearance } from '../core/types';
import { CHARACTER_APPEARANCES } from '../data/character-appearances';
import { loadCharacterProgress } from '../services/persistence';
import {
  type AuthenticatedUser, createCharacter, findCharacterByAccount, getAuthSession,
  loginAccount, logoutAccount, refreshDeveloperAccess, registerAccount,
  resendSignupConfirmation, subscribeToAuthChanges
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
      <div class="gateway-tabs"><button id="login-tab" class="active" type="button">LOG IN</button><button id="register-tab" type="button">CREATE ACCOUNT</button></div>
      <form id="auth-form" class="gateway-form">
        <label>EMAIL<input id="auth-email" type="email" autocomplete="email" required /></label>
        <label>PASSWORD<input id="auth-password" type="password" autocomplete="current-password" required /></label>
        <label id="confirm-password-row" hidden>CONFIRM PASSWORD<input id="auth-confirm-password" type="password" autocomplete="new-password" /></label>
        <p id="password-requirement" class="gateway-message" hidden>Minimum 12 characters.</p>
        <label class="password-toggle"><input id="show-password" type="checkbox" /><span>SHOW PASSWORD</span></label>
        <button id="auth-submit" class="gateway-primary" type="submit">LOG IN</button>
        <button id="resend-confirmation" class="gateway-secondary" type="button" hidden>RESEND CONFIRMATION EMAIL</button>
      </form><p id="auth-message" class="gateway-message">${escapeHtml(message)}</p>
    </section></main>`;

  let mode: 'login' | 'register' = 'login';
  const loginTab = document.querySelector<HTMLButtonElement>('#login-tab')!;
  const registerTab = document.querySelector<HTMLButtonElement>('#register-tab')!;
  const submit = document.querySelector<HTMLButtonElement>('#auth-submit')!;
  const resend = document.querySelector<HTMLButtonElement>('#resend-confirmation')!;
  const emailInput = document.querySelector<HTMLInputElement>('#auth-email')!;
  const password = document.querySelector<HTMLInputElement>('#auth-password')!;
  const confirmRow = document.querySelector<HTMLElement>('#confirm-password-row')!;
  const confirmPassword = document.querySelector<HTMLInputElement>('#auth-confirm-password')!;
  const passwordRequirement = document.querySelector<HTMLElement>('#password-requirement')!;
  const showPassword = document.querySelector<HTMLInputElement>('#show-password')!;
  const messageNode = document.querySelector<HTMLElement>('#auth-message')!;

  const setMode = (next: 'login' | 'register') => {
    mode = next;
    const registering = mode === 'register';
    loginTab.classList.toggle('active', !registering);
    registerTab.classList.toggle('active', registering);
    submit.textContent = registering ? 'CREATE ACCOUNT' : 'LOG IN';
    confirmRow.hidden = !registering;
    passwordRequirement.hidden = !registering;
    confirmPassword.required = registering;
    password.autocomplete = registering ? 'new-password' : 'current-password';
    password.minLength = registering ? 12 : 0;
    confirmPassword.minLength = registering ? 12 : 0;
    confirmPassword.value = '';
    resend.hidden = true;
    messageNode.textContent = '';
  };

  loginTab.addEventListener('click', () => setMode('login'));
  registerTab.addEventListener('click', () => setMode('register'));
  showPassword.addEventListener('change', () => {
    const type = showPassword.checked ? 'text' : 'password';
    password.type = type;
    confirmPassword.type = type;
  });

  resend.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email || !emailInput.validity.valid) {
      messageNode.textContent = 'Enter the email address for the account first.';
      emailInput.focus();
      return;
    }
    resend.disabled = true;
    messageNode.textContent = 'Sending confirmation email…';
    const { error } = await resendSignupConfirmation(email);
    if (error) {
      messageNode.textContent = error.message;
      resend.disabled = false;
      return;
    }
    messageNode.textContent = 'Confirmation email sent. Check your inbox and spam folder.';
    resend.disabled = false;
  });

  document.querySelector<HTMLFormElement>('#auth-form')!.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    const passwordValue = password.value;
    resend.hidden = true;

    if (mode === 'register' && passwordValue.length < 12) {
      messageNode.textContent = 'Password must be at least 12 characters.';
      password.focus();
      return;
    }

    if (mode === 'register' && passwordValue !== confirmPassword.value) {
      messageNode.textContent = 'Passwords do not match. Check both entries and try again.';
      confirmPassword.focus();
      return;
    }

    submit.disabled = true;
    messageNode.textContent = mode === 'register' ? 'Creating account…' : 'Signing in…';

    if (mode === 'register') {
      const { data, error } = await registerAccount(email, passwordValue);
      if (error) { messageNode.textContent = error.message; submit.disabled = false; return; }
      if (!data.session) {
        setMode('login');
        emailInput.value = email;
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
      const unconfirmed = error.message.toLowerCase().includes('email not confirmed');
      messageNode.textContent = unconfirmed
        ? 'Email not confirmed. Check your inbox for the confirmation email.'
        : error.message;
      resend.hidden = !unconfirmed;
      submit.disabled = false;
      return;
    }
    currentUser = data.user;
    await routeAuthenticatedUser(app);
  });
}

function workshopMarkup(appearance: CharacterAppearance, mode: 'creation' | 'workshop', characterName = ''): string {
  const existing = mode === 'workshop';
  return `
    <main class="gateway-shell creator-shell"><section class="creator-card panel">
      <div class="gateway-brand"><span>STRAY</span> <b>FREQUENCY</b></div>
      <div class="panel-kicker">${existing ? 'APPEARANCE WORKSHOP // PREVIEW' : 'CHARACTER CREATION // PROTOTYPE'}</div>
      <h1>${existing ? 'Character appearance workshop' : 'Who answers the frequency?'}</h1>
      <div class="creator-grid">
        <div class="creator-preview">
          ${characterRendererMarkup(appearance, { className: 'creator-character-preview', ariaLabel: existing ? `${characterName} appearance preview` : 'Character appearance preview' })}
          <strong>LIVE LAYER COMPOSITE</strong>
          <small>Body, hair and clothing are separate registered assets sharing one canvas.</small>
        </div>
        <div class="gateway-form creator-controls">
          ${existing ? `<div class="workshop-character-name"><span>CHARACTER</span><strong>${escapeHtml(characterName)}</strong></div>` : `<label>CHARACTER NAME<input id="character-name" type="text" required minlength="3" maxlength="24" autocomplete="off" /></label>`}
          <label class="creator-select-label">BODY<select id="body-type"><option value="female">Female</option><option value="male" disabled>Male — asset pending</option></select></label>
          <label class="creator-select-label">HAIR<select id="hair-style"><option value="mara">Mara undercut</option><option value="none">None</option></select></label>
          <label class="creator-select-label">CLOTHING<select id="clothing-style"><option value="mara">Mara outfit</option><option value="none">Base layer</option></select></label>
          ${existing ? `<div class="workshop-notice"><strong>PREVIEW ONLY</strong><small>No character data is changed yet. Your existing progress remains untouched.</small></div><button class="gateway-primary" id="workshop-return" type="button">RETURN TO CITY</button>` : `<button class="gateway-primary" id="create-character" type="button">CREATE CHARACTER & ENTER CITY</button>`}
          <button class="gateway-secondary" id="creator-signout" type="button">LOG OUT</button>
        </div>
      </div><p id="gateway-message" class="gateway-message"></p>
    </section></main>`;
}

function selectedAppearance(): CharacterAppearance {
  const hair = document.querySelector<HTMLSelectElement>('#hair-style')?.value;
  const clothing = document.querySelector<HTMLSelectElement>('#clothing-style')?.value;
  return {
    body: CHARACTER_APPEARANCES.maraPrototype.body,
    hair: hair === 'none' ? undefined : CHARACTER_APPEARANCES.maraPrototype.hair,
    clothing: clothing === 'none' ? undefined : CHARACTER_APPEARANCES.maraPrototype.clothing
  };
}

function refreshWorkshopPreview(): void {
  const host = document.querySelector<HTMLElement>('.creator-character-preview');
  if (!host) return;
  const replacement = document.createElement('div');
  replacement.innerHTML = characterRendererMarkup(selectedAppearance(), { className: 'creator-character-preview', ariaLabel: 'Character appearance preview' });
  host.replaceWith(replacement.firstElementChild!);
}

function bindWorkshopControls(): void {
  document.querySelectorAll<HTMLSelectElement>('#body-type, #hair-style, #clothing-style').forEach((select) => select.addEventListener('change', refreshWorkshopPreview));
  document.querySelector<HTMLButtonElement>('#creator-signout')?.addEventListener('click', async () => { await logoutAccount(); });
}

function renderCharacterCreation(app: HTMLDivElement): void {
  app.innerHTML = workshopMarkup(CHARACTER_APPEARANCES.maraPrototype, 'creation');
  bindWorkshopControls();
  document.querySelector<HTMLButtonElement>('#create-character')?.addEventListener('click', async () => {
    if (!currentUser) return;
    const nameInput = document.querySelector<HTMLInputElement>('#character-name')!;
    const name = nameInput.value.trim();
    const messageNode = document.querySelector<HTMLElement>('#gateway-message')!;
    if (name.length < 3) { messageNode.textContent = 'Character name must be at least 3 characters.'; nameInput.focus(); return; }
    messageNode.textContent = 'Registering character…';
    const { data, error } = await createCharacter({ account_id: currentUser.id, name, body_type: 'female' as BodyType, appearance_skipped: true });
    if (error) { messageNode.textContent = error.message; return; }
    gameState.character = data!;
    await loadCharacterProgress();
    await refreshDeveloperAccess();
    gameState.roomId = roomFromCharacterLocation(gameState.character.location_id);
    startGame(app);
  });
}

function renderAppearanceWorkshop(app: HTMLDivElement): void {
  const character = gameState.character;
  if (!character) { void routeAuthenticatedUser(app); return; }
  app.innerHTML = workshopMarkup(CHARACTER_APPEARANCES.maraPrototype, 'workshop', character.name);
  bindWorkshopControls();
  document.querySelector<HTMLButtonElement>('#workshop-return')?.addEventListener('click', () => {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    startGame(app);
  });
}

async function routeAuthenticatedUser(app: HTMLDivElement): Promise<void> {
  if (!currentUser) { renderAuth(app); return; }
  const { data, error } = await findCharacterByAccount(currentUser.id);
  if (error) {
    app.innerHTML = `<main class="gateway-shell"><section class="gateway-card panel"><div class="gateway-brand"><span>STRAY</span> <b>FREQUENCY</b></div><p class="gateway-message">Character lookup failed: ${escapeHtml(error.message)}</p><button id="retry-auth" class="gateway-primary" type="button">RETRY</button></section></main>`;
    document.querySelector<HTMLButtonElement>('#retry-auth')?.addEventListener('click', () => void routeAuthenticatedUser(app));
    return;
  }
  if (!data) { renderCharacterCreation(app); return; }
  gameState.character = data;
  await loadCharacterProgress();
  await refreshDeveloperAccess();
  gameState.roomId = roomFromCharacterLocation(gameState.character.location_id);
  if (location.hash === '#appearance-workshop') { renderAppearanceWorkshop(app); return; }
  startGame(app);
}

export async function bootstrap(app: HTMLDivElement): Promise<void> {
  app.innerHTML = `<main class="gateway-shell"><section class="gateway-card panel"><div class="gateway-brand"><span>STRAY</span> <b>FREQUENCY</b></div><p class="gateway-message">Tuning frequency…</p></section></main>`;
  const { data, error } = await getAuthSession();
  if (error) { renderAuth(app, error.message); return; }
  currentUser = data.session?.user ?? null;
  if (currentUser) await routeAuthenticatedUser(app); else renderAuth(app);
  subscribeToAuthChanges((event, session) => {
    currentUser = session?.user ?? null;
    if (event === 'SIGNED_OUT' || !currentUser) { gameState.character = null; renderAuth(app); }
  });
}
