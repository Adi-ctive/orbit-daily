// Fermi estimation bank. Values are standard reference figures, rounded.
// `lo`/`hi` are the slider's powers of ten.
export interface FermiItem {
  id?: string
  q: string
  a: number
  unit: string
  lo: number
  hi: number
  why: string
}

export const FERMI: FermiItem[] = [
  { q: 'Distance from Earth to the Moon', a: 384_400, unit: 'km', lo: 2, hi: 9, why: 'About 30 Earth diameters (Earth is ~12,700 km across).' },
  { q: 'Distance from Earth to the Sun', a: 1.496e8, unit: 'km', lo: 4, hi: 11, why: 'Light takes about 8.3 minutes: 300,000 km/s × 499 s.' },
  { q: "Earth's circumference at the equator", a: 40_075, unit: 'km', lo: 2, hi: 8, why: 'π × 12,756 km diameter. The metre was once defined from this distance.' },
  { q: 'Height of Mount Everest', a: 8849, unit: 'm', lo: 1, hi: 6, why: 'About the cruising height of a jet airliner.' },
  { q: 'Speed of light', a: 299_792, unit: 'km/s', lo: 2, hi: 9, why: 'Light circles Earth about 7.5 times in one second.' },
  { q: 'Bones in an adult human skeleton', a: 206, unit: 'bones', lo: 0, hi: 5, why: 'Babies start with around 300; many fuse as they grow.' },
  { q: 'Diameter of the Sun', a: 1.39e6, unit: 'km', lo: 3, hi: 9, why: 'About 109 Earths side by side.' },
  { q: 'Age of the universe', a: 1.38e10, unit: 'years', lo: 6, hi: 13, why: 'From the cosmic microwave background and expansion rate: about 13.8 billion years.' },
  { q: 'Age of Earth', a: 4.54e9, unit: 'years', lo: 5, hi: 12, why: 'Dated from meteorites and the oldest minerals: about 4.5 billion years.' },
  { q: 'Seconds in one year', a: 3.156e7, unit: 's', lo: 4, hi: 10, why: '365.25 × 24 × 3600 ≈ 31.6 million. A handy rule: π × 10⁷.' },
  { q: 'People on Earth (2024)', a: 8.1e9, unit: 'people', lo: 6, hi: 12, why: 'The world passed 8 billion in late 2022.' },
  { q: 'Depth of the Challenger Deep, the deepest known ocean point', a: 10_900, unit: 'm', lo: 1, hi: 6, why: 'Deeper than Everest is tall, by about 2 km.' },
  { q: 'Speed of sound in air at 20 °C', a: 343, unit: 'm/s', lo: 0, hi: 5, why: 'About 1 km every 3 seconds, which is why you can count the gap after lightning.' },
  { q: 'Mass of Earth', a: 5.97e24, unit: 'kg', lo: 18, hi: 28, why: 'Volume ~1.08 × 10²¹ m³ times average density ~5,500 kg/m³.' },
  { q: 'Stars in the Milky Way (rough estimate)', a: 2e11, unit: 'stars', lo: 7, hi: 14, why: 'Estimates run from 100 to 400 billion; 200 billion is a common middle figure.' },
  { q: 'Cells in an adult human body (estimate)', a: 3.7e13, unit: 'cells', lo: 8, hi: 17, why: 'A 2013 estimate put it near 37 trillion, most of them red blood cells.' },
  { q: 'Distance light travels in one year', a: 9.46e12, unit: 'km', lo: 7, hi: 15, why: '300,000 km/s × 31.6 million s.' },
  { q: 'Length of the Nile', a: 6650, unit: 'km', lo: 1, hi: 6, why: 'Often listed as the longest river, about 6,650 km.' },
  { q: 'Area of India', a: 3.287e6, unit: 'km²', lo: 3, hi: 9, why: 'About 3.29 million km², the seventh-largest country by area.' },
  { q: 'UN member states', a: 193, unit: 'countries', lo: 0, hi: 4, why: 'South Sudan, in 2011, was the most recent to join.' },
  { q: "Earth's total surface area", a: 5.1e8, unit: 'km²', lo: 5, hi: 11, why: '4πr² with r ≈ 6,371 km. About 71% of it is ocean.' },
  { q: 'Diameter of Jupiter', a: 139_820, unit: 'km', lo: 2, hi: 8, why: 'About 11 Earths across.' },
  { q: 'Height of the Burj Khalifa', a: 828, unit: 'm', lo: 0, hi: 5, why: 'The tallest building completed by the mid-2020s.' },
  { q: 'Keys on a standard piano', a: 88, unit: 'keys', lo: 0, hi: 4, why: '52 white and 36 black keys, just over 7 octaves.' },
  { q: 'Human heartbeats in one day (resting about 70 per minute)', a: 100_800, unit: 'beats', lo: 2, hi: 8, why: '70 × 60 × 24 ≈ 100,000.' },
  { q: 'Hairs on a typical human scalp', a: 100_000, unit: 'hairs', lo: 2, hi: 8, why: 'Usually quoted at 90,000 to 150,000, depending on hair colour.' },
  { q: "Temperature of the Sun's visible surface", a: 5772, unit: 'K', lo: 1, hi: 8, why: 'About 5,500 °C. The core is near 15 million K.' },
  { q: "Temperature at the Sun's core", a: 1.5e7, unit: 'K', lo: 3, hi: 10, why: 'Hot and dense enough to fuse hydrogen into helium.' },
  { q: 'Wavelength of green light', a: 530, unit: 'nm', lo: 0, hi: 5, why: 'Visible light spans roughly 380 to 750 nm.' },
  { q: "Avogadro's number (particles in one mole)", a: 6.022e23, unit: 'per mol', lo: 15, hi: 27, why: '12 g of carbon-12 holds this many atoms.' },
  { q: "Earth's orbital speed around the Sun", a: 29.8, unit: 'km/s', lo: -1, hi: 4, why: '2π × 150 million km ÷ 31.6 million s ≈ 30 km/s.' },
  { q: 'Altitude of the International Space Station', a: 410, unit: 'km', lo: 0, hi: 5, why: 'Roughly the distance from Delhi to Jaipur, straight up.' },
  { q: 'Orbits of Earth the ISS makes per day', a: 15.5, unit: 'orbits', lo: -1, hi: 4, why: 'One lap takes about 93 minutes: 1,440 ÷ 93 ≈ 15.5.' },
  { q: 'Neurons in a human brain', a: 8.6e10, unit: 'neurons', lo: 6, hi: 14, why: 'A 2009 count gave about 86 billion.' },
  { q: 'Rotation period of Venus', a: 243, unit: 'Earth days', lo: -1, hi: 4, why: 'Venus spins so slowly that its day is longer than its year (225 days).' },
  { q: 'Distance to Proxima Centauri, the nearest star after the Sun', a: 4.24, unit: 'light-years', lo: -2, hi: 4, why: 'About 40 trillion km.' },
  { q: 'Distance to the Andromeda Galaxy', a: 2.5e6, unit: 'light-years', lo: 2, hi: 9, why: 'The most distant object most people can see with the naked eye.' },
  { q: 'Thickness of a human hair', a: 70, unit: 'µm', lo: -1, hi: 4, why: 'Typically 20 to 180 micrometres.' },
  { q: 'How many times heavier a proton is than an electron', a: 1836, unit: '×', lo: 0, hi: 6, why: 'Nearly all of an atom’s mass sits in its nucleus.' },
  { q: "Volume of water in Earth's oceans", a: 1.335e9, unit: 'km³', lo: 5, hi: 12, why: 'Average depth ~3.7 km × ocean area ~361 million km².' },
  { q: "Share of Earth's air that is nitrogen", a: 78, unit: '%', lo: -1, hi: 3, why: 'Oxygen is about 21%, argon nearly 1%.' },
  { q: 'Length of a typical E. coli bacterium', a: 2, unit: 'µm', lo: -2, hi: 3, why: 'About 1,000 of them end to end span 2 mm.' },
  { q: 'Seconds in an 80-year life', a: 2.52e9, unit: 's', lo: 6, hi: 12, why: '80 × 31.6 million ≈ 2.5 billion.' },
  { q: 'Acceleration due to gravity at Earth’s surface', a: 9.81, unit: 'm/s²', lo: -2, hi: 3, why: 'A falling object gains about 10 m/s of speed every second.' },
  { q: 'Escape velocity from Earth’s surface', a: 11.2, unit: 'km/s', lo: -1, hi: 4, why: 'About 40,000 km/h, ignoring air resistance.' },
  { q: 'Chromosomes in a typical human body cell', a: 46, unit: 'chromosomes', lo: 0, hi: 3, why: '23 pairs: one set from each parent.' },
  { q: 'Density of air at sea level', a: 1.2, unit: 'kg/m³', lo: -3, hi: 3, why: 'A room 5 × 4 × 3 m holds about 70 kg of air.' },
  { q: 'Average air pressure at sea level', a: 1013, unit: 'hPa', lo: 0, hi: 6, why: 'That is about 10 tonnes pressing on each square metre.' },
  { q: 'Cruising speed of a passenger jet', a: 900, unit: 'km/h', lo: 0, hi: 5, why: 'About 250 m/s, just under the speed of sound at altitude.' },
  { q: 'Height of the Kármán line, a common edge of space', a: 100, unit: 'km', lo: -1, hi: 4, why: 'Above this, wings cannot make enough lift to fly.' },
  { q: 'Thickness of continental crust', a: 35, unit: 'km', lo: -1, hi: 4, why: 'Usually 30 to 50 km; ocean crust is only 5 to 10 km.' },
  { q: 'Elements in the periodic table', a: 118, unit: 'elements', lo: 0, hi: 4, why: 'Oganesson (118) completed row 7 in 2016.' },
  { q: 'Melting point of iron', a: 1538, unit: '°C', lo: 0, hi: 5, why: 'Hot enough that early smiths needed charcoal and bellows.' },
  { q: "Speed of Earth's surface at the equator, from its spin", a: 1670, unit: 'km/h', lo: 0, hi: 6, why: '40,075 km ÷ 24 h.' },
  { q: 'Time for sunlight to reach Earth', a: 499, unit: 's', lo: 0, hi: 5, why: '150 million km ÷ 300,000 km/s ≈ 500 s, a little over 8 minutes.' },
  { q: 'Power output of the Sun', a: 3.8e26, unit: 'W', lo: 18, hi: 30, why: 'Earth intercepts less than a billionth of it.' },
  { q: 'Length of DNA in one human cell, stretched out', a: 2, unit: 'm', lo: -3, hi: 3, why: 'About 6 billion base pairs, each 0.34 nm apart.' },
  { q: "Tilt of Earth's axis", a: 23.4, unit: '°', lo: -1, hi: 3, why: 'The tilt, not the distance to the Sun, causes the seasons.' },
  { q: "Pluto's orbital period", a: 248, unit: 'years', lo: 0, hi: 4, why: 'It has not finished one orbit since it was found in 1930.' },
  { q: 'Temperature of a lightning channel', a: 30_000, unit: 'K', lo: 2, hi: 8, why: 'About five times hotter than the Sun’s surface.' },
  { q: 'Diameter of a hydrogen atom', a: 1.06e-10, unit: 'm', lo: -14, hi: -5, why: 'About 0.1 nm, or one ångström.' },
  { q: 'Wavelength of a typical FM radio signal (100 MHz)', a: 3, unit: 'm', lo: -3, hi: 4, why: 'Wavelength = speed of light ÷ frequency = 3 × 10⁸ ÷ 10⁸.' },
  { q: 'Average annual rainfall at Mawsynram, Meghalaya', a: 11_870, unit: 'mm', lo: 1, hi: 6, why: 'Among the wettest places on Earth: about 12 m of rain a year.' },
  { q: 'Mass of an adult blue whale', a: 1.5e5, unit: 'kg', lo: 2, hi: 8, why: 'Up to about 150 tonnes, the heaviest animal known to have lived.' },
  { q: 'Distance a person walks in a lifetime (about 7,500 steps a day)', a: 1.6e5, unit: 'km', lo: 2, hi: 8, why: '7,500 steps × 0.75 m × 365 × 78 years ≈ 160,000 km, four times round Earth.' },
]

/** Generated unit-conversion estimates, so the bank never runs dry. */
export function templated(n: number, kind: number): FermiItem {
  switch (kind % 4) {
    case 0:
      return { q: `Seconds in ${n} days`, a: n * 86_400, unit: 's', lo: 3, hi: 9, why: `${n} × 24 × 60 × 60 = ${(n * 86_400).toLocaleString('en-US')}.` }
    case 1:
      return { q: `Distance light travels in ${n} seconds`, a: n * 299_792, unit: 'km', lo: 3, hi: 10, why: `${n} × 299,792 km.` }
    case 2:
      return { q: `Minutes in ${n} years`, a: n * 525_960, unit: 'min', lo: 3, hi: 10, why: `${n} × 365.25 × 1,440.` }
    default:
      return { q: `Hours for a car at 100 km/h to drive ${n} times round Earth`, a: (n * 40_075) / 100, unit: 'h', lo: 1, hi: 7, why: `${n} × 40,075 km ÷ 100 km/h.` }
  }
}
