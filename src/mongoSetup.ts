import mongoose, {
  Model,
  FilterQuery,
  UpdateQuery,
  PipelineStage,
} from "mongoose";
import Config from "./config";

export async function connectDB() {
  if (!Config.DB_URL) {
    throw new Error("❌ MongoDB URL is missing in Config");
  }

  await mongoose.connect(Config.DB_URL);
  console.log("✅ Database connected successfully");
}

export function toObjectId(id: string) {
  return new mongoose.Types.ObjectId(id);
}

export class MongooseService {
  private getModel<T>(modelName: string): Model<T> {
    const model = mongoose.models[modelName];
    if (!model) {
      throw new Error(`Model '${modelName}' is not registered.`);
    }
    return model as Model<T>;
  }

  async create<T>(modelName: string, data: Partial<T>) {
    const model = this.getModel<T>(modelName);
    const doc = new model(data);
    return await doc.save();
  }

  async insertMany<T>(modelName: string, data: Partial<T>[], options = {}) {
    const model = this.getModel<T>(modelName);
    return await model.insertMany(data, options);
  }

  async updateOne<T>(
    modelName: string,
    filter: FilterQuery<T>,
    update: UpdateQuery<T>
  ) {
    const model = this.getModel<T>(modelName);
    return await model.findOneAndUpdate(filter, update, { new: true }).exec();
  }

  async updateMany<T>(
    modelName: string,
    filter: FilterQuery<T>,
    update: UpdateQuery<T>
  ) {
    const model = this.getModel<T>(modelName);
    return await model.updateMany(filter, update).exec();
  }

  async deleteOne<T>(modelName: string, filter: FilterQuery<T>) {
    const model = this.getModel<T>(modelName);
    return await model.findOneAndDelete(filter).exec();
  }

  async aggregate<T>(modelName: string, pipeline: PipelineStage[]) {
    const model = this.getModel<T>(modelName);
    return await model.aggregate(pipeline).exec();
  }
async find<T>(
  modelName: string,
  filter: FilterQuery<T> = {},
  projection: any = {},
  options: any = {},
  populate: { path: string; select?: string }[] = []
): Promise<any[]> {
  const model = this.getModel<T>(modelName);
  let query = model.find(filter, projection, options);

  populate.forEach((p) => {
    query = query.populate(p.path, p.select);
  });

  const results = await query.lean().exec();

  return results.map((doc: any) => {
    const { _id, ...rest } = doc;
    return { id: _id, ...rest };
  });
}


async findOne<T>(
  modelName: string,
  filter: FilterQuery<T> = {},
  projection: any = {},
  options: any = {},
  populate: { path: string; select?: string }[] = []
): Promise<(T & { id: any }) | null> {
  const model = this.getModel<T>(modelName);
  let query = model.findOne(filter, projection, options);

  populate.forEach((p) => {
    query = query.populate(p.path, p.select);
  });

  const result = await query.lean().exec() as any;

  if (!result) return null;

  const { _id, ...rest } = result;
  return { id: _id, ...rest };
}




}
