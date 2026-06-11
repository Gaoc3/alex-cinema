with open('src/app/api/proxy/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { NextRequest, NextResponse } from 'next/server';", "import { NextRequest, NextResponse } from 'next/server';\nimport { encryptData } from '@/utils/cryptoHelper';")

content = content.replace("const cacheStore = new Map", "function buildEncryptedJsonResponse(data: any, status = 200) {\n  const encryptedPayload = encryptData(data);\n  return new NextResponse(JSON.stringify({ payload: encryptedPayload }), {\n    status,\n    headers: {\n      'Content-Type': 'application/json',\n      'Access-Control-Allow-Origin': '*',\n    }\n  });\n}\n\nconst cacheStore = new Map")

old_cache_return = """    if (cached) return buildResponse(new Response(JSON.stringify(cached), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }));"""
new_cache_return = "    if (cached) return buildEncryptedJsonResponse(cached, 200);"
content = content.replace(old_cache_return, new_cache_return)

old_fresh_return = """          const newRes = new Response(text, { status: response.status, headers: response.headers });
          const newHeaders = new Headers(newRes.headers);
          newHeaders.delete('content-encoding');
          newHeaders.delete('content-length');
          newHeaders.set('Content-Type', 'application/json');
          
          return new NextResponse(text, {
            status: response.status,
            headers: buildResponse(new Response(null, { headers: newHeaders })).headers
          });"""
new_fresh_return = "          return buildEncryptedJsonResponse(data, response.status);"
content = content.replace(old_fresh_return, new_fresh_return)

with open('src/app/api/proxy/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)
