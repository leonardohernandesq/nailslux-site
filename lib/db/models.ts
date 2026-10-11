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

export type ServiceDoc = InferSchemaType<typeof serviceSchema>;
export type PortfolioItemDoc = InferSchemaType<typeof portfolioItemSchema>;
export type UserDoc = InferSchemaType<typeof userSchema>;

// `models.X ??` keeps hot reload from redefining models.
export const Service: Model<ServiceDoc> =
  (mongoose.models.Service as Model<ServiceDoc>) ?? mongoose.model("Service", serviceSchema);

export const PortfolioItem: Model<PortfolioItemDoc> =
  (mongoose.models.PortfolioItem as Model<PortfolioItemDoc>) ??
  mongoose.model("PortfolioItem", portfolioItemSchema);

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ?? mongoose.model("User", userSchema);
