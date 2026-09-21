// src/utils/idGenerator.js
const PREFIXES = {
  Laptop:         'LP',
  Tablet:         'TB',
  Router:         'RT',
  'Access Point': 'AP',
  Monitor:        'MN',
  Phone:          'PH',
  Printer:        'PR',
  Server:         'SV',
  Switch:         'SW',
  UPS:            'UP',
  Other:          'OT',
}

let counter = Math.floor(Math.random() * 8000 + 1000)

export function generateAssetId(category) {
  const prefix = PREFIXES[category] || 'AS'
  counter++
  return `${prefix}-${String(counter).padStart(4, '0')}`
}
