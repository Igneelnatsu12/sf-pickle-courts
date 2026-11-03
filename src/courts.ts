import eastsideLogo from './assets/eastside-pickle.png'
import highwayLogo from './assets/highway-drive.png'
import lakbaiLogo from './assets/lakbai.png'

export type Court = {
  id: string
  name: string
  location: string
  description: string
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
    description: "Visit Eastside Pickle's website for venue information and booking details.",
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
    description: "Explore the courts and make your reservation through Highway Drive's booking page.",
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
    description: "Head to Lakbai Pickleball's booking website to get your game arranged.",
    url: 'https://lakbaipickleballbooking.netlify.app/',
    locationUrl: 'https://www.google.com/maps/search/?api=1&query=Lakbai+Pickleball+San+Francisco+Agusan+del+Sur',
    logo: lakbaiLogo,
    tag: 'Online booking',
    initials: 'LP',
    accent: 'cream',
  },
]
