import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const serviceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300 },
    priceCents: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, min: 5, max: 480 },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

const portfolioItemSchema = new Schema(
  {
    fileId: { type: Schema.Types.ObjectId, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    blurDataUrl: { type: String, required: true },
    caption: { type: String, trim: true, maxlength: 120 },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

const userSchema = new Schema(
  {
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
analyticsEventSchema.index({ type: 1, createdAt: 1 });

export type ServiceDoc = InferSchemaType<typeof serviceSchema>;
export type PortfolioItemDoc = InferSchemaType<typeof portfolioItemSchema>;
export type UserDoc = InferSchemaType<typeof userSchema>;
export type AnalyticsEventDoc = InferSchemaType<typeof analyticsEventSchema>;

// `models.X ??` keeps hot reload from redefining models.
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
