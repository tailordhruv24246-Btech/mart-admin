import toast from 'react-hot-toast'

const DIGIT_ONLY = /\D/g

export const normalizePhoneForWhatsApp = (value) => {
  const digits = String(value || '').replace(DIGIT_ONLY, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  return digits
}

export const buildWhatsAppUrl = (phone, message) => {
  const normalizedPhone = normalizePhoneForWhatsApp(phone)
  if (!normalizedPhone) return ''
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message || '')}`
}

export const openWhatsAppMessage = (phone, message) => {
  const url = buildWhatsAppUrl(phone, message)
  if (!url) {
    toast.error('Valid customer phone is required for WhatsApp.')
    return false
  }

  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
