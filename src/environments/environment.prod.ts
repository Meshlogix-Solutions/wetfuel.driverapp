import { runtimeMapboxAccessToken } from './runtime-config';

export const environment = {
  apiUrl: 'https://api.wetfuel.com/api',
  mapboxAccessToken: runtimeMapboxAccessToken(),
};
