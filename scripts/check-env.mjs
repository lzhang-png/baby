import { existsSync } from "node:fs"

const nodeMajor = Number(process.versions.node.split(".")[0] ?? 0)

if (nodeMajor < 20) {
  console.error(
    `Node.js ${process.versions.node} is too old. Use Node 20+ (https://nodejs.org/).`,
  )
  process.exit(1)
}

if (!existsSync("node_modules/vite/package.json")) {
  console.error("Dependencies are missing. Run: npm install")
  process.exit(1)
}

console.log(`Dev environment OK (Node ${process.versions.node})`)
