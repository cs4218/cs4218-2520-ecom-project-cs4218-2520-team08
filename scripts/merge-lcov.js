const fs = require("fs");
const path = require("path");

const rootCoverageDir = path.resolve(__dirname, "..", "coverage");
const inputFiles = [
  path.join(rootCoverageDir, "backend", "lcov.info"),
  path.join(rootCoverageDir, "frontend", "lcov.info"),
];
const outputFile = path.join(rootCoverageDir, "lcov.info");

const missingFiles = inputFiles.filter((file) => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error("Missing LCOV report(s):");
  missingFiles.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

const mergedContent = inputFiles
  .map((file) => fs.readFileSync(file, "utf8").trim())
  .filter(Boolean)
  .join("\n");

fs.mkdirSync(rootCoverageDir, { recursive: true });
fs.writeFileSync(outputFile, `${mergedContent}\n`);

console.log(`Merged LCOV written to ${outputFile}`);
