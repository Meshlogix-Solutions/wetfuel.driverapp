import { runtimeMapboxAccessToken } from './runtime-config';

export const environment = {
  apiUrl: 'https://localhost:7276/api',
  mapboxAccessToken: runtimeMapboxAccessToken(),
};
