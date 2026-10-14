/**
 * Storage Service — photo uploads to Supabase Storage.
 * @module services/storageService
 */
import { supabase } from '@/services/supabaseClient.js'

/**
 * Upload a photo to the report-photos bucket.
 * @param {File} file - The file object to upload
 * @param {string} [folder='reports'] - Subfolder in the bucket
 * @returns {Promise<string>} The public URL of the uploaded file
 */
export async function uploadPhoto(file, folder = 'reports') {
  const ext = file.name.split('.').pop()
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('report-photos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('report-photos')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}

/**
 * Delete a photo from Supabase Storage by URL.
 * @param {string} publicUrl - The full public URL of the file
 */
export async function deletePhoto(publicUrl) {
  // Extract the path from the public URL
  const parts = publicUrl.split('/report-photos/')
  if (parts.length < 2) return

  const filePath = parts[1]
  const { error } = await supabase.storage
    .from('report-photos')
    .remove([filePath])

  if (error) console.error('Failed to delete photo:', error.message)
}
