import { EVENT_STATUSES } from "../models/Event.js";

export type EventInput = {
  title?: unknown; description?: unknown; category?: unknown; department?: unknown; date?: unknown;
  startTime?: unknown; endTime?: unknown; venue?: unknown; coordinator?: unknown; maxParticipants?: unknown;
  registrationDeadline?: unknown; poster?: unknown; image?: unknown; rules?: unknown; status?: unknown;
  registrationEnabled?: unknown; allowStudentRegistrations?: unknown;
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const urlPattern = /^(https?:\/\/\S+|data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+|\/uploads\/[A-Za-z0-9._/-]+)$/i;

function parseDateOnly(value: unknown) {
  if (typeof value !== "string" || !datePattern.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.getUTCFullYear() === Number(value.slice(0, 4)) && date.getUTCMonth() + 1 === Number(value.slice(5, 7)) && date.getUTCDate() === Number(value.slice(8, 10)) ? date : null;
}

export function validateEventInput(input: EventInput) {
  const requiredFields = ["title", "description", "category", "department", "date", "startTime", "endTime", "venue", "coordinator", "maxParticipants", "registrationDeadline", "status"] as const;
  const errors: Record<string, string> = {};
  for (const field of requiredFields) if (input[field] === undefined || input[field] === null || input[field] === "") errors[field] = "This field is required";
  const eventDate = parseDateOnly(input.date);
  const deadline = parseDateOnly(input.registrationDeadline);
  if (input.date && !eventDate) errors.date = "Enter a valid event date";
  if (input.registrationDeadline && !deadline) errors.registrationDeadline = "Enter a valid registration deadline";
  if (eventDate && deadline && deadline > eventDate) errors.registrationDeadline = "Registration deadline must be on or before the event date";
  if (input.startTime && !timePattern.test(String(input.startTime))) errors.startTime = "Use HH:mm format";
  if (input.endTime && !timePattern.test(String(input.endTime))) errors.endTime = "Use HH:mm format";
  if (timePattern.test(String(input.startTime)) && timePattern.test(String(input.endTime)) && String(input.endTime) <= String(input.startTime)) errors.endTime = "End time must be after start time";
  const capacity = Number(input.maxParticipants);
  if (!Number.isInteger(capacity) || capacity < 1) errors.maxParticipants = "Maximum participants must be a positive whole number";
  if (input.status && !EVENT_STATUSES.includes(String(input.status) as typeof EVENT_STATUSES[number])) errors.status = "Choose a valid event status";
  if (input.poster && !urlPattern.test(String(input.poster))) errors.poster = "Poster must be a valid image URL or upload path";
  if (input.image && !urlPattern.test(String(input.image))) errors.image = "Image must be a valid image URL or upload path";
  if (input.registrationEnabled !== undefined && typeof input.registrationEnabled !== "boolean") errors.registrationEnabled = "Registration enabled must be true or false";
  if (input.allowStudentRegistrations !== undefined && typeof input.allowStudentRegistrations !== "boolean") errors.allowStudentRegistrations = "Allow student registrations must be true or false";
  return errors;
}