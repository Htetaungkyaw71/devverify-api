// import mongoose from "mongoose";
// import fs from "fs";
// import slugify from "@sindresorhus/slugify";
// import path from "path";
// import { fileURLToPath } from "url";

// import Challenge from "./models/Challenge.js";
// import User from "./models/User.js";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const SEED_DATA_PATH = path.resolve(__dirname, "./data/leetcode_problems.json");

// /**
//  * Utility to decode HTML entities
//  */
// const decodeHTMLEntities = (text: string) => {
//   return text
//     .replace(/&quot;/g, '"')
//     .replace(/&apos;/g, "'")
//     .replace(/&lt;/g, "<")
//     .replace(/&gt;/g, ">")
//     .replace(/&amp;/g, "&")
//     .replace(/&nbsp;/g, " ");
// };

// /**
//  * Extract example inputs and outputs from description
//  */
// const extractExamples = (description: string) => {
//   const examples: Array<{ input: string; output: string }> = [];

//   // Match example blocks in various formats
//   const examplePatterns = [
//     // Format: <strong class="example">Example 1:</strong> ... Input: ... Output: ...
//     /<strong[^>]*>Example\s*\d+:<\/strong>\s*([\s\S]*?)(?=(?:<strong[^>]*>Example|$))/gi,

//     // Format: **Example 1:** ... Input: ... Output: ...
//     /\*\*Example\s*\d+:\*\*\s*([\s\S]*?)(?=(?:\*\*Example|$))/gi,

//     // Format: Example 1: ... Input: ... Output: ...
//     /Example\s*\d+:\s*([\s\S]*?)(?=(?:Example|$))/gi,
//   ];

//   for (const pattern of examplePatterns) {
//     const matches = description.matchAll(pattern);
//     for (const match of matches) {
//       const exampleText = match[1];

//       // Extract input
//       const inputMatch =
//         exampleText?.match(
//           /<strong>Input:<\/strong>\s*([\s\S]*?)(?=<strong>Output:|Output:|$)/i,
//         ) ||
//         exampleText?.match(
//           /\*\*Input:\*\*\s*([\s\S]*?)(?=\*\*Output:|Output:|$)/i,
//         ) ||
//         exampleText?.match(/Input:\s*([\s\S]*?)(?=Output:|$)/i);

//       // Extract output
//       const outputMatch =
//         exampleText?.match(
//           /<strong>Output:<\/strong>\s*([\s\S]*?)(?=<strong>|$)/i,
//         ) ||
//         exampleText?.match(/\*\*Output:\*\*\s*([\s\S]*?)(?=\*\*|$)/i) ||
//         exampleText?.match(/Output:\s*([\s\S]*?)(?=<|$)/i);

//       if (inputMatch?.[1] && outputMatch?.[1]) {
//         const input = decodeHTMLEntities(
//           inputMatch[1].replace(/<[^>]*>/g, "").trim(),
//         )
//           .replace(/\n/g, " ")
//           .replace(/\s+/g, " ")
//           .trim();
//         const output = decodeHTMLEntities(
//           outputMatch[1].replace(/<[^>]*>/g, "").trim(),
//         )
//           .replace(/\n/g, " ")
//           .replace(/\s+/g, " ")
//           .trim();

//         examples.push({ input, output });
//       }
//     }
//   }

//   return examples;
// };

// /**
//  * Parse input string into structured parameters
//  */
// const parseInputString = (inputStr: string, functionName: string) => {
//   const params: any[] = [];

//   // Try to parse as JSON-like array
//   try {
//     // Handle array inputs like [1,2,3,4] or ["a","b","c"]
//     if (inputStr.trim().startsWith("[")) {
//       // Parse multiple parameters separated by commas
//       const parts = inputStr.split(/(?<=[\]"]),|,(?=\[)/g);
//       for (const part of parts) {
//         if (part.trim().startsWith("[")) {
//           try {
//             params.push(JSON.parse(part.trim()));
//           } catch {
//             params.push(part.trim());
//           }
//         } else if (part.includes('"') || part.includes("'")) {
//           params.push(part.replace(/["']/g, "").trim());
//         } else {
//           const num = Number(part.trim());
//           params.push(isNaN(num) ? part.trim() : num);
//         }
//       }
//     } else {
//       // Single value
//       const num = Number(inputStr);
//       params.push(isNaN(num) ? inputStr : num);
//     }
//   } catch {
//     // Fallback: split by common separators
//     params.push(
//       ...inputStr
//         .split(/[,\s]+/)
//         .filter((p) => p)
//         .map((p) => {
//           const num = Number(p);
//           return isNaN(num) ? p : num;
//         }),
//     );
//   }

//   return params;
// };

// /**
//  * Format value for language-specific representation
//  */
// const formatValueForLanguage = (value: any, lang: string): string => {
//   if (Array.isArray(value)) {
//     const formattedArray = value
//       .map((v) => formatValueForLanguage(v, lang))
//       .join(", ");

//     switch (lang) {
//       case "java":
//         if (value.length > 0 && typeof value[0] === "string") {
//           return `new String[]{${formattedArray}}`;
//         }
//         return `new int[]{${formattedArray}}`;
//       case "cpp":
//       case "go":
//         return `{${formattedArray}}`;
//       case "rust":
//         return `vec![${formattedArray}]`;
//       default:
//         return `[${formattedArray}]`;
//     }
//   } else if (typeof value === "string") {
//     switch (lang) {
//       case "java":
//       case "cpp":
//       case "go":
//         return `"${value}"`;
//       case "rust":
//         return `"${value}".to_string()`;
//       default:
//         return `"${value}"`;
//     }
//   } else {
//     return String(value);
//   }
// };

// /**
//  * Extract function name and parameters from solution code
//  */
// const extractMetadata = (item: any) => {
//   const slug = item.titleSlug || slugify(item.title);
//   const defaultName = slug.replace(/-([a-z])/g, (g: any) => g[1].toUpperCase());

//   let name = defaultName;
//   let params: string[] = [];
//   let returnType = "any";

//   const codeSnippets = [
//     item.solution_code_python,
//     item.solution_code_java,
//     item.solution_code_cpp,
//   ].filter(Boolean);

//   for (const snippet of codeSnippets) {
//     // Python
//     if (snippet.includes("def ")) {
//       const match = snippet.match(/def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
//       if (match) {
//         name = match[1];
//         params = match[2]
//           .split(",")
//           .map((p: any) => p.trim().replace(/\bself\b,?\s*/, ""))
//           .filter((p: any) => p && !p.includes("self"));
//         break;
//       }
//     }
//     // Java
//     else if (snippet.includes("public ")) {
//       const match = snippet.match(
//         /public\s+(\w+\[\]|\w+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/,
//       );
//       if (match) {
//         returnType = match[1];
//         name = match[2];
//         params = match[3]
//           .split(",")
//           .map((p: any) => p.trim().split(/\s+/).pop() || "")
//           .filter((p: any) => p);
//         break;
//       }
//     }
//     // C++
//     else if (snippet.includes("vector<int>")) {
//       const match = snippet.match(
//         /(\w+\[\]|\w+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/,
//       );
//       if (match) {
//         name = match[2];
//         params = match[3]
//           .split(",")
//           .map((p: any) => p.trim().split(/\s+/).pop() || "")
//           .filter((p: any) => p);
//         break;
//       }
//     }
//   }

//   return {
//     name,
//     params: params.length > 0 ? params : ["nums", "target"],
//     returnType,
//     snakeName: slug.replace(/-/g, "_"),
//   };
// };

// const generateBoilerplates = (item: any) => {
//   const { name, params, snakeName } = extractMetadata(item);
//   const examples = extractExamples(item.description || "");

//   // Clean parameter names - remove any type annotations
//   const cleanParams = params.map((p) => p.replace(/:.*$/, "").trim());
//   const paramString = cleanParams.join(", ");

//   // Generate parameter values from examples
//   const getParamValues = (exampleInput: string) => {
//     try {
//       // Parse the input string to extract actual values
//       const matches = exampleInput.match(/=?\s*([\[{][\s\S]*?[\]}])/g);
//       if (matches) {
//         return matches.map((m) => {
//           const cleaned = m.replace(/^=?\s*/, "").trim();
//           // Try to parse as JSON, fallback to string
//           try {
//             return JSON.parse(cleaned);
//           } catch {
//             return cleaned;
//           }
//         });
//       }
//     } catch (e) {
//       // Fallback to default values
//     }
//     return cleanParams.map(() => 0);
//   };

//   return {
//     javascript: `function ${name}(${paramString}) {
//   // Write your solution here

// }

// // Test cases
// ${examples
//   .map((ex, idx) => {
//     const values = getParamValues(ex.input);
//     const valueString = values.map((v) => JSON.stringify(v)).join(", ");
//     const expectedOutput = ex.output.replace(/<[^>]*>/g, "").trim();
//     return `// Test case ${idx + 1}
// console.log('Test ${idx + 1}:', ${name}(${valueString}) === ${JSON.stringify(expectedOutput)});`;
//   })
//   .join("\n\n")}`,

//     typescript: `function ${name}(${cleanParams.map((p) => `${p}: any`).join(", ")}): any {
//   // Write your solution here

// }

// // Test cases
// ${examples
//   .map((ex, idx) => {
//     const values = getParamValues(ex.input);
//     const valueString = values.map((v) => JSON.stringify(v)).join(", ");
//     const expectedOutput = ex.output.replace(/<[^>]*>/g, "").trim();
//     return `// Test case ${idx + 1}
// console.log('Test ${idx + 1}:', ${name}(${valueString}) === ${JSON.stringify(expectedOutput)});`;
//   })
//   .join("\n\n")}`,

//     python: `class Solution:
//     def ${name}(self, ${paramString}):
//         \"\"\"
//         :type ${cleanParams.map((p) => `${p}: any`).join(", ")}
//         :rtype: any
//         \"\"\"
//         # Write your solution here
//         pass

// if __name__ == "__main__":
//     sol = Solution()
// ${examples
//   .map((ex, idx) => {
//     const values = getParamValues(ex.input);
//     const valueString = values
//       .map((v) => {
//         if (Array.isArray(v)) return v;
//         if (typeof v === "string") return `"${v}"`;
//         return v;
//       })
//       .join(", ");
//     const expectedOutput = ex.output.replace(/<[^>]*>/g, "").trim();
//     return `    # Test case ${idx + 1}
//     assert sol.${name}(${valueString}) == ${JSON.stringify(expectedOutput)}`;
//   })
//   .join("\n\n")}`,

//     cpp: `#include <iostream>
// #include <vector>
// #include <string>
// #include <cassert>
// using namespace std;

// class Solution {
// public:
//     ${item.solution_code_cpp?.includes("vector<int>") ? "vector<int>" : "int"} ${name}(${cleanParams.map((p) => `vector<int>& ${p}`).join(", ")}) {
//         // Write your solution here

//     }
// };

// int main() {
//     Solution sol;
// ${examples
//   .map((ex, idx) => {
//     const values = getParamValues(ex.input);
//     const valueString = values
//       .map((v) => {
//         if (Array.isArray(v)) {
//           return `{${v.join(", ")}}`;
//         }
//         return v;
//       })
//       .join(", ");
//     const expectedOutput = ex.output.replace(/<[^>]*>/g, "").trim();
//     return `    // Test case ${idx + 1}
//     assert(sol.${name}(${valueString}) == ${expectedOutput});`;
//   })
//   .join("\n\n")}
//     return 0;
// }`,

//     java: `import java.util.*;

// class Solution {
//     public ${item.solution_code_java?.includes("int[]") ? "int[]" : "int"} ${name}(${cleanParams.map((p) => `int[] ${p}`).join(", ")}) {
//         // Write your solution here

//     }

//     public static void main(String[] args) {
//         Solution sol = new Solution();
// ${examples
//   .map((ex, idx) => {
//     const values = getParamValues(ex.input);
//     const valueString = values
//       .map((v) => {
//         if (Array.isArray(v)) {
//           return `new int[]{${v.join(", ")}}`;
//         }
//         return v;
//       })
//       .join(", ");
//     const expectedOutput = ex.output.replace(/<[^>]*>/g, "").trim();
//     return `        // Test case ${idx + 1}
//         assert sol.${name}(${valueString}) == ${expectedOutput};`;
//   })
//   .join("\n\n")}
//     }
// }`,

//     go: `package main

// import "fmt"

// func ${name}(${cleanParams.map((p) => `${p} []int`).join(", ")}) ${item.solution_code_cpp?.includes("vector<int>") ? "[]int" : "int"} {
//     // Write your solution here

// }

// func main() {
// ${examples
//   .map((ex, idx) => {
//     const values = getParamValues(ex.input);
//     const valueString = values
//       .map((v) => {
//         if (Array.isArray(v)) {
//           return `[]int{${v.join(", ")}}`;
//         }
//         return v;
//       })
//       .join(", ");
//     const expectedOutput = ex.output.replace(/<[^>]*>/g, "").trim();
//     return `    // Test case ${idx + 1}
//     fmt.Println(${name}(${valueString}) == ${expectedOutput})`;
//   })
//   .join("\n\n")}
// }`,

//     rust: `struct Solution;

// impl Solution {
//     pub fn ${snakeName}(${cleanParams.map((p) => `${p}: Vec<i32>`).join(", ")}) -> ${item.solution_code_cpp?.includes("vector<int>") ? "Vec<i32>" : "i32"} {
//         // Write your solution here

//     }
// }

// fn main() {
// ${examples
//   .map((ex, idx) => {
//     const values = getParamValues(ex.input);
//     const valueString = values
//       .map((v) => {
//         if (Array.isArray(v)) {
//           return `vec![${v.join(", ")}]`;
//         }
//         return v;
//       })
//       .join(", ");
//     const expectedOutput = ex.output.replace(/<[^>]*>/g, "").trim();
//     return `    // Test case ${idx + 1}
//     println!("{:?}", Solution::${snakeName}(${valueString}) == ${expectedOutput});`;
//   })
//   .join("\n\n")}
// }`,

//     ruby: `def ${snakeName}(${paramString})
//   # Write your code here

// end

// ${examples
//   .map((ex, idx) => {
//     const values = getParamValues(ex.input);
//     const valueString = values
//       .map((v) => {
//         if (Array.isArray(v)) return v;
//         if (typeof v === "string") return `"${v}"`;
//         return v;
//       })
//       .join(", ");
//     const expectedOutput = ex.output.replace(/<[^>]*>/g, "").trim();
//     return `# Test case ${idx + 1}
// puts ${snakeName}(${valueString}) == ${expectedOutput}`;
//   })
//   .join("\n\n")}`,

//     php: `<?php

// class Solution {
//     function ${name}($${cleanParams.join(", $")}) {
//         // Write your solution here

//     }
// }

// $sol = new Solution();
// ${examples
//   .map((ex, idx) => {
//     const values = getParamValues(ex.input);
//     const valueString = values
//       .map((v) => {
//         if (Array.isArray(v)) {
//           return "[" + v.join(", ") + "]";
//         }
//         if (typeof v === "string") return '"' + v + '"';
//         return v;
//       })
//       .join(", ");
//     const expectedOutput = ex.output.replace(/<[^>]*>/g, "").trim();
//     return `// Test case ${idx + 1}
// echo $sol->${name}(${valueString}) == ${expectedOutput} ? "true\\n" : "false\\n";`;
//   })
//   .join("\n\n")}`,
//   };
// };

// /**
//  * Main seeding function
//  */
// const seedDatabase = async () => {
//   try {
//     await mongoose.connect("mongodb://127.0.0.1:27017/devVerify");
//     console.log("Connected to MongoDB...");

//     const adminUser = await User.findOne({ username: "htet" });
//     if (!adminUser) throw new Error("Admin user not found!");

//     await Challenge.deleteMany({});
//     console.log("Database cleared.");

//     const rawData = fs.readFileSync(SEED_DATA_PATH, "utf-8");
//     const challenges = JSON.parse(rawData);

//     const formattedChallenges = challenges
//       .filter((c: any) => c.description || c.statement)
//       .slice(0, 800)
//       .map((c: any) => {
//         const examples = extractExamples(c.description || "");
//         console.log(
//           `Processing: ${c.title} - Found ${examples.length} examples`,
//         );

//         return {
//           title: c.title,
//           slug: c.titleSlug || slugify(c.title),
//           description: c.description || c.statement,
//           difficulty: c.difficulty || "Medium",
//           category: c.category || "Algorithms",
//           tags: c.topics || [],
//           hints: c.hints || [],
//           boilerplateCode: generateBoilerplates(c),
//           createdBy: adminUser._id,
//           isPublic: true,
//         };
//       });

//     await Challenge.insertMany(formattedChallenges);
//     console.log(
//       `Successfully seeded ${formattedChallenges.length} challenges with test cases!`,
//     );
//     process.exit(0);
//   } catch (error) {
//     console.error("Seeding failed:", error);
//     process.exit(1);
//   }
// };

// seedDatabase();
import mongoose from "mongoose";
import fs from "fs";
import * as cheerio from "cheerio";
import slugify from "@sindresorhus/slugify";
import path from "path";
import { fileURLToPath } from "url";

import Challenge from "./models/Challenge.js";
import User from "./models/User.js";
import bcrypt from "bcryptjs";

type SeedItem = Record<string, any>;
type ExampleItem = {
  input: string;
  output: any;
  parsedInput: any[];
  inputNames?: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_DATA_PATH = path.resolve(__dirname, "../new.json");

/**
 * Utility to decode HTML entities
 */
const decodeHTMLEntities = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "...")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "--")
    .replace(/&le;/g, "<=")
    .replace(/&ge;/g, ">=")
    .replace(/&times;/g, "*")
    .replace(/&minus;/g, "-");
};

// const parseDescription = (htmlContent: string | null): any[] => {
//   const $ = cheerio.load(htmlContent || "");
//   const examples: any[] = [];

//   // Target any container that likely holds an example
//   $(".example-block, pre, div:has(strong.example)").each((_i, el) => {
//     const $el = $(el);

//     // 1. Remove Explanation/Extra lists to prevent "text bleed"
//     const $clone = $el.clone();
//     $clone.find("ul, ol, .explanation, img").remove();

//     // 2. Get normalized text
//     const text = $clone.text().replace(/\s+/g, " ").trim();

//     // 3. Find positions of key markers
//     const inputIdx = text.indexOf("Input:");
//     const outputIdx = text.indexOf("Output:");
//     const explanationIdx = text.indexOf("Explanation:");

//     if (inputIdx !== -1 && outputIdx !== -1) {
//       // Slice Input: everything between "Input:" and "Output:"
//       const rawInput = text.substring(inputIdx + 6, outputIdx).trim();

//       // Slice Output: everything between "Output:" and "Explanation:" (or end of string)
//       const endOfOutput = explanationIdx !== -1 ? explanationIdx : text.length;
//       let rawOutput = text.substring(outputIdx + 7, endOfOutput).trim();

//       // 4. Parse Inputs
//       const inputs: any[] = [];
//       // This regex captures: varName = [balanced brackets] OR varName = "string" OR varName = number
//       const paramRegex = /(\w+)\s*=\s*(\[.*?\]\]|\[.*?\]|".*?"|[^,]+)/g;
//       let match;

//       while ((match = paramRegex.exec(rawInput)) !== null) {
//         const name = (match[1] ?? "").trim();
//         let val = (match[2] ?? "").trim();
//         if (val.endsWith(",")) val = val.slice(0, -1);

//         inputs.push({ name, value: safeJsonParse(val) });
//       }

//       // 5. Parse Output
//       // Remove trailing punctuation common in non-pre tags
//       rawOutput = (rawOutput.split(" ")[0] || "").replace(/[.,]$/, "");

//       examples.push({
//         input: inputs,
//         output: safeJsonParse(rawOutput),
//       });
//     }
//   });

//   return examples;
// };

// // Helper to handle LeetCode's messy quotes and formats
// const safeJsonParse = (str: string) => {
//   try {
//     // Replace single quotes/entities to make it valid JSON
//     const clean = str.replace(/&quot;/g, '"').replace(/'/g, '"');
//     return JSON.parse(clean);
//   } catch {
//     // Fallback for plain strings
//     return str.replace(/^["']|["']$/g, "").trim();
//   }
// };
/**
 * Extract example inputs and outputs from description
 */

export const parseDescription = (htmlContent: string | null): any[] => {
  if (!htmlContent) return [];

  const $ = cheerio.load(htmlContent);
  const examples: any[] = [];

  $(".example-block, pre, .example").each((_i, el) => {
    const $el = $(el);

    // 1. Clean UI noise (Explanations often contain bait text)
    const $clone = $el.clone();
    $clone
      .find("ul, ol, .explanation, p:contains('Explanation'), img, blockquote")
      .remove();

    // Normalize text: handle non-breaking spaces and line breaks
    const text = $clone
      .text()
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // 2. Locate boundaries
    const inputIdx = text.indexOf("Input:");
    const outputIdx = text.indexOf("Output:");

    if (inputIdx !== -1 && outputIdx !== -1) {
      const rawInput = text.substring(inputIdx + 6, outputIdx).trim();

      // --- THE "SKIP" LOGIC ---
      // Skip if:
      // - No equals sign (Design problem)
      // - Contains "function" or "=>" (Javascript function problem)
      // - Contains "new Promise" or "yield"
      const isTooComplex =
        !rawInput.includes("=") ||
        rawInput.toLowerCase().includes("function") ||
        rawInput.includes("=>") ||
        rawInput.includes("yield");

      if (isTooComplex) {
        return; // Skip this example
      }

      // 3. Extract Output (stop at Explanation or end of text)
      const explanationIdx = text.indexOf("Explanation");
      const endOfOutput = explanationIdx !== -1 ? explanationIdx : text.length;
      const rawOutput = text.substring(outputIdx + 7, endOfOutput).trim();

      const inputs: any[] = [];
      // Greedy regex to capture balanced brackets for 2D arrays
      const paramRegex = /(\w+)\s*=\s*(\[.*?\]\]|\[.*?\]|".*?"|[^,]+)/g;
      let match;

      while ((match = paramRegex.exec(rawInput)) !== null) {
        const name = (match[1] ?? "").trim();
        let val = (match[2] ?? "").trim().replace(/[.,]$/, "");

        inputs.push({
          name,
          value: safeJsonParse(val),
        });
      }

      // 4. Final Validation & Output Cleaning
      if (inputs.length > 0) {
        // Find the first valid JSON structure in the output
        const cleanOutputMatch = rawOutput.match(
          /\[\s*\[.*\]\s*\]|\[.*?\]|\{.*?\}|null|true|false|-?\d+|"[^"]*"/,
        );
        const finalOutput = cleanOutputMatch
          ? safeJsonParse(cleanOutputMatch[0])
          : safeJsonParse(rawOutput.split(" ")[0] ?? "");

        examples.push({
          input: inputs,
          output: finalOutput,
        });
      }
    }
  });

  return examples;
};

/**
 * Robust JSON parser that handles single quotes and common HTML artifacts
 */
const safeJsonParse = (str: string) => {
  try {
    const jsonReady = str
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/'/g, '"')
      .trim();
    return JSON.parse(jsonReady);
  } catch {
    // Fallback for unquoted strings or numbers
    const cleaned = str
      .replace(/[.,]$/, "")
      .replace(/^["']|["']$/g, "")
      .trim();
    // Check if it's a number
    return isNaN(Number(cleaned)) ? cleaned : Number(cleaned);
  }
};

const extractExamples = (description: string): ExampleItem[] => {
  if (!description) return [];

  const parsed = parseDescription(decodeHTMLEntities(description));
  const mapped = parsed.map((example) => {
    const inputText = example.input
      .map((entry: any) => `${entry.name} = ${JSON.stringify(entry.value)}`)
      .join(", ");

    return {
      input: inputText,
      output: example.output,
      parsedInput: example.input.map((entry: any) => entry.value),
      inputNames: example.input.map((entry: any) => entry.name).filter(Boolean),
    } satisfies ExampleItem;
  });

  const uniqueExamples = mapped.filter(
    (example, index, self) =>
      index ===
      self.findIndex(
        (e) =>
          e.input === example.input &&
          JSON.stringify(e.output) === JSON.stringify(example.output),
      ),
  );

  return uniqueExamples.slice(0, 3);
};

/**
 * Parse input string into structured parameters
 */
const parseInputString = (inputStr: string): any[] => {
  if (!inputStr) return [];

  const params: any[] = [];

  // Handle special case for 2D arrays (like matrix problems)
  if (inputStr.includes("[[")) {
    try {
      // Extract all array patterns
      const arrayMatches = inputStr.match(/\[\[.*?\]\]/g);
      if (arrayMatches) {
        for (const match of arrayMatches) {
          try {
            // Try to parse as JSON
            const parsed = JSON.parse(match);
            if (Array.isArray(parsed)) {
              params.push(parsed);
            }
          } catch (e) {
            // Manual parsing for 2D arrays
            const rows = match.match(/\[(.*?)\]/g);
            if (rows) {
              const grid = rows.map((row) => {
                const items = row
                  .replace(/[\[\]]/g, "")
                  .split(",")
                  .map((item) => {
                    const trimmed = item.trim();
                    const num = Number(trimmed);
                    return isNaN(num) ? trimmed : num;
                  });
                return items;
              });
              params.push(grid);
            }
          }
        }
      }
    } catch (e) {
      console.error("Error parsing 2D array:", e);
    }
  }
  // Handle 1D arrays
  else if (inputStr.includes("[") && inputStr.includes("]")) {
    const arrayMatches = inputStr.match(/\[(.*?)\]/g);
    if (arrayMatches) {
      for (const match of arrayMatches) {
        try {
          const parsed = JSON.parse(match);
          if (Array.isArray(parsed)) {
            params.push(parsed);
          }
        } catch (e) {
          // Manual parsing for arrays
          const content = match.slice(1, -1);
          if (content.trim()) {
            const items = content.split(",").map((item) => {
              const trimmed = item.trim().replace(/^["']|["']$/g, "");
              const num = Number(trimmed);
              return isNaN(num) ? trimmed : num;
            });
            params.push(items);
          } else {
            params.push([]);
          }
        }
      }
    }
  }
  // Handle simple values
  else {
    // Try to split by common delimiters
    const parts = inputStr.split(/[,=\s]+/).filter((p) => p.trim());

    for (const part of parts) {
      // Skip parameter names like "nums", "target", etc.
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part) && !/^\d+$/.test(part)) {
        continue;
      }

      const trimmed = part.trim().replace(/^["']|["']$/g, "");
      const num = Number(trimmed);

      if (!isNaN(num) && trimmed !== "") {
        params.push(num);
      } else if (trimmed) {
        params.push(trimmed);
      }
    }
  }

  return params;
};

/**
 * Format value for language-specific representation
 */
const formatValueForLanguage = (
  value: any,
  lang: string,
  hasNulls: boolean = false,
): string => {
  // Handle null/undefined values
  if (value === null || value === undefined) {
    switch (lang) {
      case "rust":
        return "None";
      case "go":
        return "nil";
      case "cpp":
        return "nullopt";
      case "java":
        return "null";
      case "python":
        return "None";
      case "ruby":
        return "nil";
      default:
        return "null";
    }
  }

  if (Array.isArray(value)) {
    const is2DArray =
      value.length > 0 && value.every((row: any) => Array.isArray(row));

    // Handle true 2D arrays only (every element is an array)
    if (is2DArray) {
      const rowHasNullElements = value.some((row: any[]) =>
        row.some((item: any) => item === null || item === undefined),
      );
      const formattedRows = value
        .map((row: any[]) => {
          const rowItems = row.map((v: any) => {
            if (lang === "rust" && rowHasNullElements) {
              if (v === null || v === undefined) return "None";
              return `Some(${String(v)})`;
            }
            if (lang === "go" && rowHasNullElements) {
              if (v === null || v === undefined) return "nil";
              return `val(${String(v)})`;
            }
            return formatValueForLanguage(v, lang, rowHasNullElements);
          });

          switch (lang) {
            case "java":
            case "cpp":
              return `{${rowItems.join(", ")}}`;
            case "go":
              if (rowHasNullElements) {
                return `[]*int{${rowItems.join(", ")}}`;
              }
              return `[]int{${rowItems.join(", ")}}`;
            case "rust":
              if (rowHasNullElements) {
                return `vec![${rowItems.join(", ")}]`;
              }
              return `vec![${rowItems.join(", ")}]`;
            default:
              return `[${rowItems.join(", ")}]`;
          }
        })
        .join(", ");

      switch (lang) {
        case "java":
          return rowHasNullElements
            ? `new Integer[][]{${formattedRows}}`
            : `new int[][]{${formattedRows}}`;
        case "cpp":
          return rowHasNullElements
            ? `vector<vector<optional<int>>>{${formattedRows}}`
            : `vector<vector<int>>{${formattedRows}}`;
        case "go":
          return rowHasNullElements
            ? `[][]*int{${formattedRows}}`
            : `[][]int{${formattedRows}}`;
        case "rust":
          return `vec![${formattedRows}]`;
        default:
          return `[${formattedRows}]`;
      }
    }

    // Handle 1D arrays with nullable elements
    const hasNullElements = value.some(
      (v: any) => v === null || v === undefined,
    );
    const formattedArray = value
      .map((v: any) => formatValueForLanguage(v, lang, hasNullElements))
      .join(", ");

    switch (lang) {
      case "java":
        // Use Integer wrapper class if there might be nulls
        if (
          hasNullElements ||
          (value.length > 0 && typeof value[0] === "string")
        ) {
          return value.length > 0 && typeof value[0] === "string"
            ? `new String[]{${formattedArray}}`
            : `new Integer[]{${formattedArray}}`;
        }
        return `new int[]{${formattedArray}}`;

      case "cpp":
        // Use optional if there are nulls
        if (hasNullElements) {
          return `vector<optional<int>>{${formattedArray}}`;
        }
        return value.length > 0 && typeof value[0] === "string"
          ? `vector<string>{${formattedArray}}`
          : `vector<int>{${formattedArray}}`;

      case "go":
        // Use pointers if there are nulls
        if (hasNullElements) {
          const pointerElements = value
            .map((v: any) => {
              if (v === null || v === undefined) {
                return "nil";
              }
              return `val(${v})`;
            })
            .join(", ");
          return `[]*int{${pointerElements}}`;
        }
        return value.length > 0 && typeof value[0] === "string"
          ? `[]string{${formattedArray}}`
          : `[]int{${formattedArray}}`;

      case "rust":
        // Use Option wrapper if there are nulls
        if (hasNullElements) {
          const wrappedElements = value
            .map((v: any) => {
              if (v === null || v === undefined) {
                return "None";
              }
              const formatted = formatValueForLanguage(v, lang, false);
              return `Some(${formatted})`;
            })
            .join(", ");
          return `vec![${wrappedElements}]`;
        }
        return `vec![${formattedArray}]`;

      case "python":
        return `[${formattedArray}]`;

      default:
        return `[${formattedArray}]`;
    }
  } else if (typeof value === "string") {
    if (lang === "rust") {
      return `"${value}".to_string()`;
    }
    return `"${value}"`;
  } else {
    return String(value);
  }
};

/**
 * Extract function name and parameters from solution code
 */
const extractMetadata = (
  item: SeedItem,
): {
  name: string;
  params: string[];
  returnType: string;
  snakeName: string;
} => {
  const slug = item.titleSlug || slugify(item.title || "");
  // Convert slug to camelCase, removing hyphens and numbers
  const defaultName = slug
    .replace(/-([a-z])/g, (_: string, chr: string) => chr.toUpperCase())
    .replace(/[-\d]/g, "")
    .replace(/^\d+/, "");

  let name = defaultName;
  let params: string[] = [];
  let returnType = "any";

  // Try to extract from problem title to determine typical parameter names
  const title = item.title?.toLowerCase() || "";

  if (title.includes("sum") || title.includes("two")) {
    params = ["nums", "target"];
  } else if (
    title.includes("string") ||
    title.includes("substring") ||
    title.includes("palindrome")
  ) {
    params = ["s"];
  } else if (
    title.includes("list") ||
    title.includes("node") ||
    title.includes("linked")
  ) {
    params = ["head"];
  } else if (
    title.includes("tree") ||
    title.includes("bst") ||
    title.includes("binary")
  ) {
    params = ["root"];
  } else if (title.includes("matrix") || title.includes("grid")) {
    params = ["matrix"];
  } else if (title.includes("array")) {
    params = ["nums"];
  } else {
    params = ["input"];
  }

  return {
    name: name || defaultName,
    params: params,
    returnType,
    snakeName: slug.replace(/-/g, "_"),
  };
};

/**
 * Generate boilerplate code for different languages
 */
const generateBoilerplates = (
  item: SeedItem,
): {
  boilerplateCode: Record<string, string>;
  testcaseCode: Record<string, string>;
} => {
  const { name, params, snakeName } = extractMetadata(item);
  const examples = extractExamples(item.description || "");

  // Prefer parser-derived parameter names from examples, fallback to metadata
  const parserParams = (examples[0]?.inputNames || []).map((p) => p.trim());
  const cleanParams =
    parserParams.length > 0
      ? parserParams
      : params.map((p: string) => p.trim());
  const paramString = cleanParams.join(", ");

  const sampleValues =
    examples.find((ex) => ex.parsedInput && ex.parsedInput.length > 0)
      ?.parsedInput || [];
  const sampleOutput = examples.find((ex) => ex.output !== undefined)?.output;

  const containsNullDeep = (input: any): boolean => {
    if (input === null || input === undefined) return true;
    if (!Array.isArray(input)) return false;
    return input.some((entry: any) => containsNullDeep(entry));
  };

  // Check if any sample values contain nulls
  const hasNullValues = sampleValues.some((val: any) => containsNullDeep(val));

  const inferJavaType = (value: any, hasNulls: boolean = false): string => {
    if (Array.isArray(value)) {
      const is2DArray =
        value.length > 0 && value.every((row: any) => Array.isArray(row));
      if (is2DArray) {
        const hasNullInMatrix = value.some((row: any[]) =>
          row.some((cell: any) => cell === null || cell === undefined),
        );
        if (hasNullInMatrix) return "Integer[][]";
        return "int[][]";
      }

      if (hasNulls) {
        // Use Integer wrapper for nullable arrays
        if (value.find((v: any) => v !== null && typeof v === "string")) {
          return "String[]";
        }
        return "Integer[]";
      }
      if (value.length > 0 && value.every((v: any) => typeof v === "string")) {
        return "String[]";
      }
      return "int[]";
    }
    if (typeof value === "string") return "String";
    if (typeof value === "boolean") return "boolean";
    return "int";
  };

  const inferCppType = (value: any, hasNulls: boolean = false): string => {
    if (Array.isArray(value)) {
      const is2DArray =
        value.length > 0 && value.every((row: any) => Array.isArray(row));
      if (is2DArray) {
        const hasNullInMatrix = value.some((row: any[]) =>
          row.some((cell: any) => cell === null || cell === undefined),
        );
        if (hasNullInMatrix) return "vector<vector<optional<int>>>";
        return "vector<vector<int>>";
      }

      if (hasNulls) {
        // Use optional for nullable arrays
        if (value.find((v: any) => v !== null && typeof v === "string")) {
          return "vector<optional<string>>";
        }
        return "vector<optional<int>>";
      }
      if (value.length > 0 && value.every((v: any) => typeof v === "string")) {
        return "vector<string>";
      }
      return "vector<int>";
    }
    if (typeof value === "string") return "string";
    if (typeof value === "boolean") return "bool";
    return "int";
  };

  const inferGoType = (value: any, hasNulls: boolean = false): string => {
    if (Array.isArray(value)) {
      const is2DArray =
        value.length > 0 && value.every((row: any) => Array.isArray(row));
      if (is2DArray) {
        const hasNullInMatrix = value.some((row: any[]) =>
          row.some((cell: any) => cell === null || cell === undefined),
        );
        if (hasNullInMatrix) return "[][]*int";
        return "[][]int";
      }

      if (hasNulls) {
        // Use pointers for nullable arrays
        if (value.find((v: any) => v !== null && typeof v === "string")) {
          return "[]*string";
        }
        return "[]*int";
      }
      if (value.length > 0 && value.every((v: any) => typeof v === "string")) {
        return "[]string";
      }
      return "[]int";
    }
    if (typeof value === "string") return "string";
    if (typeof value === "boolean") return "bool";
    return "int";
  };

  const inferRustType = (value: any, hasNulls: boolean = false): string => {
    if (Array.isArray(value)) {
      const is2DArray =
        value.length > 0 && value.every((row: any) => Array.isArray(row));
      if (is2DArray) {
        const hasNullInMatrix = value.some((row: any[]) =>
          row.some((cell: any) => cell === null || cell === undefined),
        );
        if (hasNullInMatrix) return "Vec<Vec<Option<i32>>>";
        return "Vec<Vec<i32>>";
      }

      if (hasNulls) {
        // Use Option wrapper for nullable arrays
        if (value.find((v: any) => v !== null && typeof v === "string")) {
          return "Vec<Option<String>>";
        }
        return "Vec<Option<i32>>";
      }
      if (value.length > 0 && value.every((v: any) => typeof v === "string")) {
        return "Vec<String>";
      }
      return "Vec<i32>";
    }
    if (typeof value === "string") return "String";
    if (typeof value === "boolean") return "bool";
    return "i32";
  };

  const inferJavaReturnType = (value: any): string => {
    return inferJavaType(value, containsNullDeep(value));
  };

  const inferCppReturnType = (value: any): string => {
    return inferCppType(value, containsNullDeep(value));
  };

  const inferGoReturnType = (value: any): string => {
    return inferGoType(value, containsNullDeep(value));
  };

  const inferRustReturnType = (value: any): string => {
    return inferRustType(value, containsNullDeep(value));
  };

  const javaReturnType = inferJavaReturnType(sampleOutput);
  const cppReturnType = inferCppReturnType(sampleOutput);
  const goReturnType = inferGoReturnType(sampleOutput);
  const rustReturnType = inferRustReturnType(sampleOutput);

  const javaDefaultReturn = (() => {
    if (javaReturnType.endsWith("[][]")) {
      return javaReturnType.startsWith("Integer")
        ? "return new Integer[0][0];"
        : "return new int[0][0];";
    }
    if (javaReturnType.endsWith("[]")) {
      if (javaReturnType.startsWith("String")) return "return new String[0];";
      if (javaReturnType.startsWith("Integer")) return "return new Integer[0];";
      return "return new int[0];";
    }
    if (javaReturnType === "String") return 'return "";';
    if (javaReturnType === "boolean") return "return false;";
    return "return 0;";
  })();

  const cppDefaultReturn = (() => {
    if (cppReturnType.startsWith("vector<")) return "return {};";
    if (cppReturnType === "string") return 'return "";';
    if (cppReturnType === "bool") return "return false;";
    return "return 0;";
  })();

  const goDefaultReturn = (() => {
    if (goReturnType.startsWith("[]")) return "return nil";
    if (goReturnType === "string") return 'return ""';
    if (goReturnType === "bool") return "return false";
    return "return 0";
  })();

  const rustDefaultReturn = (() => {
    if (rustReturnType.startsWith("Vec<")) return "return vec![];";
    if (rustReturnType === "String") return "return String::new();";
    if (rustReturnType === "bool") return "return false;";
    return "return 0;";
  })();

  const javaParams = cleanParams
    .map((p, i) => `${inferJavaType(sampleValues[i], hasNullValues)} ${p}`)
    .join(", ");

  const cppParams = cleanParams
    .map((p, i) => {
      const type = inferCppType(sampleValues[i], hasNullValues);
      if (type.startsWith("vector<")) {
        return `const ${type}& ${p}`;
      }
      return `${type} ${p}`;
    })
    .join(", ");

  const goParams = cleanParams
    .map((p, i) => `${p} ${inferGoType(sampleValues[i], hasNullValues)}`)
    .join(", ");

  const rustParams = cleanParams
    .map((p, i) => `_${p}: ${inferRustType(sampleValues[i], hasNullValues)}`)
    .join(", ");

  const boilerplates: Record<string, string> = {};

  // Generate test cases for each language
  const generateTestCases = (lang: string): string => {
    if (examples.length === 0) return "";

    return examples
      .map((ex: ExampleItem, idx: number) => {
        const values = ex.parsedInput || [];

        // If we have no parsed values but have input string, try one more time
        if (values.length === 0 && ex.input) {
          const fallbackValues = parseInputString(ex.input);
          if (fallbackValues.length > 0) {
            values.push(...fallbackValues);
          }
        }

        const valuesForCall =
          values.length > 0 ? values : Array(cleanParams.length).fill(0);

        const callString = valuesForCall
          .map((v: any) => formatValueForLanguage(v, lang, hasNullValues))
          .join(", ");
        const expected = formatValueForLanguage(ex.output, lang, hasNullValues);

        switch (lang) {
          case "javascript":
            return `// Test case ${idx + 1}
const actual${idx + 1} = ${name}(${callString});
const expected${idx + 1} = ${expected};
const passed${idx + 1} = JSON.stringify(actual${idx + 1}) === JSON.stringify(expected${idx + 1});
console.log(\`Test ${idx + 1}: \${passed${idx + 1} ? "PASS" : "FAIL"} | actual: \${JSON.stringify(actual${idx + 1})} | expected: \${JSON.stringify(expected${idx + 1})}\`);`;

          case "typescript":
            return `// Test case ${idx + 1}
const actual${idx + 1} = ${name}(${callString});
const expected${idx + 1} = ${expected};
const passed${idx + 1} = JSON.stringify(actual${idx + 1}) === JSON.stringify(expected${idx + 1});
console.log(\`Test ${idx + 1}: \${passed${idx + 1} ? "PASS" : "FAIL"} | actual: \${JSON.stringify(actual${idx + 1})} | expected: \${JSON.stringify(expected${idx + 1})}\`);`;

          case "python":
            return `    # Test case ${idx + 1}
    actual${idx + 1} = sol.${name}(${callString})
    expected${idx + 1} = ${expected}
    passed${idx + 1} = actual${idx + 1} == expected${idx + 1}
    print(f"Test ${idx + 1}: {'PASS' if passed${idx + 1} else 'FAIL'} | actual: {actual${idx + 1}} | expected: {expected${idx + 1}}")`;

          case "java":
            return `        // Test case ${idx + 1}
        Object actual${idx + 1} = sol.${name}(${callString});
        Object expected${idx + 1} = ${expected};
        boolean passed${idx + 1} = normalize(actual${idx + 1}).equals(normalize(expected${idx + 1}));
        System.out.println("Test ${idx + 1}: " + (passed${idx + 1} ? "PASS" : "FAIL") + " | actual: " + normalize(actual${idx + 1}) + " | expected: " + normalize(expected${idx + 1}));`;

          case "cpp":
            return `    // Test case ${idx + 1}
    auto result${idx + 1} = sol.${name}(${callString});
    auto expected${idx + 1} = ${expected};
    bool passed${idx + 1} = (result${idx + 1} == expected${idx + 1});
    cout << "Test ${idx + 1}: " << (passed${idx + 1} ? "PASS" : "FAIL") << endl;`;

          case "go":
            if (hasNullValues) {
              // For Go pointers, we need a helper function
              return `    // Test case ${idx + 1}
    actual${idx + 1} := ${name}(${callString})
    expected${idx + 1} := ${expected}
    passed${idx + 1} := isEqual(actual${idx + 1}, expected${idx + 1})
    if passed${idx + 1} {
        fmt.Printf("Test ${idx + 1}: PASS | actual: %v | expected: %v\\n", actual${idx + 1}, expected${idx + 1})
    } else {
        fmt.Printf("Test ${idx + 1}: FAIL | actual: %v | expected: %v\\n", actual${idx + 1}, expected${idx + 1})
    }`;
            }
            return `    // Test case ${idx + 1}
    actual${idx + 1} := ${name}(${callString})
    expected${idx + 1} := ${expected}
    passed${idx + 1} := isEqual(actual${idx + 1}, expected${idx + 1})
    if passed${idx + 1} {
        fmt.Printf("Test ${idx + 1}: PASS | actual: %v | expected: %v\\n", actual${idx + 1}, expected${idx + 1})
    } else {
        fmt.Printf("Test ${idx + 1}: FAIL | actual: %v | expected: %v\\n", actual${idx + 1}, expected${idx + 1})
    }`;

          case "rust":
            return `    // Test case ${idx + 1}
    let actual${idx + 1} = Solution::${snakeName}(${callString});
    let expected${idx + 1} = ${expected};
    let passed${idx + 1} = actual${idx + 1} == expected${idx + 1};
    println!("Test ${idx + 1}: {} | actual: {:?} | expected: {:?}", if passed${idx + 1} { "PASS" } else { "FAIL" }, actual${idx + 1}, expected${idx + 1});`;

          case "ruby":
            return `# Test case ${idx + 1}
actual${idx + 1} = ${snakeName}(${callString})
expected${idx + 1} = ${expected}
passed${idx + 1} = actual${idx + 1} == expected${idx + 1}
puts "Test ${idx + 1}: #{passed${idx + 1} ? 'PASS' : 'FAIL'} | actual: #{actual${idx + 1}.inspect} | expected: #{expected${idx + 1}.inspect}"`;

          case "php":
            return `// Test case ${idx + 1}
$actual${idx + 1} = $sol->${name}(${callString});
$expected${idx + 1} = ${expected};
$passed${idx + 1} = $actual${idx + 1} == $expected${idx + 1};
echo "Test ${idx + 1}: " . ($passed${idx + 1} ? "PASS" : "FAIL") . " | actual: " . var_export($actual${idx + 1}, true) . " | expected: " . var_export($expected${idx + 1}, true) . "\\n";`;

          default:
            return "";
        }
      })
      .filter(Boolean)
      .join("\n\n");
  };

  const testcaseCode: Record<string, string> = {
    javascript: generateTestCases("javascript") || "// No test cases available",
    typescript: generateTestCases("typescript") || "// No test cases available",
    python: generateTestCases("python") || "# No test cases available",
    java: generateTestCases("java") || "// No test cases available",
    cpp: generateTestCases("cpp") || "// No test cases available",
    go: generateTestCases("go") || "// No test cases available",
    rust: generateTestCases("rust") || "// No test cases available",
    ruby: generateTestCases("ruby") || "# No test cases available",
    php: generateTestCases("php") || "// No test cases available",
  };

  // JavaScript
  boilerplates.javascript = `function ${name}(${paramString}) {
  // Write your solution here
  // TODO: Implement solution
  return 0;
}`;

  // TypeScript
  boilerplates.typescript = `function ${name}(${cleanParams.map((p) => `${p}: any`).join(", ")}): any {
  // Write your solution here
  // TODO: Implement solution
  return 0;
}`;

  // Python
  boilerplates.python = `class Solution:
    def ${name}(self, ${paramString}):
        """
        :type ${cleanParams.map((p) => `${p}: any`).join(", ")}
        :rtype: any
        """
        # Write your solution here
        return 0

if __name__ == "__main__":
    sol = Solution()
  # AUTO-GENERATED TEST BLOCK: DO NOT WRITE SOLUTION CODE HERE
  # Add test cases here`;

  // Java
  boilerplates.java = `import java.util.*;
import java.lang.reflect.Array;

  class Main {
    public ${javaReturnType} ${name}(${javaParams}) {
        // Write your solution here
      // TODO: Implement solution
      ${javaDefaultReturn}
    }

    private static String normalize(Object value) {
      if (value == null) return "null";
      Class<?> cls = value.getClass();
      if (!cls.isArray()) return String.valueOf(value);

      int len = Array.getLength(value);
      List<String> parts = new ArrayList<>();
      for (int i = 0; i < len; i++) {
        parts.add(normalize(Array.get(value, i)));
      }
      return "[" + String.join(", ", parts) + "]";
    }

    public static void main(String[] args) {
      Main sol = new Main();
      // AUTO-GENERATED TEST BLOCK: DO NOT WRITE SOLUTION CODE HERE
      // Add test cases here
    }
}`;

  // C++
  boilerplates.cpp = `#include <iostream>
#include <vector>
#include <string>
#include <optional>
using namespace std;

class Solution {
public:
  ${cppReturnType} ${name}(${cppParams}) {
        // Write your solution here
    // TODO: Implement solution
    ${cppDefaultReturn}
    }
};

int main() {
    Solution sol;
  // AUTO-GENERATED TEST BLOCK: DO NOT WRITE SOLUTION CODE HERE
    // Add test cases here
    return 0;
}`;

  // Go
  boilerplates.go = `package main

import (
    "fmt"
    "reflect"
)

  func ${name}(${goParams}) ${goReturnType} {
    // Write your solution here
  // TODO: Implement solution
  ${goDefaultReturn}
}

func isEqual(a any, b any) bool {
    return reflect.DeepEqual(a, b)
}

func main() {
${
  hasNullValues
    ? `    val := func(v int) *int { return &v }
    // AUTO-GENERATED TEST BLOCK: DO NOT WRITE SOLUTION CODE HERE
    // Add test cases here`
    : `    // AUTO-GENERATED TEST BLOCK: DO NOT WRITE SOLUTION CODE HERE
    // Add test cases here`
}
}`;

  // Rust
  boilerplates.rust = `struct Solution;

impl Solution {
  pub fn ${snakeName}(${rustParams}) -> ${rustReturnType} {
        // Write your solution here
    // TODO: Implement solution
  ${rustDefaultReturn}
    }
}

fn main() {
  // AUTO-GENERATED TEST BLOCK: DO NOT WRITE SOLUTION CODE HERE
    // Add test cases here
}`;

  // Ruby
  boilerplates.ruby = `def ${snakeName}(${paramString})
  # Write your code here
  return 0
  end`;

  // PHP
  boilerplates.php = `<?php

class Solution {
  function ${name}(${cleanParams.map((p) => `$${p}`).join(", ")}) {
        // Write your solution here
    // TODO: Implement solution
    return 0;
    }
}

$sol = new Solution();`;

  return {
    boilerplateCode: boilerplates,
    testcaseCode,
  };
};

/**
 * Main seeding function
 */
const seedDatabase = async () => {
  try {
    const MONGODB_URI =
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/devVerify";
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB...");

    // const adminUser = await User.findOne({ username: "htet" });
    // if (!adminUser) throw new Error("Admin user not found!");
    // console.log("✅ Admin user found");
    let password = process.env.MY_PASSWORD || "";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let user = await User.create({
      username: "htet",
      email: "htetaung200071@gmail.com",
      password: hashedPassword,
      isVerified: true,
    });

    await Challenge.deleteMany({});
    console.log("✅ Database cleared");

    const rawData = fs.readFileSync(SEED_DATA_PATH, "utf-8");
    const challenges = JSON.parse(rawData);
    console.log(`✅ Loaded ${challenges.length} problems from JSON`);

    const isDatabaseChallenge = (challenge: SeedItem): boolean => {
      const category = String(challenge.category || "").toLowerCase();
      const title = String(challenge.title || "").toLowerCase();
      const tags = Array.isArray(challenge.topics)
        ? challenge.topics.map((topic: any) => String(topic).toLowerCase())
        : [];

      return (
        category.includes("database") ||
        category.includes("sql") ||
        category.includes("pandas") ||
        title.includes("sql") ||
        title.includes("pandas") ||
        tags.some(
          (tag) =>
            tag.includes("database") ||
            tag.includes("sql") ||
            tag.includes("pandas"),
        )
      );
    };

    const formattedChallenges = challenges
      .filter(
        (c: SeedItem) => (c.description || c.title) && !isDatabaseChallenge(c),
      )
      // .slice(0, 800)
      .map((c: SeedItem) => {
        const examples = extractExamples(c.description || "");
        if (examples.length === 0) {
          return null;
        }

        const generatedCode = generateBoilerplates(c);
        console.log(
          `📝 Processing: ${c.frontendQuestionId || "?"} - ${c.title || "Untitled"} (${examples.length} examples)`,
        );

        return {
          title: c.title || `Problem ${c.frontendQuestionId}`,
          slug:
            c.titleSlug ||
            slugify(c.title || `problem-${c.frontendQuestionId}`),
          description: c.description || "",
          difficulty: c.difficulty || "Medium",
          category: c.category || "Algorithms",
          tags: c.topics || [],
          hints: c.hints || [],
          examples: examples,
          boilerplateCode: generatedCode.boilerplateCode,
          testcaseCode: generatedCode.testcaseCode,
          createdBy: user._id,
          isPublic: true,
        };
      })
      .filter((challenge: any) => challenge !== null);

    const result = await Challenge.insertMany(formattedChallenges);
    console.log(
      `\n✅ Successfully seeded ${result.length} challenges with test cases!`,
    );

    // Count by difficulty
    const counts = {
      Easy: result.filter((c) => c.difficulty === "Easy").length,
      Medium: result.filter((c) => c.difficulty === "Medium").length,
      Hard: result.filter((c) => c.difficulty === "Hard").length,
    };
    console.log("\n📊 Summary:");
    console.log(`   Easy: ${counts.Easy}`);
    console.log(`   Medium: ${counts.Medium}`);
    console.log(`   Hard: ${counts.Hard}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedDatabase();
