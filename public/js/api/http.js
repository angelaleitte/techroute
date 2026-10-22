export async function request(path, options = {}) {
  const headers = { Accept: "application/json", ...options.headers };
  const hasBody = options.body !== undefined;

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  let response;

  try {
    response = await fetch(path, {
      ...options,
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    return {
      success: false,
      error: { code: "NETWORK_ERROR", message: "Não foi possível conectar ao servidor." },
    };
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      error: data.error || { code: "HTTP_ERROR", message: "Falha na comunicação com o servidor." },
    };
  }

  return { success: true, value: data };
}
