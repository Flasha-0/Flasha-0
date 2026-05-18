const sharp = require('sharp');
const fs = require('fs');

async function build(svg, out, size) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(out);

  console.log(`✅ ${out}`);
}

const svg192 = fs.readFileSync('./assets/icon-192.svg', 'utf8');
const svg512 = fs.readFileSync('./assets/icon-512.svg', 'utf8');

build(svg192, './assets/icon-192.png', 192);
build(svg512, './assets/icon-512.png', 512);
