export const SITE = {
  name: 'ASCEND',
  shortName: 'ASCEND',
  tagline: 'Tu negocio en línea esta semana',
  description:
    'Diseño y desarrollo de páginas web premium para negocios que quieren más clientes. Entrega rápida, WhatsApp integrado y diseño a medida — sin plantillas.',
  whatsapp: '573104885609',
  email: 'fmleom19@gmail.com',
  instagram: 'felieleonmm',
  location: 'Colombia',
  priceAnchor: 'desde $500.000 COP',
  analyticsId: 'G-ZRS6ZM8X0D',
  nav: [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Sobre mí', href: '#sobre-mi' },
    { label: 'Servicios', href: '#servicios' },
    { label: 'Portafolio', href: '#portafolio' },
    { label: 'Precios', href: '#precios' },
    { label: 'FAQ', href: '#faq' },
  ],
} as const;

export function whatsappLink(message: string, phone: string = SITE.whatsapp) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
