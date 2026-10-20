import { ApiError } from "@/lib/api/client"

/* Helpers shared by the school and publisher settings pages. */

/** 254711222333 → "0711 222 333"; emails pass through. */
export const showContact = (c: string) => c.replace(/^254(\d{3})(\d{3})(\d{3})$/, "0$1 $2 $3")

export const errorText = (e: unknown, field?: string) =>
  e instanceof ApiError ? ((field && e.fieldErrors[field]?.[0]) || e.message) : "Something went wrong. Try again."

export const counties = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado",
  "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu",
  "Machakos", "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi",
  "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi",
  "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
]
