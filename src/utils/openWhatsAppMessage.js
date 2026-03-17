// WhatsApp bill sender utility
export default function openWhatsAppMessage(phone, message) {
  let url = 'https://wa.me/'
  if (phone) url += encodeURIComponent(phone)
  url += '?text=' + encodeURIComponent(message)
  window.open(url, '_blank')
  return true
}
