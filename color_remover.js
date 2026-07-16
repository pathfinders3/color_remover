const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const resultCanvas = document.getElementById("resultCanvas");
const resultCtx = resultCanvas.getContext("2d", { willReadFrequently: true });
const toast = document.getElementById("toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

function isGreenPixel(r, g, b) {
  return g > r + 25 && g > b + 25 && g > 80;
}

function paintMagentaBeforeFirstGreen(sourceImgData) {
  const editedImgData = new ImageData(
    new Uint8ClampedArray(sourceImgData.data),
    sourceImgData.width,
    sourceImgData.height
  );
  const editedData = editedImgData.data;

  for (let y = 0; y < sourceImgData.height; y += 1) {
    let firstGreenX = -1;

    for (let x = 0; x < sourceImgData.width; x += 1) {
      const offset = (y * sourceImgData.width + x) * 4;
      const r = sourceImgData.data[offset];
      const g = sourceImgData.data[offset + 1];
      const b = sourceImgData.data[offset + 2];

      if (isGreenPixel(r, g, b)) {
        firstGreenX = x;
        break;
      }
    }

    if (firstGreenX === -1) {
      continue;
    }

    for (let x = 0; x <= firstGreenX; x += 1) {
      const offset = (y * sourceImgData.width + x) * 4;
      editedData[offset] = 255;
      editedData[offset + 1] = 0;
      editedData[offset + 2] = 255;
      editedData[offset + 3] = 255;
    }
  }

  return editedImgData;
}

document.addEventListener("paste", async (event) => {
  const items = event.clipboardData.items;

  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        resultCanvas.width = img.width;
        resultCanvas.height = img.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
        ctx.drawImage(img, 0, 0);
      };

      img.src = URL.createObjectURL(file);
      break;
    }
  }
});

function findFirstGreens() {
  if (!canvas.width || !canvas.height) {
    showToast("이미지를 먼저 붙여넣어 주세요.");
    return;
  }

  const sourceImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const editedImgData = paintMagentaBeforeFirstGreen(sourceImgData);

  ctx.putImageData(editedImgData, 0, 0);
  resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
  showToast("각 행의 첫 녹색점까지를 magenta로 칠했습니다.");
}

async function removeGreen() {
  const sourceImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const editedImgData = new ImageData(
    new Uint8ClampedArray(sourceImgData.data),
    sourceImgData.width,
    sourceImgData.height
  );
  const removedImgData = new ImageData(sourceImgData.width, sourceImgData.height);
  const sourceData = sourceImgData.data;
  const editedData = editedImgData.data;
  const removedData = removedImgData.data;

  for (let i = 0; i < editedData.length; i += 4) {
    const r = sourceData[i];
    const g = sourceData[i + 1];
    const b = sourceData[i + 2];

    // 녹색 판정
    const isGreen = isGreenPixel(r, g, b);

    if (isGreen) {
      // 투명 처리
      editedData[i + 3] = 0;

      removedData[i] = sourceData[i];
      removedData[i + 1] = sourceData[i + 1];
      removedData[i + 2] = sourceData[i + 2];
      removedData[i + 3] = sourceData[i + 3];

      // 흰색 처리로 바꾸려면 아래 사용
      /*
      editedData[i] = 255;
      editedData[i + 1] = 255;
      editedData[i + 2] = 255;
      editedData[i + 3] = 255;
      */
    }
  }

  await applyEditedImage(editedImgData, removedImgData);
}

async function removeRed() {
  const sourceImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const editedImgData = new ImageData(
    new Uint8ClampedArray(sourceImgData.data),
    sourceImgData.width,
    sourceImgData.height
  );
  const removedImgData = new ImageData(sourceImgData.width, sourceImgData.height);
  const sourceData = sourceImgData.data;
  const editedData = editedImgData.data;
  const removedData = removedImgData.data;

  for (let i = 0; i < editedData.length; i += 4) {
    const r = sourceData[i];
    const g = sourceData[i + 1];
    const b = sourceData[i + 2];

    // 빨간색 판정
    const isRed = r > g + 25 && r > b + 25 && r > 80;

    if (isRed) {
      // 투명 처리
      editedData[i + 3] = 0;

      removedData[i] = sourceData[i];
      removedData[i + 1] = sourceData[i + 1];
      removedData[i + 2] = sourceData[i + 2];
      removedData[i + 3] = sourceData[i + 3];
    }
  }

  await applyEditedImage(editedImgData, removedImgData);
}

async function applyEditedImage(editedImgData, removedImgData) {
  ctx.putImageData(editedImgData, 0, 0);

  resultCanvas.width = canvas.width;
  resultCanvas.height = canvas.height;
  resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
  resultCtx.putImageData(removedImgData, 0, 0);
  showToast("결과가 하단 캔버스에 반영되었습니다.");
}

async function copyResultToClipboard() {
  if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) {
    alert("이 브라우저에서는 이미지 클립보드 복사를 지원하지 않습니다.");
    return;
  }

  try {
    const blob = await new Promise((resolve) => {
      resultCanvas.toBlob(resolve, "image/png");
    });

    if (!blob) {
      alert("클립보드 복사를 위한 이미지 생성에 실패했습니다.");
      return;
    }

    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob })
    ]);
    showToast("하단 캔버스 이미지가 클립보드에 복사되었습니다.");
  } catch (error) {
    alert("클립보드 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.");
  }
}

function downloadPNG(filename = "removed_pixels.png") {
  const a = document.createElement("a");
  a.download = filename;
  a.href = canvas.toDataURL("image/png");
  a.click();
}
