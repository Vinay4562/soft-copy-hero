import fs from "fs";
import path from "path";
import sharp from "sharp";

const inputArg = process.argv[2];
const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");

async function main() {
  const inputPath = inputArg || path.join(publicDir, "favicon-source.png");
  if (!fs.existsSync(inputPath)) {
    console.error(`Input image not found: ${inputPath}`);
    console.error("Place your source image at public/favicon-source.png or pass a path argument.");
    process.exit(1);
  }

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sizes = [
    { w: 16, h: 16, file: "favicon-16.png" },
    { w: 32, h: 32, file: "favicon-32.png" },
    { w: 32, h: 32, file: "favicon.png" }, // general favicon
    { w: 180, h: 180, file: "apple-touch-icon.png" },
  ];

  const img = sharp(inputPath).png({ compressionLevel: 9, quality: 90 });

  await Promise.all(
    sizes.map(async ({ w, h, file }) => {
      const outPath = path.join(publicDir, file);
      const pipeline = img.clone().resize(w, h, { fit: "cover" });
      await pipeline.toFile(outPath);
      console.log(`Created ${file}`);
    })
  );

  console.log("Favicons generated in /public. Update index.html links if needed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

