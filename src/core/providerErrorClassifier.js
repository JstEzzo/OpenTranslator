/**
 * OpenTranslator — ProviderErrorClassifier
 * Classificador central de erros de provedores HTTP/API.
 */

class ProviderErrorClassifier {
  static classify(err, response = {}) {
    const status = response.statusCode || (err && err.statusCode);
    const body = (response.body || (err && err.body) || "").toString();
    const msg = (err && err.message) || "";

    // 1. RATE LIMIT (429)
    if (status === 429 || msg.includes("429") || msg.toLowerCase().includes("too many requests") || body.includes("Too Many Requests")) {
      let retryAfterMs = 10 * 60 * 1000;
      if (response.headers && response.headers["retry-after"]) {
        const ra = parseInt(response.headers["retry-after"], 10);
        if (!isNaN(ra)) retryAfterMs = ra * 1000;
      }
      return {
        type: "RATE_LIMITED",
        statusCode: 429,
        isRateLimit: true,
        retryAfterMs,
        message: "HTTP 429 Too Many Requests (Rate limit atingido)"
      };
    }

    // 2. CAPTCHA / BLOCK (302)
    if (status === 302 || body.includes("CAPTCHA") || body.includes("unusual traffic") || body.includes("Sorry...")) {
      return {
        type: "CAPTCHA_OR_BLOCK",
        statusCode: status || 302,
        isBlock: true,
        message: "Bloqueio ou redirecionamento para CAPTCHA detectado"
      };
    }

    // 3. AUTH (401 / 403)
    if (status === 401 || status === 403 || msg.includes("401") || msg.includes("403") || msg.includes("API key") || body.includes("Unauthorized")) {
      return {
        type: "AUTH_ERROR",
        statusCode: status || 401,
        isAuth: true,
        message: `Erro de autenticação/credencial (HTTP ${status || 401})`
      };
    }

    // 4. PAYLOAD TOO LARGE (413 / 414)
    if (status === 413 || status === 414 || msg.includes("413") || msg.includes("414") || msg.includes("URI Too Long") || msg.includes("Payload Too Large")) {
      return {
        type: "PAYLOAD_TOO_LARGE",
        statusCode: status || 414,
        isPayload: true,
        message: `Payload ou URI excedeu o limite do provedor (HTTP ${status || 414})`
      };
    }

    // 5. SERVER ERROR (500 - 504)
    if ((status >= 500 && status <= 504) || msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("504")) {
      return {
        type: "SERVER_ERROR",
        statusCode: status || 500,
        isServer: true,
        message: `Servidor do provedor indisponível ou com erro interno (HTTP ${status || 500})`
      };
    }

    // 6. NETWORK ERROR
    const netTokens = ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "timeout", "socket hang up"];
    if (netTokens.some(tok => msg.toLowerCase().includes(tok.toLowerCase()) || (err && err.code === tok))) {
      return {
        type: "NETWORK_ERROR",
        isNetwork: true,
        message: `Falha de rede/timeout: ${err && err.code ? err.code : msg}`
      };
    }

    // 7. INVALID PROVIDER RESPONSE
    if (msg.includes("Resposta inválida") || msg.includes("JSON") || (typeof response.body === "string" && response.body.trim().length === 0 && status === 200) || response.emptyResponse) {
      return {
        type: "INVALID_PROVIDER_RESPONSE",
        isInvalidResponse: true,
        message: "Resposta do provedor vazia, corrompida ou incompatível"
      };
    }

    return {
      type: "UNKNOWN_ERROR",
      message: msg || "Erro desconhecido"
    };
  }
}

module.exports = ProviderErrorClassifier;
