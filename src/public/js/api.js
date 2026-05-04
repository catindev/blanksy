(function bootstrapApi(global) {
  // Human-readable Russian error messages for common failure scenarios.
  const NETWORK_ERRORS = {
    default:     'Не удалось связаться с сервером. Проверьте соединение и попробуйте снова.',
    timeout:     'Сервер не отвечает. Попробуйте позже.',
    400:         'Некорректные данные. Проверьте заполненные поля.',
    401:         'Нет доступа. Ссылка доступа недействительна или устарела.',
    403:         'Нет доступа. Возможно, ссылка доступа устарела или недействительна.',
    404:         'Blank не найден.',
    409:         'Конфликт данных. Попробуйте обновить страницу.',
    413:         'Слишком большой объём данных.',
    429:         'Слишком много запросов. Подождите немного и попробуйте снова.',
    500:         'Ошибка сервера. Попробуйте позже.',
    503:         'Сервис временно недоступен. Попробуйте позже.',
  };

  async function requestJson(url, options) {
    let response;

    try {
      response = await fetch(url, options);
    } catch (networkError) {
      // fetch() itself threw — no connection, DNS failure, etc.
      const error = new Error(NETWORK_ERRORS.default);
      error.status = 0;
      throw error;
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Use server message for 4xx (it's safe and informative),
      // but fall back to our Russian copy for 5xx or unknown codes.
      const serverMessage = payload?.error?.message;
      const friendlyMessage = response.status >= 500
        ? (NETWORK_ERRORS[response.status] || NETWORK_ERRORS[500])
        : (NETWORK_ERRORS[response.status] || serverMessage || NETWORK_ERRORS.default);

      const error = new Error(friendlyMessage);
      error.details = payload?.error?.details || null;
      error.status  = response.status;
      throw error;
    }

    return payload;
  }

  function withJsonHeaders(headers = {}) {
    return { 'Content-Type': 'application/json', ...headers };
  }

  function withAccessToken(headers = {}, accessToken) {
    if (!accessToken) return headers;
    return { ...headers, Authorization: `Bearer ${accessToken}` };
  }

  global.BlanksyApi = {
    createBlank(documentPayload) {
      return requestJson('/api/blanks', {
        method: 'POST',
        headers: withJsonHeaders(),
        body: JSON.stringify(documentPayload),
      });
    },

    getBlank(path, accessToken) {
      return requestJson(`/api/blanks/${encodeURIComponent(path)}`, {
        headers: withAccessToken({}, accessToken),
      });
    },

    updateBlank(blankId, documentPayload, accessToken) {
      return requestJson(`/api/blanks/${encodeURIComponent(blankId)}`, {
        method: 'PATCH',
        headers: withAccessToken(withJsonHeaders(), accessToken),
        body: JSON.stringify(documentPayload),
      });
    },

    verifyAccess(path, accessToken) {
      return requestJson(`/api/blanks/${encodeURIComponent(path)}/access/verify`, {
        method: 'POST',
        headers: withJsonHeaders(),
        body: JSON.stringify({ accessToken }),
      });
    },
  };
}(window));
