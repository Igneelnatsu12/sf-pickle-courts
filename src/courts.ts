import eastsideLogo from './assets/eastside-pickle.png'
import highwayLogo from './assets/highway-drive.png'
import lakbaiLogo from './assets/lakbai.png'

export type Court = {
  id: string
  name: string
  location: string
  courtCount: number
  url?: string
  facebookUrl?: string
  locationUrl?: string
  logo: string
  tag: string
  initials: string
  accent: 'lime' | 'orange' | 'cream'
}

export const STARTER_COURTS: Court[] = [
  {
    id: 'eastside-pickle',
    name: 'Eastside Pickle',
    location: 'San Francisco area',
    courtCount: 1,
    url: 'https://eastsidepickle.com/',
    locationUrl: 'https://www.google.com/maps/search/?api=1&query=Eastside+Pickle+San+Francisco+Agusan+del+Sur',
    logo: eastsideLogo,
    tag: 'Official website',
    initials: 'EP',
    accent: 'lime',
  },
  {
    id: 'highway-drive',
    name: 'Highway Drive Pickleball',
    location: 'San Francisco area',
    courtCount: 1,
    url: 'https://hwaydrive-pickleball.courtbooking.workers.dev/',
    locationUrl: 'https://www.google.com/maps/search/?api=1&query=Highway+Drive+Pickleball+San+Francisco+Agusan+del+Sur',
    logo: highwayLogo,
    tag: 'Online booking',
    initials: 'HD',
    accent: 'orange',
  },
  {
    id: 'lakbai-pickleball',
    name: 'Lakbai Pickleball',
    location: 'San Francisco area',
    courtCount: 1,
    url: 'https://lakbaipickleballbooking.netlify.app/',
    locationUrl: 'https://www.google.com/maps/search/?api=1&query=Lakbai+Pickleball+San+Francisco+Agusan+del+Sur',
    logo: lakbaiLogo,
    tag: 'Online booking',
    initials: 'LP',
    accent: 'cream',
  },
]
