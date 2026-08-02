import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import type { GeoJSONSource, Map as MapboxMap, Marker } from 'mapbox-gl/esm';
import { environment } from '../../environments/environment';
import { DriverStateService } from '../services/driver-state.service';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-route-map',
  standalone: true,
  imports: [RouterLink, MobileShellComponent, IonCard, IonCardContent, IonButton, IonIcon],
  template: `
<wf-mobile-shell title="Navigate to site" [subtitle]="'Job ' + (state.selectedJob()?.jobNumber || '')" [backRoute]="'/jobs/' + (state.selectedJob()?.id || '')">
  <main class="screen-body stack">
    <section class="route-map">
      <div #map class="route-map__canvas"></div>
      <svg class="planned-route-overlay" aria-hidden="true"><polyline #plannedRouteLine /></svg>
      @if (mapError) { <div class="map-message map-message--error">{{ mapError }}</div> }
      @if (locating) { <div class="map-message">Finding your current location...</div> }
      <ion-card class="wf-card compact route-summary">
        <ion-card-content>
          <div class="row-between">
            <div><strong>{{ distanceLabel }}</strong><p class="caption">{{ durationLabel }} · {{ state.selectedJob()?.siteAddress }}</p></div>
            <span class="pill success">{{ statusLabel }}</span>
          </div>
        </ion-card-content>
      </ion-card>
    </section>

    <ion-card class="wf-card">
      <ion-card-content class="row">
        <div class="icon-tile"><ion-icon name="navigate-outline"></ion-icon></div>
        <div><strong>{{ nextInstruction || 'Follow the highlighted route' }}</strong><p class="caption">Route updates automatically as your location changes.</p></div>
      </ion-card-content>
    </ion-card>

    <div class="grid-2">
      <ion-button class="wf-button wf-secondary" expand="block" [href]="mapsUrl" target="_blank" rel="noopener">Voice navigation</ion-button>
      <ion-button class="wf-button" expand="block" [disabled]="!latestPosition" (click)="openArrival()">I've arrived</ion-button>
    </div>
    <ion-button class="wf-button" color="danger" fill="outline" expand="block" routerLink="/incident">Report route or safety issue</ion-button>
  </main>
</wf-mobile-shell>
  `,
  styles: [`
    .route-map{position:relative;height:min(58vh,520px);min-height:410px;overflow:hidden;border:1px solid var(--wf-border);border-radius:22px;background:#e6e6e6}
    .route-map__canvas{position:absolute;inset:0}
    .planned-route-overlay{position:absolute;inset:0;z-index:2;width:100%;height:100%;pointer-events:none;overflow:hidden}
    .planned-route-overlay polyline{fill:none;stroke:#e31b23;stroke-width:7;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 2px #fff)}
    .route-summary{position:absolute;z-index:3;left:14px;right:14px;bottom:14px;margin:0!important;background:rgba(255,255,255,.94)!important;backdrop-filter:blur(8px)}
    .route-summary .caption{margin:4px 0 0;max-width:430px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .map-message{position:absolute;z-index:4;left:14px;right:70px;top:14px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.94);color:#263238;font-size:13px;box-shadow:0 3px 14px rgba(0,0,0,.18)}
    .map-message--error{background:#fff1f2;color:#9f1239}
  `],
})
export class RouteMapPage implements AfterViewInit, OnDestroy {
  @ViewChild('map', { static: true }) private readonly mapElement!: ElementRef<HTMLDivElement>;
  @ViewChild('plannedRouteLine', { static: true }) private readonly plannedRouteLine!: ElementRef<SVGPolylineElement>;

  locating = true;
  mapError = '';
  distanceMeters?: number;
  durationSeconds?: number;
  nextInstruction = '';

  private mapbox?: typeof import('mapbox-gl/esm');
  private map?: MapboxMap;
  private driverMarker?: Marker;
  private siteMarker?: Marker;
  private watchId?: number;
  private resizeObserver?: ResizeObserver;
  private directionsRequest?: AbortController;
  private lastRoutedPoint?: [number, number];
  private lastRouteAt = 0;
  private fittedRoute = false;
  private ready = false;
  private routeCoordinates: [number, number][] = [];
  latestPosition?: { latitude:number; longitude:number; accuracyMeters:number };

  constructor(readonly state: DriverStateService, private readonly zone: NgZone, private readonly cdr: ChangeDetectorRef, private readonly router: Router) {}

  get statusLabel(): string {
    const value = this.state.selectedJob()?.status || 'assigned';
    return value.replace(/_/g, ' ').replace(/\b\w/g, value => value.toUpperCase());
  }

  get distanceLabel(): string {
    return this.distanceMeters == null ? 'Calculating route...' : `${(this.distanceMeters / 1609.344).toFixed(1)} miles`;
  }

  get durationLabel(): string {
    if (this.durationSeconds == null) return 'Waiting for route';
    const minutes = Math.max(1, Math.round(this.durationSeconds / 60));
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
  }

  get mapsUrl(): string {
    const job = this.state.selectedJob();
    const destination = job?.latitude != null && job?.longitude != null
      ? `${job.latitude},${job.longitude}`
      : job?.siteAddress ?? '';
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  }

  async ngAfterViewInit(): Promise<void> {
    const destination = this.destination();
    if (!environment.mapboxAccessToken) { this.mapError = 'Mapbox access token is not configured.'; this.locating = false; return; }
    if (!destination) { this.mapError = 'The customer site does not have a map location.'; this.locating = false; return; }

    const mapboxgl = await import('mapbox-gl/esm');
    this.mapbox = mapboxgl;
    this.map = new mapboxgl.Map({
      accessToken: environment.mapboxAccessToken,
      container: this.mapElement.nativeElement,
      style: rasterStreetStyle(environment.mapboxAccessToken),
      projection: 'mercator',
      center: destination,
      zoom: 14,
    });
    this.resizeObserver = new ResizeObserver(() => this.map?.resize());
    this.resizeObserver.observe(this.mapElement.nativeElement);
    this.map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    this.map.on('load', () => this.zone.run(() => {
      this.ready = true;
      this.addSiteMarker(destination);
      this.startLocationWatch();
    }));
    this.map.on('render', () => this.updatePlannedRouteOverlay());
    this.map.on('error', event => this.zone.run(() => {
      const message = event.error?.message || 'Mapbox could not load the map.';
      if (!/abort|cancel/i.test(message)) this.mapError = message;
      this.cdr.detectChanges();
    }));
  }

  ngOnDestroy(): void {
    if (this.watchId != null) navigator.geolocation.clearWatch(this.watchId);
    this.directionsRequest?.abort();
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  private startLocationWatch(): void {
    if (!navigator.geolocation) { this.locating = false; this.mapError = 'Location is unavailable on this device.'; return; }
    this.watchId = navigator.geolocation.watchPosition(
      position => this.zone.run(() => this.updatePosition(position)),
      error => this.zone.run(() => { this.locating = false; this.mapError = error.message || 'Location permission is required for navigation.'; this.cdr.detectChanges(); }),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }

  private updatePosition(position: GeolocationPosition): void {
    if (!this.map || !this.mapbox || !this.ready) return;
    const point: [number, number] = [position.coords.longitude, position.coords.latitude];
    this.latestPosition = { latitude:position.coords.latitude, longitude:position.coords.longitude, accuracyMeters:position.coords.accuracy };
    this.locating = false;
    this.mapError = '';
    if (!this.driverMarker) {
      this.driverMarker = new this.mapbox.Marker({ element: markerElement('truck') })
        .setLngLat(point).setPopup(new this.mapbox.Popup({ offset: 24 }).setText('Your location')).addTo(this.map);
    } else this.driverMarker.setLngLat(point);

    if (this.fittedRoute) this.map.easeTo({ center: point, zoom: Math.max(this.map.getZoom(), 15), bearing: position.coords.heading ?? this.map.getBearing(), duration: 600 });
    else this.map.easeTo({ center:point, zoom:14, duration:400 });
    this.cdr.detectChanges();
    void this.updateRouteIfNeeded(point);
  }

  openArrival(): void {
    const job = this.state.selectedJob();
    if (!job || !this.latestPosition) return;
    this.state.setPendingArrivalLocation({ jobId:job.id, ...this.latestPosition, capturedAt:new Date().toISOString() });
    void this.router.navigate(['/jobs', job.id, 'arrival']);
  }

  private async updateRouteIfNeeded(point: [number, number]): Promise<void> {
    const destination = this.destination();
    if (!destination) return;
    const now = Date.now();
    if (this.lastRoutedPoint && now - this.lastRouteAt < 10000 && distanceBetween(point, this.lastRoutedPoint) < 30) return;
    this.lastRoutedPoint = point;
    this.lastRouteAt = now;
    this.directionsRequest?.abort();
    const controller = new AbortController();
    this.directionsRequest = controller;
    const coordinates = `${point[0]},${point[1]};${destination[0]},${destination[1]}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}?alternatives=false&geometries=geojson&overview=full&steps=true&access_token=${encodeURIComponent(environment.mapboxAccessToken)}`;
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Directions request failed (${response.status}).`);
      const result = await response.json() as any;
      const route = result.routes?.[0];
      if (!route?.geometry?.coordinates?.length) throw new Error('No driving route was found to this customer site.');
      this.zone.run(() => this.drawRoute(route));
    } catch (error) {
      if ((error as Error).name !== 'AbortError') this.zone.run(() => { this.mapError = (error as Error).message; this.cdr.detectChanges(); });
    }
  }

  private drawRoute(route: any): void {
    if (!this.map || !this.mapbox) return;
    const data = { type:'Feature', properties:{}, geometry:route.geometry } as any;
    const source = this.map.getSource('navigation-route') as GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      this.map.addSource('navigation-route', { type:'geojson', data });
      this.map.addLayer({ id:'navigation-route-outline', type:'line', source:'navigation-route', layout:{ 'line-cap':'round', 'line-join':'round' }, paint:{ 'line-color':'#ffffff', 'line-width':8, 'line-opacity':.9 } });
      this.map.addLayer({ id:'navigation-route', type:'line', source:'navigation-route', layout:{ 'line-cap':'round', 'line-join':'round' }, paint:{ 'line-color':'#e31b23', 'line-width':5 } });
    }
    this.distanceMeters = Number(route.distance);
    this.durationSeconds = Number(route.duration);
    this.nextInstruction = route.legs?.[0]?.steps?.[0]?.maneuver?.instruction ?? '';
    this.routeCoordinates = route.geometry.coordinates;
    this.mapError = '';
    if (!this.fittedRoute) {
      const bounds = new this.mapbox.LngLatBounds();
      for (const coordinate of route.geometry.coordinates) bounds.extend(coordinate);
      this.map.fitBounds(bounds, { padding:{ top:55, right:55, bottom:125, left:55 }, maxZoom:15, duration:700 });
      this.fittedRoute = true;
    }
    this.cdr.detectChanges();
    this.updatePlannedRouteOverlay();
  }

  private updatePlannedRouteOverlay(): void {
    if (!this.map || !this.routeCoordinates.length) return;
    this.plannedRouteLine.nativeElement.setAttribute('points', this.routeCoordinates
      .map(coordinate => {
        const point = this.map!.project(coordinate);
        return `${point.x},${point.y}`;
      })
      .join(' '));
  }

  private addSiteMarker(destination: [number, number]): void {
    if (!this.map || !this.mapbox) return;
    this.siteMarker = new this.mapbox.Marker({ element: markerElement('site') })
      .setLngLat(destination).setPopup(new this.mapbox.Popup({ offset:24 }).setText(this.state.selectedJob()?.siteName || 'Customer site')).addTo(this.map);
  }

  private destination(): [number, number] | null {
    const job = this.state.selectedJob();
    return job?.longitude != null && job?.latitude != null ? [Number(job.longitude), Number(job.latitude)] : null;
  }
}

function markerElement(kind: 'truck' | 'site'): HTMLDivElement {
  const element = document.createElement('div');
  element.style.cssText = `z-index:5;display:grid;width:46px;height:46px;place-items:center;border:3px solid #fff;border-radius:50%;background:${kind === 'truck' ? '#e31b23' : '#16a34a'};color:#fff;box-shadow:0 4px 12px rgba(0,0,0,.38)`;
  element.innerHTML = kind === 'truck' ? fuelTruckSvg : customerSiteSvg;
  element.setAttribute('aria-label', kind === 'truck' ? 'Fuel truck current location' : 'Customer delivery site');
  element.setAttribute('role', 'img');
  return element;
}

const fuelTruckSvg = `<svg viewBox="0 0 32 32" width="29" height="29" aria-hidden="true"><path fill="currentColor" d="M3 8h15a2 2 0 0 1 2 2v11H9.5a4 4 0 0 0-7 0H2V9a1 1 0 0 1 1-1Zm18 5h4.2l4.8 5v3h-1.5a4 4 0 0 0-7 0H21v-8Zm2 2v3h4.1l-2.9-3H23Z"/><circle cx="6" cy="23" r="3" fill="currentColor"/><circle cx="25" cy="23" r="3" fill="currentColor"/><path d="M6 11h10v6H6z" fill="none" stroke="#e31b23" stroke-width="1.5"/><path d="M8 12.5h6M8 15h6" stroke="#e31b23" stroke-width="1.2"/></svg>`;
const customerSiteSvg = `<svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true"><path fill="currentColor" d="M16 3 3 13v16h10v-9h6v9h10V13L16 3Zm7 18h-4v-5h-6v5H9v-6.9l7-5.4 7 5.4V21Z"/><path fill="currentColor" d="M11 14h3v3h-3zm7 0h3v3h-3z"/></svg>`;

function distanceBetween(a: [number, number], b: [number, number]): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b[1] - a[1]);
  const dLon = radians(b[0] - a[0]);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a[1])) * Math.cos(radians(b[1])) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function rasterStreetStyle(token: string): any {
  return {
    version:8,
    sources:{ streets:{ type:'raster', tiles:[`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${encodeURIComponent(token)}`], tileSize:512, attribution:'© Mapbox © OpenStreetMap' } },
    layers:[{ id:'streets', type:'raster', source:'streets' }],
  };
}
