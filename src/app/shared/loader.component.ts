import { Component, Input } from '@angular/core';

export type LoaderMode = 'fullscreen' | 'section' | 'inline' | 'button';

const FLAME_PATH =
  'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z';

let flameFillSequence = 0;

@Component({
  selector: 'wf-loader',
  standalone: true,
  template: `
    <div
      class="wetfuel-loader"
      [class.fullscreen]="mode === 'fullscreen'"
      [class.section]="mode === 'section'"
      [class.inline]="mode === 'inline'"
      [class.button]="mode === 'button'"
      role="status"
      aria-live="polite"
      aria-busy="true"
      [attr.aria-label]="message || 'Loading'">
      <div class="loader-visual" aria-hidden="true">
        <svg class="loader-ring" viewBox="0 0 48 48" focusable="false">
          <circle class="ring-track" cx="24" cy="24" r="20" />
          <circle class="ring-progress" cx="24" cy="24" r="20" />
        </svg>
        <svg class="loader-flame" viewBox="0 0 24 24" focusable="false">
          <defs>
            <linearGradient [attr.id]="fillGradientId" x1="12" y1="22" x2="12" y2="3" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="var(--wf-primary-shade)" />
              <stop offset="100%" stop-color="var(--wf-primary)" />
            </linearGradient>
          </defs>
          <path class="flame-track" [attr.d]="flamePath" fill="currentColor" />
          <g class="flame-fill">
            <path [attr.d]="flamePath" [attr.fill]="'url(#' + fillGradientId + ')'" />
          </g>
        </svg>
      </div>
      @if (message && mode !== 'button') {
        <p class="loader-message">{{ message }}</p>
      }
    </div>
  `,
  styles: [`
    .wetfuel-loader { display:inline-flex; flex-direction:column; align-items:center; justify-content:center; gap:1rem; }
    .loader-visual { position:relative; width:3.5rem; height:3.5rem; flex-shrink:0; display:grid; place-items:center; }
    .loader-ring, .loader-flame { grid-area:1 / 1; }
    .loader-ring { width:100%; height:100%; transform:rotate(-90deg); }
    .ring-track, .ring-progress { fill:none; stroke-width:1.75; stroke-linecap:round; }
    .ring-track { stroke:var(--wf-border); opacity:.9; }
    .ring-progress { stroke:var(--wf-primary); stroke-dasharray:126; stroke-dashoffset:126; animation:loader-ring 3.6s cubic-bezier(.4,0,.2,1) infinite; }
    .loader-flame { width:52%; height:52%; overflow:visible; color:var(--wf-primary-soft); }
    .flame-track { opacity:1; }
    .flame-fill { clip-path:inset(100% 0 0 0); animation:loader-flame-fill 3.6s cubic-bezier(.4,0,.2,1) infinite; }
    .loader-message { margin:0; max-width:18rem; text-align:center; font-size:.8125rem; font-weight:600; letter-spacing:.02em; color:var(--wf-muted); }
    .fullscreen { position:fixed; inset:0; z-index:9999; background:color-mix(in srgb,var(--wf-background) 88%,transparent); backdrop-filter:blur(8px); }
    .section { display:flex; width:100%; padding:3.25rem 1rem; }
    .inline { flex-direction:row; gap:.75rem; }
    .inline .loader-visual { width:1.5rem; height:1.5rem; }
    .button { flex-direction:row; gap:0; margin-right:.5rem; }
    .button .loader-visual { width:1.05rem; height:1.05rem; }
    .button .loader-ring { display:none; }
    .button .loader-flame { width:100%; height:100%; }
    @keyframes loader-flame-fill {
      0% { clip-path:inset(100% 0 0 0); opacity:1; }
      62%, 78% { clip-path:inset(0); opacity:1; }
      92% { clip-path:inset(0); opacity:0; }
      100% { clip-path:inset(100% 0 0 0); opacity:0; }
    }
    @keyframes loader-ring {
      0% { stroke-dashoffset:126; opacity:.55; }
      62%, 78% { stroke-dashoffset:0; opacity:1; }
      92% { stroke-dashoffset:0; opacity:0; }
      100% { stroke-dashoffset:126; opacity:0; }
    }
    @media (prefers-reduced-motion:reduce) {
      .flame-fill, .ring-progress { animation:none; }
      .flame-fill { clip-path:inset(0); opacity:1; }
      .ring-progress { stroke-dashoffset:31.5; opacity:1; }
    }
  `],
})
export class LoaderComponent {
  @Input() mode: LoaderMode = 'section';
  @Input() message = '';

  readonly flamePath = FLAME_PATH;
  readonly fillGradientId = `wf-driver-flame-fill-${++flameFillSequence}`;
}
