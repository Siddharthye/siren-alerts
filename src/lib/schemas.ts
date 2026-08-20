import { z } from 'zod'

const severitySchema = z.enum(['P0', 'P1', 'P2', 'P3'])
const channelSchema = z.enum(['inapp', 'push', 'sms', 'email', 'webhook'])

const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

const geofenceSchema = coordinatesSchema.extend({
  radiusM: z.number().positive().max(50_000),
})

const escalationStepSchema = z.object({
  afterSec: z.number().positive(),
  toChannels: z.array(channelSchema).min(1),
  note: z.string().max(200).optional(),
})

export const createAlertSchema = z.object({
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(1000),
  severity: severitySchema.default('P2'),
  /** Omit or pass null for a campus-wide broadcast. */
  geofence: geofenceSchema.nullable().default(null),
  channels: z.array(channelSchema).min(1).default(['inapp']),
  escalation: z.array(escalationStepSchema).max(5).default([]),
  ttlSec: z.number().positive().max(86_400).optional(),
})

export const upsertSubscriberSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().max(120).optional(),
  location: coordinatesSchema,
  channels: z.array(channelSchema).min(1).optional(),
})

export const acknowledgeSchema = z.object({
  alertId: z.string().min(1),
  subscriberId: z.string().min(1),
})
