import fs from "fs";
import path from "path";

const TAG = process.argv[2];
if (!TAG) {
  console.error("Usage: tsx scripts/generate-release-notes.ts <tag>");
  process.exit(1);
}

// Strip the "v" prefix if it exists (e.g., "v0.6.0" -> "0.6.0")
const versionStr = TAG.startsWith("v") ? TAG.slice(1) : TAG;
const targetHeadingPrefix = `## [${versionStr}]`;
const unreleasedPrefix = `## [Unreleased]`;

const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
let changelogContent = "";

try {
  changelogContent = fs.readFileSync(changelogPath, "utf-8");
} catch {
  console.error("Could not read CHANGELOG.md");
  process.exit(1);
}

const lines = changelogContent.split("\n");
let isExtracting = false;
const extractedNotes: string[] = [];

for (const line of lines) {
  // If we find our target version heading, start extracting
  if (line.startsWith(targetHeadingPrefix)) {
    isExtracting = true;
    continue; // Skip the heading itself, GitHub Releases has its own title
  }

  // If we are currently extracting and hit the NEXT version heading, stop
  if (
    isExtracting &&
    line.startsWith("## [") &&
    !line.startsWith(targetHeadingPrefix)
  ) {
    break;
  }

  if (isExtracting) {
    extractedNotes.push(line);
  }
}

// Fallback: If we didn't find the exact tag, try to grab [Unreleased] as a safety net.
// (e.g. if a developer forgot to rename the heading before pushing the tag)
if (extractedNotes.length === 0) {
  for (const line of lines) {
    if (line.startsWith(unreleasedPrefix)) {
      isExtracting = true;
      continue;
    }
    if (
      isExtracting &&
      line.startsWith("## [") &&
      !line.startsWith(unreleasedPrefix)
    ) {
      break;
    }
    if (isExtracting) {
      extractedNotes.push(line);
    }
  }

  if (extractedNotes.length > 0) {
    extractedNotes.unshift(
      "> **Note:** These notes were extracted from the [Unreleased] section of CHANGELOG.md.\n",
    );
  }
}

const finalOutput = extractedNotes.join("\n").trim();

if (!finalOutput) {
  console.log(`*No release notes found in CHANGELOG.md for ${TAG}*`);
} else {
  console.log(finalOutput);
}
