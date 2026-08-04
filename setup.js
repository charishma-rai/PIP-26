const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const srcFile = path.join(__dirname, 'floorplan.png.png');
if (fs.existsSync(srcFile)) {
  fs.copyFileSync(srcFile, path.join(publicDir, 'floorplan.png'));
  fs.copyFileSync(srcFile, path.join(publicDir, 'floorplan.png.png'));
  console.log('Successfully copied floorplan.png to public/');
}
