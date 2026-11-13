// CO-STAGE and the database: the only door between the organiser / régie pages and Supabase.
// Row Level Security decides who sees what (a show and its nights belong to the person who made them).
import { sb } from '../config.js';
import { cleanProgram } from './moments.js';

const SHOW = 'id, owner_id, title, artist, venue, starts_at, hue, lang, program, is_template, updated_at';
const EVENT = 'id, show_id, room, edition, rehearsal, status, started_at, ended_at, summary, public_token';
const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

export async function me() { const { data: { session } } = await sb().auth.getSession(); return session?.user || null; }
export async function listShows(ownerId) { return ok(await sb().from('costage_shows').select(SHOW).eq('owner_id', ownerId).order('updated_at', { ascending: false })); }
export async function getShow(id) { return ok(await sb().from('costage_shows').select(SHOW).eq('id', id).maybeSingle()); }
export async function saveShow(s) {
  const row = { title: String(s.title || '').trim().slice(0, 120) || 'CO-STAGE', artist: String(s.artist || '').slice(0, 120), venue: String(s.venue || '').slice(0, 120), starts_at: s.starts_at || null, hue: Math.max(0, Math.min(359, Math.round(+s.hue || 38))), lang: s.lang === 'en' ? 'en' : 'fr', program: cleanProgram(s.program, s.lang), is_template: !!s.is_template };
  if (s.id) return ok(await sb().from('costage_shows').update(row).eq('id', s.id).select(SHOW).single());
  return ok(await sb().from('costage_shows').insert(row).select(SHOW).single());
}
export async function deleteShow(id) { return ok(await sb().from('costage_shows').delete().eq('id', id)); }
export async function listEvents(showIds) { if (!showIds.length) return []; return ok(await sb().from('costage_events').select(EVENT).in('show_id', showIds).order('started_at', { ascending: false })); }
export async function getEvent(id) { return ok(await sb().from('costage_events').select(EVENT).eq('id', id).maybeSingle()); }
export async function createEvent(showId, room, rehearsal) { return ok(await sb().from('costage_events').insert({ show_id: showId, room, rehearsal: !!rehearsal }).select(EVENT).single()); }
export async function updateEvent(id, patch) { return ok(await sb().from('costage_events').update(patch).eq('id', id).select(EVENT).single()); }
export async function deleteEvent(id) { return ok(await sb().from('costage_events').delete().eq('id', id)); }
export async function memory(token) { return ok(await sb().rpc('costage_memory', { p_token: token })); }
