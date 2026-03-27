import mongoose from "mongoose";
import Challenge from "./models/Challenge.js";
import Tag from "./models/Tag.js";

export const syncTags = async () => {
  try {
    console.log("Starting tag synchronization...");

    // 1. Aggregation Pipeline
    const tagCounts = await Challenge.aggregate([
      { $unwind: "$tags" }, // Break arrays into individual rows
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 }, // Count occurrences
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          count: 1,
        },
      },
    ]);

    // 2. Clear old tags and insert new ones
    // We replace the whole collection to ensure counts are 100% accurate
    await Tag.deleteMany({});
    await Tag.insertMany(tagCounts);

    console.log(`Successfully synced ${tagCounts.length} unique tags.`);
  } catch (error) {
    console.error("Tag sync failed:", error);
  }
};

async function runSeed() {
  try {
    // 1. Connect first
    const MONGODB_URI =
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/devVerify";
    await mongoose.connect(MONGODB_URI);

    console.log("Connected to MongoDB...");

    // 2. Run your challenge seeding
    // ... insert logic here ...

    // 3. Now run the tag sync
    await syncTags();

    console.log("All done!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

runSeed();
