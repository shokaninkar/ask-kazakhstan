// DEPRECATED: GeoJSON is now served statically from /kazakhstan-oblasts.json
// (CDN-cacheable, no lambda cold-start). This route redirects for backwards compat.
export function GET(request: Request) {
  const url = new URL("/kazakhstan-oblasts.json", request.url)
  return Response.redirect(url.toString(), 308)
}
