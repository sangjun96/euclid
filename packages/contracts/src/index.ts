export type HealthResponse = {
  status: 'ok' | 'unavailable';
  database: 'connected' | 'unavailable';
};
