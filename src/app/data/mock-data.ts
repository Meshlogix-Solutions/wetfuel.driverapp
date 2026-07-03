export interface DriverJob {
  id: string;
  customer: string;
  site: string;
  time: string;
  gallons: number;
  fuel: string;
  distance: string;
  status: 'Next' | 'Assigned' | 'Completed';
}

export const JOBS: DriverJob[] = [
  { id: 'WF-2048', customer: 'Riverside Construction', site: '4180 Ridgeway Rd, Dallas', time: '9:15 AM', gallons: 250, fuel: 'Diesel', distance: '8.4 mi', status: 'Next' },
  { id: 'WF-2051', customer: 'Atlas Data Center', site: '1201 Commerce St, Dallas', time: '11:30 AM', gallons: 180, fuel: 'Dyed Diesel', distance: '14.2 mi', status: 'Assigned' },
  { id: 'WF-2055', customer: 'Northline Apartments', site: '7550 Preston Rd, Plano', time: '2:00 PM', gallons: 320, fuel: 'Diesel', distance: '21.7 mi', status: 'Assigned' },
  { id: 'WF-2029', customer: 'Metro Hospital', site: '900 Medical Pkwy, Dallas', time: 'Yesterday', gallons: 210, fuel: 'Diesel', distance: '—', status: 'Completed' }
];

export const INSPECTION_ITEMS = [
  ['Brakes and air pressure', 'Confirm pressure is in the safe operating range.'],
  ['Tires and wheel condition', 'Check tread, damage and visible wheel issues.'],
  ['Lights and reflectors', 'Headlights, brake lights and safety reflectors.'],
  ['Hoses, reels and nozzles', 'No leaks, cracks or damaged fittings.'],
  ['Emergency and spill kit', 'Kit is present, sealed and accessible.'],
  ['Meter and printer', 'Power on and confirm the device is ready.']
];
