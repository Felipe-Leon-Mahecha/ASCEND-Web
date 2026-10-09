export const SITE = {
  name: 'Francy Molano Nails Studio',
  whatsapp: '573106920842',
} as const;

export function whatsappLink(message: string, phone: string = SITE.whatsapp): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
