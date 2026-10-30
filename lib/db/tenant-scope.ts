import type { MongooseQueryMiddleware, PipelineStage, Query, Schema } from "mongoose";

const QUERY_OPERATIONS: MongooseQueryMiddleware[] = [
  "find",
  "findOne",
  "countDocuments",
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "findOneAndDelete",
  "deleteOne",
  "deleteMany",
];

/**
 * Makes a query that forgets its tenant fail loudly instead of reaching another
 * studio's data. `findById` counts as forgetting: it can't carry a tenant, so use
 * `findOne({ _id, tenantId })`. Not covered: bulkWrite, and `Model.collection`,
 * which is the deliberate way around this guard (see lib/db/migrate-tenants.ts).
 */
export function tenantScoped(schema: Schema): void {
  schema.pre<Query<unknown, unknown>>(QUERY_OPERATIONS, function () {
    if (this.getFilter().tenantId == null) {
      throw new Error(`Query on ${this.model.modelName} has no tenantId.`);
    }
  });
  schema.pre("aggregate", function () {
    const first = this.pipeline()[0] as PipelineStage.Match | undefined;
    if (first?.$match?.tenantId == null) {
      throw new Error("Aggregation has no tenantId in its first $match.");
    }
  });
}
