import { ensureSupabase } from './supabaseClient'

function unwrap(result) {
  const { data, error } = result

  if (error) {
    throw error
  }

  return data
}

export async function listUsers() {
  const client = ensureSupabase()
  return unwrap(client.from('users').select('*').order('created_at', { ascending: false }))
}

export async function createUser(payload) {
  const client = ensureSupabase()
  return unwrap(client.from('users').insert(payload).select().single())
}

export async function updateUser(userId, payload) {
  const client = ensureSupabase()
  return unwrap(client.from('users').update(payload).eq('id', userId).select().single())
}

export async function listDonationAppeals() {
  const client = ensureSupabase()
  return unwrap(
    client.from('donation_appeals').select('*').order('created_at', { ascending: false }),
  )
}

export async function createDonationAppeal(payload) {
  const client = ensureSupabase()
  return unwrap(client.from('donation_appeals').insert(payload).select().single())
}

export async function updateDonationAppeal(appealId, payload) {
  const client = ensureSupabase()
  return unwrap(
    client.from('donation_appeals').update(payload).eq('id', appealId).select().single(),
  )
}

export async function listContributions() {
  const client = ensureSupabase()
  return unwrap(client.from('contributions').select('*').order('created_at', { ascending: false }))
}

export async function createContribution(payload) {
  const client = ensureSupabase()
  return unwrap(client.from('contributions').insert(payload).select().single())
}

export async function updateContribution(contributionId, payload) {
  const client = ensureSupabase()
  return unwrap(
    client.from('contributions').update(payload).eq('id', contributionId).select().single(),
  )
}

export async function listTasks() {
  const client = ensureSupabase()
  return unwrap(client.from('tasks').select('*').order('created_at', { ascending: false }))
}

export async function createTask(payload) {
  const client = ensureSupabase()
  return unwrap(client.from('tasks').insert(payload).select().single())
}

export async function updateTask(taskId, payload) {
  const client = ensureSupabase()
  return unwrap(client.from('tasks').update(payload).eq('id', taskId).select().single())
}

export async function listFoodCommitments() {
  const client = ensureSupabase()
  return unwrap(
    client.from('food_commitments').select('*').order('created_at', { ascending: false }),
  )
}

export async function createFoodCommitment(payload) {
  const client = ensureSupabase()
  return unwrap(client.from('food_commitments').insert(payload).select().single())
}

export async function updateFoodCommitment(commitmentId, payload) {
  const client = ensureSupabase()
  return unwrap(
    client.from('food_commitments').update(payload).eq('id', commitmentId).select().single(),
  )
}
