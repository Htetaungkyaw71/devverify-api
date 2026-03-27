import mongoose, { Document, Schema } from "mongoose";

export interface ITag extends Document {
  name: string;
  count: number;
}

const TagSchema = new Schema<ITag>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  count: {
    type: Number,
    default: 0,
  },
});

TagSchema.index({ count: -1 });

export default mongoose.model<ITag>("Tag", TagSchema);
