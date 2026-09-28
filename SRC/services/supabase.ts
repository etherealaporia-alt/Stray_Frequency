import {
  createClient,
  type AuthChangeEvent,
  type Session,
  type User
} from '@supabase/supabase-js';
import type {
  BodyType,
  Character,
  StoredCharacterProgress
} from '../core/types';

const supabase = createClient(
  'https://aikcmzqdzsbnknvcapvm.supabase.co',
  'sb_publishable_lF1shaFKY_Mcl8e0p7amqQ_UcBL_yV9'
);

export type AuthenticatedUser = User;

export function getAuthSession() {
  return supabase.auth.getSession();
}

export function subscribeToAuthChanges(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}

export function registerAccount(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export function loginAccount(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function logoutAccount() {
  return supabase.auth.signOut();
}

export async function findCharacterByAccount(accountId: string) {
  const { data, error } = await supabase.from('characters')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle();
  return { data: data as Character | null, error };
}

export async function createCharacter(input: {
  account_id: string;
  name: string;
  body_type: BodyType;
  appearance_skipped: true;
}) {
  const { data, error } = await supabase.from('characters')
    .insert(input)
    .select()
    .single();
  return { data: data as Character | null, error };
}

export function fetchCharacterProgress(characterId: string) {
  return supabase.from('characters')
    .select('progress')
    .eq('id', characterId)
    .maybeSingle();
}

export function updateCharacterProgress(
  characterId: string,
  progress: StoredCharacterProgress
) {
  return supabase.from('characters')
    .update({ progress })
    .eq('id', characterId)
    .select('id')
    .maybeSingle();
}

export function updateCharacterHealth(characterId: string, health: number) {
  return supabase.from('characters')
    .update({ health })
    .eq('id', characterId);
}
