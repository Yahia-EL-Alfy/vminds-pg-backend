const fs = require('fs');
const path = require('path');

const saveBase64Image = (base64Str, fileName) => {
  const base64Data = base64Str.replace(/^data:image\/png;base64,/, ''); 
  const dirPath = path.join(__dirname, '../public/images'); 
  const filePath = path.join(dirPath, fileName);

  return new Promise((resolve, reject) => {
    fs.mkdir(dirPath, { recursive: true }, (err) => {
      if (err) {
        return reject(err);
      }

      fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(filePath);
        }
      });
    });
  });
};

module.exports = { saveBase64Image };
