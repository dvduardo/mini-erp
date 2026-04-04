export function getApiErrorMessage(error, fallbackMessage, networkMessage = null) {
  const apiMessage = error?.response?.data?.error;

  if (typeof apiMessage === 'string' && apiMessage.trim()) {
    return apiMessage;
  }

  if (!error?.response && networkMessage) {
    return networkMessage;
  }

  return fallbackMessage;
}
