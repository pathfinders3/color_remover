const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

document.addEventListener("paste", async (event) => {
  const items = event.clipboardData.items;

  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };

      img.src = URL.createObjectURL(file);
      break;
    }
  }
});

function removeGreen() {
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // 녹색 판정
    const isGreen = g > r + 25 && g > b + 25 && g > 80;

    if (isGreen) {
      // 투명 처리
      data[i + 3] = 0;

      // 흰색 처리로 바꾸려면 아래 사용
      /*
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
      */
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function removeRed() {
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // 빨간색 판정
    const isRed = r > g + 25 && r > b + 25 && r > 80;

    if (isRed) {
      // 투명 처리
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function downloadPNG(filename = "removed_pixels.png") {
  const a = document.createElement("a");
  a.download = filename;
  a.href = canvas.toDataURL("image/png");
  a.click();
}
