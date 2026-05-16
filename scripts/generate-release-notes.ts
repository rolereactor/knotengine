import { execSync } from "child_process";

const TAG = process.argv[2];
if (!TAG) {
  console.error("Usage: tsx scripts/generate-release-notes.ts <tag>");
  process.exit(1);
}

function getPreviousTag(tag: string): string {
  try {
    const result = execSync(
      `git tag --sort=-v:refname | grep -E '^v[0-9]+\\.' | awk '/^${tag}$/{found=1; next} found{print; exit}'`,
      { encoding: "utf-8" },
    ).trim();
    return result || "";
  } catch {
    return "";
  }
}

function parseCommits(from: string, to: string): string {
  const result = execSync(
    `git log ${from}..${to} --pretty=format:"%H%n%s%n%b%n---END---"`,
    { encoding: "utf-8" },
  );

  const commits: { hash: string; subject: string; body: string }[] = [];
  let currentHash = "";
  let currentSubject = "";
  let currentBody = "";

  for (const line of result.split("\n")) {
    if (line === "---END---") {
      if (currentHash) {
        commits.push({
          hash: currentHash,
          subject: currentSubject,
          body: currentBody.trim(),
        });
      }
      currentHash = "";
      currentSubject = "";
      currentBody = "";
    } else if (!currentHash) {
      currentHash = line;
    } else if (!currentSubject) {
      currentSubject = line;
    } else {
      currentBody += line + "\n";
    }
  }

  const sections: Record<string, string[]> = {
    feat: [],
    fix: [],
    docs: [],
    chore: [],
    ci: [],
    build: [],
    refactor: [],
    perf: [],
    test: [],
    style: [],
  };

  for (const commit of commits) {
    const match = commit.subject.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/);
    if (match) {
      const [, type, scope, message] = match;
      const entry = scope ? `**${scope}:** ${message}` : message;
      if (sections[type]) {
        sections[type].push(entry);
      }
    }
  }

  const typeLabels: Record<string, string> = {
    feat: "🚀 Features",
    fix: "🐛 Bug Fixes",
    docs: "📚 Documentation",
    chore: "🔧 Maintenance",
    ci: "🔄 CI/CD",
    build: "📦 Build",
    refactor: "♻️ Refactoring",
    perf: "⚡ Performance",
    test: "🧪 Tests",
    style: "💅 Styling",
  };

  let output = "";
  for (const [type, label] of Object.entries(typeLabels)) {
    if (sections[type].length > 0) {
      output += `## ${label}\n\n`;
      for (const entry of sections[type]) {
        output += `- ${entry}\n`;
      }
      output += "\n";
    }
  }

  return output;
}

const previousTag = getPreviousTag(TAG);

console.log(`# KnotEngine ${TAG}\n`);
console.log(parseCommits(previousTag || "", TAG));
console.log(
  `**Full Changelog**: https://github.com/qodinger/knotengine/compare/${previousTag || "v0.0.0"}...${TAG}`,
);
