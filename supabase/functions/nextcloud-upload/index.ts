// Supabase Edge Function: nextcloud-upload
// File: supabase/functions/nextcloud-upload/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const filename = formData.get('filename') as string

    if (!file || !filename) {
      throw new Error('File and filename are required')
    }

    const nextcloudConfig = {
      baseUrl: 'https://alpenview.ch',
      username: 'admin',
      password: '9xHKC-WpYfd-4GwXB-HeXac-2p3as'
    }

    const auth = btoa(`${nextcloudConfig.username}:${nextcloudConfig.password}`)

    // 1. Create directory
    await fetch(`${nextcloudConfig.baseUrl}/remote.php/dav/files/${nextcloudConfig.username}/audio/`, {
      method: 'MKCOL',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    })

    // 2. Upload file
    const uploadUrl = `${nextcloudConfig.baseUrl}/remote.php/dav/files/${nextcloudConfig.username}/audio/${filename}`
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/octet-stream'
      },
      body: await file.arrayBuffer()
    })

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`)
    }

    // 3. Create public share
    const shareData = new URLSearchParams({
      'shareType': '3',
      'path': `/audio/${filename}`,
      'permissions': '1'
    })

    const shareResponse = await fetch(`${nextcloudConfig.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'OCS-APIRequest': 'true'
      },
      body: shareData
    })

    if (!shareResponse.ok) {
      throw new Error(`Share creation failed: ${shareResponse.status}`)
    }

    const shareText = await shareResponse.text()
    
    // Parse XML response
    const urlMatch = shareText.match(/<url>(.*?)<\/url>/)
    if (!urlMatch) {
      throw new Error('No share URL found in response')
    }

    const shareUrl = urlMatch[1]
    const downloadUrl = shareUrl + '/download'

    return new Response(
      JSON.stringify({ success: true, downloadUrl }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
