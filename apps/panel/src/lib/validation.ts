export function onlyDigits(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key.length === 1 && !/[\d]/.test(e.key)) {
    e.preventDefault()
  }
}

export function onlyLetters(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key.length === 1 && !/[\p{L} ]/u.test(e.key)) {
    e.preventDefault()
  }
}

export function onlyPhoneChars(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key.length === 1 && !/[\d+\- ]/.test(e.key)) {
    e.preventDefault()
  }
}

export function onlyDecimal(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key.length === 1 && !/[\d.]/.test(e.key)) {
    e.preventDefault()
  }
}

export function onlyLettersAndDigits(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key.length === 1 && !/[\p{L}\d ]/u.test(e.key)) {
    e.preventDefault()
  }
}

type FieldErrors = Record<string, string>

export function showFirstError(errors: FieldErrors, toast: any) {
  const first = Object.values(errors)[0]
  if (first) toast.error(first)
}

export function cleanInput(value: string, type: 'digits' | 'letters' | 'phone' | 'decimal') {
  switch (type) {
    case 'digits': return value.replace(/\D/g, '')
    case 'letters': return value.replace(/[^\p{L} ]/gu, '')
    case 'phone': return value.replace(/[^\d+\- ]/g, '')
    case 'decimal': return value.replace(/[^\d.]/g, '')
  }
}
