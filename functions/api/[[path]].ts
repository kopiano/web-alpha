export async function onRequest(context) {
  const upstream = context.env.API_ORIGIN
  if (!upstream) {
    return new Response("API_ORIGIN is not configured", { status: 500 })
  }

  const incomingUrl = new URL(context.request.url)
  const upstreamUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, upstream)

  const headers = new Headers(context.request.headers)
  headers.delete("host")

  const init = {
    method: context.request.method,
    headers,
    body: ["GET", "HEAD"].includes(context.request.method) ? undefined : context.request.body,
    redirect: "manual",
  }

  const request = new Request(upstreamUrl, init)
  return fetch(request)
}
