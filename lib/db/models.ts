import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { DEFAULT_OPENING_HOURS } from "../site";
import { tenantScoped } from "./tenant-scope";

export const TENANT_STATUSES = ["pending", "active", "suspended"] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

/**
 * One studio on the platform, served at /<slug>. Everything else belongs to a
 * tenant through `tenantId`, and `tenantScoped` refuses queries that omit it.
 */
const tenantSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    tagline: { type: String, trim: true, maxlength: 80, default: "Studio de unhas" },
    description: { type: String, trim: true, maxlength: 300 },
    // International format, digits only (e.g. 351922269283).
    whatsappNumber: { type: String, required: true },
    instagramUrl: { type: String, trim: true },
    address: { type: String, trim: true, maxlength: 200 },
    // The studio's look. All optional: without them the site uses the template's.
    primaryColor: { type: String },
    secondaryColor: { type: String },
    logo: { fileId: Schema.Types.ObjectId, iconFileId: Schema.Types.ObjectId, width: Number, height: Number },
    banner: { fileId: Schema.Types.ObjectId, width: Number, height: Number, blurDataUrl: String },
    // "pending" until the owner confirms their email: set up, but not public yet.
    status: { type: String, required: true, enum: TENANT_STATUSES, default: "active" },
    // Who suspended it: only "billing" is lifted automatically when payment returns.
    suspendedFor: { type: String, enum: ["billing", "manual"] },
    emailConfirmedAt: { type: Date },
    // Set by Stripe's webhook; studios billed outside Stripe have none of these.
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    subscriptionStatus: { type: String },
    subscriptionMonthlyCents: { type: Number },
    hours: {
      days: { type: [Number], default: () => [...DEFAULT_OPENING_HOURS.days] },
      opens: { type: String, default: DEFAULT_OPENING_HOURS.opens },
      lastStart: { type: String, default: DEFAULT_OPENING_HOURS.lastStart },
      slotMinutes: { type: Number, default: DEFAULT_OPENING_HOURS.slotMinutes },
      maxDaysAhead: { type: Number, default: DEFAULT_OPENING_HOURS.maxDaysAhead },
    },
  },
  { timestamps: true },
);

const tenantRef = { type: Schema.Types.ObjectId, ref: "Tenant", required: true } as const;

const serviceSchema = new Schema(
  {
    tenantId: tenantRef,
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300 },
    priceCents: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, min: 5, max: 480 },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);
serviceSchema.index({ tenantId: 1, order: 1 });
serviceSchema.plugin(tenantScoped);

const portfolioItemSchema = new Schema(
  {
    tenantId: tenantRef,
    fileId: { type: Schema.Types.ObjectId, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    blurDataUrl: { type: String, required: true },
    caption: { type: String, trim: true, maxlength: 120 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);
portfolioItemSchema.index({ tenantId: 1, order: -1, createdAt: -1 });
portfolioItemSchema.plugin(tenantScoped);

/**
 * A studio owner, or with role "platform" someone who runs the platform: those use
 * the /backoffice, belong to no studio and can never open a studio's panel.
 * Email is unique across both.
 */
const userSchema = new Schema(
  {
    role: { type: String, required: true, enum: ["owner", "platform"], default: "owner" },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required(this: { role?: string }) {
        return this.role !== "platform";
      },
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

/**
 * Anonymous site analytics. No names, IPs or cookies: `visitorId` is a keyed hash
 * of IP + browser that changes every day, so a visitor can't be followed across
 * days. Events expire after ~13 months.
 */
const analyticsEventSchema = new Schema(
  {
    tenantId: tenantRef,
    type: { type: String, required: true, enum: ["pageview", "booking", "whatsapp_click", "instagram_click"] },
    visitorId: { type: String, required: true },
    // Booking request details (type "booking" only).
    serviceIds: { type: [String], default: undefined },
    serviceNames: { type: [String], default: undefined },
    requestedDate: { type: String }, // YYYY-MM-DD
    requestedWeekday: { type: Number, min: 0, max: 6 }, // 0 = Sunday
    requestedHour: { type: Number, min: 0, max: 23 },
    totalCents: { type: Number, min: 0 },
    // Where a WhatsApp/Instagram link was clicked (*_click types only).
    source: { type: String, maxlength: 40 },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 400 });
analyticsEventSchema.index({ tenantId: 1, type: 1, createdAt: 1 });
analyticsEventSchema.plugin(tenantScoped);

export const APPOINTMENT_STATUSES = ["pending", "confirmed", "declined", "cancelled"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/**
 * A booking request sent from the site. Only "confirmed" appointments block the
 * schedule; their [startMinutes, endMinutes) range is taken for that date.
 * Service names and prices are copied so the record survives service edits.
 */
const appointmentSchema = new Schema(
  {
    tenantId: tenantRef,
    name: { type: String, required: true, trim: true, maxlength: 60 },
    // WhatsApp, digits with country code (see lib/phone.ts). Older requests have none.
    phone: { type: String },
    serviceIds: { type: [String], required: true },
    serviceNames: { type: [String], required: true },
    totalCents: { type: Number, required: true, min: 0 },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:mm
    startMinutes: { type: Number, required: true, min: 0 },
    endMinutes: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true, maxlength: 300 },
    status: { type: String, required: true, enum: APPOINTMENT_STATUSES, default: "pending" },
    decidedAt: { type: Date },
  },
  { timestamps: true },
);
appointmentSchema.index({ tenantId: 1, date: 1, status: 1 });
appointmentSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
appointmentSchema.index({ tenantId: 1, phone: 1 });
appointmentSchema.plugin(tenantScoped);

/**
 * What the studio keeps about a client, keyed by WhatsApp number so it shows up
 * on every booking from that number. The same person can be a client of two studios.
 */
const clientSchema = new Schema(
  {
    tenantId: tenantRef,
    phone: { type: String, required: true },
    handMold: { type: String, trim: true, maxlength: 40 },
    footMold: { type: String, trim: true, maxlength: 40 },
  },
  { timestamps: true },
);
clientSchema.index({ tenantId: 1, phone: 1 }, { unique: true });
clientSchema.plugin(tenantScoped);

/** Single-use links sent by email. Only the hash is kept (see lib/auth/tokens.ts). */
const AUTH_TOKEN_TYPES = ["confirm-email", "reset-password"] as const;
export type AuthTokenType = (typeof AUTH_TOKEN_TYPES)[number];

const authTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true, enum: AUTH_TOKEN_TYPES },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
authTokenSchema.index({ userId: 1, type: 1 });
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type TenantDoc = InferSchemaType<typeof tenantSchema>;
export type AuthTokenDoc = InferSchemaType<typeof authTokenSchema>;
export type ServiceDoc = InferSchemaType<typeof serviceSchema>;
export type PortfolioItemDoc = InferSchemaType<typeof portfolioItemSchema>;
export type UserDoc = InferSchemaType<typeof userSchema>;
export type AnalyticsEventDoc = InferSchemaType<typeof analyticsEventSchema>;
export type AppointmentDoc = InferSchemaType<typeof appointmentSchema>;
export type ClientDoc = InferSchemaType<typeof clientSchema>;

// `models.X ??` keeps hot reload from redefining models.
export const Tenant: Model<TenantDoc> =
  (mongoose.models.Tenant as Model<TenantDoc>) ?? mongoose.model("Tenant", tenantSchema);

export const AuthToken: Model<AuthTokenDoc> =
  (mongoose.models.AuthToken as Model<AuthTokenDoc>) ?? mongoose.model("AuthToken", authTokenSchema);

export const Service: Model<ServiceDoc> =
  (mongoose.models.Service as Model<ServiceDoc>) ?? mongoose.model("Service", serviceSchema);

export const PortfolioItem: Model<PortfolioItemDoc> =
  (mongoose.models.PortfolioItem as Model<PortfolioItemDoc>) ??
  mongoose.model("PortfolioItem", portfolioItemSchema);

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ?? mongoose.model("User", userSchema);

export const AnalyticsEvent: Model<AnalyticsEventDoc> =
  (mongoose.models.AnalyticsEvent as Model<AnalyticsEventDoc>) ??
  mongoose.model("AnalyticsEvent", analyticsEventSchema);

export const Appointment: Model<AppointmentDoc> =
  (mongoose.models.Appointment as Model<AppointmentDoc>) ?? mongoose.model("Appointment", appointmentSchema);

export const Client: Model<ClientDoc> =
  (mongoose.models.Client as Model<ClientDoc>) ?? mongoose.model("Client", clientSchema);
