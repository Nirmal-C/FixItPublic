import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE_MB } from './constants'

// Small validator functions — each returns an error string on failure, or null if OK.
// Keeping them separate means we can mix and match across different form fields.
export const validators = {
  required: (value, fieldName = 'This field') => {
    const v = typeof value === 'string' ? value.trim() : value
    if (!v && v !== 0) return `${fieldName} is required.`
    return null
  },

  minLength: (min) => (value, fieldName = 'This field') => {
    if (!value) return null
    if (value.trim().length < min)
      return `${fieldName} must be at least ${min} characters.`
    return null
  },

  maxLength: (max) => (value, fieldName = 'This field') => {
    if (!value) return null
    if (value.trim().length > max)
      return `${fieldName} must be ${max} characters or fewer.`
    return null
  },

  email: (value) => {
    if (!value) return null
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(value.trim())) return 'Please enter a valid email address.'
    return null
  },

  phone: (value) => {
    if (!value) return null
    const cleaned = value.replace(/\s+/g, '')
    const re = /^[+]?[\d\-().]{7,15}$/
    if (!re.test(cleaned)) return 'Please enter a valid phone number.'
    return null
  },

  imageFile: (file) => {
    if (!file) return null
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type))
      return 'Please upload a JPG, PNG, WebP, or GIF image.'
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024)
      return `Image must be smaller than ${MAX_FILE_SIZE_MB} MB.`
    return null
  },

  // Basic XSS check — catches script tags that someone might paste into a text field.
  // It's not a complete sanitiser but it stops the obvious stuff before it hits the backend.
  noScript: (value) => {
    if (!value) return null
    if (/<script[\s\S]*?>[\s\S]*?<\/script>/gi.test(value))
      return 'Input contains disallowed content.'
    return null
  },
}

/**
 * Validates the entire report submission form.
 *
 * Goes through each field, runs the relevant validators, and returns a flat
 * errors object. Only fields that actually failed will appear as keys.
 * Callers can do Object.keys(errors).length === 0 to check if everything passed.
 */
export function validateReportForm(values) {
  const errors = {}

  // Title — required, 5–200 chars, no script tags
  const titleErr =
    validators.required(values.title, 'Title') ||
    validators.minLength(5)(values.title, 'Title') ||
    validators.maxLength(200)(values.title, 'Title') ||
    validators.noScript(values.title)
  if (titleErr) errors.title = titleErr

  const categoryErr = validators.required(values.category, 'Category')
  if (categoryErr) errors.category = categoryErr

  const descErr =
    validators.required(values.description, 'Description') ||
    validators.minLength(20)(values.description, 'Description') ||
    validators.maxLength(2000)(values.description, 'Description') ||
    validators.noScript(values.description)
  if (descErr) errors.description = descErr

  const locationErr =
    validators.required(values.location_description, 'Location') ||
    validators.minLength(5)(values.location_description, 'Location') ||
    validators.maxLength(300)(values.location_description, 'Location')
  if (locationErr) errors.location_description = locationErr

  if (values.reporter_email) {
    const emailErr = validators.email(values.reporter_email)
    if (emailErr) errors.reporter_email = emailErr
  }

  if (values.reporter_name) {
    const nameErr =
      validators.maxLength(100)(values.reporter_name, 'Name') ||
      validators.noScript(values.reporter_name)
    if (nameErr) errors.reporter_name = nameErr
  }

  if (values.photo) {
    const photoErr = validators.imageFile(values.photo)
    if (photoErr) errors.photo = photoErr
  }

  return errors
}

export const isFormValid = (errors) => Object.keys(errors).length === 0
