interface WetFuelRuntimeConfig {
  mapboxAccessToken?: string;
}

export function runtimeMapboxAccessToken(): string {
  return (window as Window & { __wetfuelConfig?: WetFuelRuntimeConfig })
    .__wetfuelConfig?.mapboxAccessToken?.trim() ?? '';
}
