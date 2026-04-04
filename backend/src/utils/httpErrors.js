export function sendInternalError(res, userMessage, error, logLabel = userMessage) {
  console.error(logLabel, error);
  return res.status(500).json({ error: userMessage });
}
