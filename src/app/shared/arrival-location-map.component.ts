import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import type { Map as MapboxMap, Marker } from 'mapbox-gl/esm';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-arrival-location-map',
  standalone: true,
  template: `<div #map class="map"></div>@if(error){<div class="map-error">{{error}}</div>}`,
  styles: [`
    :host{position:absolute;inset:0;display:block}.map{width:100%;height:100%}
    .map-error{position:absolute;z-index:3;left:14px;right:70px;top:14px;padding:10px 12px;border-radius:12px;background:rgba(255,241,242,.96);color:#9f1239;font-size:12px;box-shadow:0 3px 14px rgba(0,0,0,.18)}
  `],
})
export class ArrivalLocationMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('map', { static:true }) private readonly mapElement!: ElementRef<HTMLDivElement>;
  @Input() driverLatitude?: number;
  @Input() driverLongitude?: number;
  @Input() siteLatitude?: number;
  @Input() siteLongitude?: number;

  error = '';
  private map?: MapboxMap;
  private mapbox?: typeof import('mapbox-gl/esm');
  private driverMarker?: Marker;
  private siteMarker?: Marker;
  private resizeObserver?: ResizeObserver;
  private ready = false;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  async ngAfterViewInit(): Promise<void> {
    if (!environment.mapboxAccessToken) { this.error='Mapbox access token is not configured.'; return; }
    const mapboxgl = await import('mapbox-gl/esm');
    this.mapbox = mapboxgl;
    const site = this.sitePoint();
    this.map = new mapboxgl.Map({
      accessToken:environment.mapboxAccessToken,
      container:this.mapElement.nativeElement,
      style:rasterStreetStyle(environment.mapboxAccessToken),
      projection:'mercator',
      center:site ?? [-98.5795,39.8283],
      zoom:site ? 15 : 3,
    });
    this.resizeObserver = new ResizeObserver(() => this.map?.resize());
    this.resizeObserver.observe(this.mapElement.nativeElement);
    this.map.addControl(new mapboxgl.NavigationControl({ showCompass:false }), 'top-right');
    this.map.on('load', () => { this.ready=true; this.render(); });
    this.map.on('error', event => {
      const message=event.error?.message||'Mapbox could not load the arrival map.';
      if(!/abort|cancel/i.test(message)){this.error=message;this.cdr.detectChanges();}
    });
  }

  ngOnChanges(changes:SimpleChanges):void { if(this.ready&&Object.keys(changes).length)this.render(); }
  ngOnDestroy():void { this.resizeObserver?.disconnect();this.map?.remove(); }

  private render():void {
    if(!this.map||!this.mapbox)return;
    const driver=this.driverPoint();
    const site=this.sitePoint();
    if(site){
      if(!this.siteMarker)this.siteMarker=new this.mapbox.Marker({element:markerElement('site')}).setLngLat(site).setPopup(new this.mapbox.Popup({offset:24}).setText('Customer delivery site')).addTo(this.map);
      else this.siteMarker.setLngLat(site);
    }
    if(driver){
      if(!this.driverMarker)this.driverMarker=new this.mapbox.Marker({element:markerElement('truck')}).setLngLat(driver).setPopup(new this.mapbox.Popup({offset:24}).setText('Your captured arrival location')).addTo(this.map);
      else this.driverMarker.setLngLat(driver);
    }
    if(driver&&site)this.map.fitBounds(new this.mapbox.LngLatBounds(driver,site),{padding:65,maxZoom:17,duration:500});
    else if(site)this.map.easeTo({center:site,zoom:16,duration:400});
  }

  private driverPoint():[number,number]|null{return this.driverLongitude!=null&&this.driverLatitude!=null?[Number(this.driverLongitude),Number(this.driverLatitude)]:null;}
  private sitePoint():[number,number]|null{return this.siteLongitude!=null&&this.siteLatitude!=null?[Number(this.siteLongitude),Number(this.siteLatitude)]:null;}
}

function markerElement(kind:'truck'|'site'):HTMLDivElement{
  const element=document.createElement('div');
  element.style.cssText=`z-index:5;display:grid;width:46px;height:46px;place-items:center;border:3px solid #fff;border-radius:50%;background:${kind==='truck'?'#e31b23':'#16a34a'};color:#fff;box-shadow:0 4px 12px rgba(0,0,0,.38)`;
  element.innerHTML=kind==='truck'?fuelTruckSvg:customerSiteSvg;
  element.setAttribute('aria-label',kind==='truck'?'Your captured arrival location':'Customer delivery site');
  element.setAttribute('role','img');
  return element;
}

const fuelTruckSvg=`<svg viewBox="0 0 32 32" width="29" height="29" aria-hidden="true"><path fill="currentColor" d="M3 8h15a2 2 0 0 1 2 2v11H9.5a4 4 0 0 0-7 0H2V9a1 1 0 0 1 1-1Zm18 5h4.2l4.8 5v3h-1.5a4 4 0 0 0-7 0H21v-8Zm2 2v3h4.1l-2.9-3H23Z"/><circle cx="6" cy="23" r="3"/><circle cx="25" cy="23" r="3"/></svg>`;
const customerSiteSvg=`<svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true"><path fill="currentColor" d="M16 3 3 13v16h10v-9h6v9h10V13L16 3Zm7 18h-4v-5h-6v5H9v-6.9l7-5.4 7 5.4V21Z"/><path fill="currentColor" d="M11 14h3v3h-3zm7 0h3v3h-3z"/></svg>`;

function rasterStreetStyle(token:string):any{return{version:8,sources:{streets:{type:'raster',tiles:[`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${encodeURIComponent(token)}`],tileSize:512,attribution:'© Mapbox © OpenStreetMap'}},layers:[{id:'streets',type:'raster',source:'streets'}]};}
