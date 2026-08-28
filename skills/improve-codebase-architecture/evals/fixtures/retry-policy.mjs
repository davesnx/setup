export function retryDelayMs(config) {
  return Number(config.retryDelayMs) || 1000;
}
