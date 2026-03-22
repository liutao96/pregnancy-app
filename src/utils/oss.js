import OSS from 'ali-oss'

const client = new OSS({
  region: 'oss-cn-hangzhou',
  accessKeyId: import.meta.env.VITE_OSS_ACCESS_KEY_ID,
  accessKeySecret: import.meta.env.VITE_OSS_ACCESS_KEY_SECRET,
  bucket: 'liutaoxie',
})

const DATA_KEY = 'pregnancy-app-data.json'

// Upload image/PDF to OSS, return URL
export async function uploadReport(file, checkupId, reportId) {
  const ext = file.name?.split('.').pop() || (file.type === 'application/pdf' ? 'pdf' : 'jpg')
  const key = `reports/${checkupId}/${reportId}.${ext}`

  const result = await client.put(key, file)
  return result.url
}

// Upload base64 image to OSS, return URL
export async function uploadBase64Image(base64Data, checkupId, reportId, ext = 'jpg') {
  const key = `reports/${checkupId}/${reportId}.${ext}`
  const buffer = Buffer.from(base64Data, 'base64')

  const result = await client.put(key, buffer)
  return result.url
}

// Save all app data to OSS (JSON)
export async function saveDataToOSS(data) {
  const json = JSON.stringify(data)
  await client.put(DATA_KEY, Buffer.from(json))
}

// Load all app data from OSS
export async function loadDataFromOSS() {
  try {
    const result = await client.get(DATA_KEY)
    if (result.content) {
      let text = result.content.toString('utf8')
      // Handle Buffer object
      if (typeof text !== 'string') {
        text = JSON.stringify(text)
      }
      return JSON.parse(text)
    }
  } catch (e) {
    // File not exists yet, return null
    if (e.code === 'NoSuchKey' || e.name === 'NoSuchKeyError') {
      return null
    }
    console.log('OSS load error:', e.message)
  }
  return null
}

// Merge remote and local data (newer wins per record)
export function mergeData(local, remote) {
  if (!remote) return local
  if (!local) return remote

  const merged = { ...remote }

  // Merge checkups
  const checkupMap = new Map()
  for (const c of (remote.checkups || [])) {
    checkupMap.set(c.id, c)
  }
  for (const c of (local.checkups || [])) {
    const existing = checkupMap.get(c.id)
    if (!existing || new Date(c.date) > new Date(existing.date)) {
      checkupMap.set(c.id, c)
    }
  }
  merged.checkups = Array.from(checkupMap.values()).sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  )

  // Merge settings (local takes priority for user-editable fields)
  merged.settings = { ...remote.settings, ...local.settings }

  // Merge other arrays (take newer)
  for (const key of ['qa-history', 'preparation', 'postpartum', 'meal-history', 'food-exclusions']) {
    const localVal = local[key]
    const remoteVal = remote[key]
    if (localVal && !remoteVal) {
      merged[key] = localVal
    }
  }

  return merged
}

// Delete a report file from OSS
export async function deleteReportFile(url) {
  if (!url) return
  try {
    // Extract key from URL
    const urlObj = new URL(url)
    const key = urlObj.pathname.slice(1) // remove leading /
    await client.delete(key)
  } catch (e) {
    console.log('Delete file error:', e.message)
  }
}
