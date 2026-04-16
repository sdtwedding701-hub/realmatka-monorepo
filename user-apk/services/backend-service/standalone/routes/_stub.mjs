function json(body, status = 200) {
  return Response.json(body, { status });
}

export function options() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET,POST,OPTIONS"
    }
  });
}

function notAvailable(routeName) {
  return json(
    {
      ok: false,
      error: `${routeName} is not available inside the native APK bundle. Use the deployed backend API instead.`
    },
    501
  );
}

export function createGet(routeName) {
  return async function GET() {
    return notAvailable(routeName);
  };
}

export function createPost(routeName) {
  return async function POST() {
    return notAvailable(routeName);
  };
}
