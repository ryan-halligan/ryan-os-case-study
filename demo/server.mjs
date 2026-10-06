import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = new Map([
  ["/", ["demo/index.html", "text/html; charset=utf-8"]],
  ["/demo/fixtures.mjs", ["demo/fixtures.mjs", "text/javascript; charset=utf-8"]],
  ["/src/task-selection.mjs", ["src/task-selection.mjs", "text/javascript; charset=utf-8"]],
]);

http.createServer(async (req, res) => {
  const file = files.get(new URL(req.url, "http://127.0.0.1").pathname);
  if (!file || req.method !== "GET") { res.writeHead(404); res.end("Not found"); return; }
  try {
    const data = await fs.readFile(path.join(root, file[0]));
    res.writeHead(200, { "Content-Type": file[1], "Cache-Control": "no-store" });
    res.end(data);
  } catch { res.writeHead(500); res.end("Unable to load demo file"); }
}).listen(4173, "127.0.0.1", () => console.log("Synthetic organizer demo: http://127.0.0.1:4173"));
