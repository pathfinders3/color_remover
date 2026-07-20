const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const resultCanvas = document.getElementById("resultCanvas");
const resultCtx = resultCanvas.getContext("2d", { willReadFrequently: true });
const historyRange = document.getElementById("historyRange");
const historyLabel = document.getElementById("historyLabel");
const toast = document.getElementById("toast");

let history = [];
let selectedHistoryIndex = 0;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

function updateHistoryUI() {
  if (!history.length) {
    historyRange.max = "0";
    historyRange.value = "0";
    historyLabel.textContent = "0 / 0";
    return;
  }

  const maxIndex = history.length - 1;
  const safeIndex = Math.min(selectedHistoryIndex, maxIndex);
  historyRange.max = String(maxIndex);
  historyRange.value = String(safeIndex);
  historyLabel.textContent = `${safeIndex} / ${maxIndex}`;
}

function resetHistory() {
  history = [];
  selectedHistoryIndex = 0;
  updateHistoryUI();
}

function pushHistoryState(imgData) {
  history.push(imgData);
  selectedHistoryIndex = history.length - 1;
  updateHistoryUI();
}

function applyHistoryState(index) {
  if (!history.length) {
    return;
  }

  const safeIndex = Math.max(0, Math.min(index, history.length - 1));
  const imgData = history[safeIndex];

  if (!imgData) {
    return;
  }

  canvas.width = imgData.width;
  canvas.height = imgData.height;
  ctx.putImageData(imgData, 0, 0);
  selectedHistoryIndex = safeIndex;
  updateHistoryUI();
}

function captureCurrentCanvasImageData() {
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function isGreenPixel(r, g, b) {
  return g > r + 25 && g > b + 25 && g > 80;
}

function getFirstGreenXs(sourceImgData) {
  const firstGreenXs = [];

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

    if (firstGreenX !== -1) {
      firstGreenXs.push(firstGreenX);
    }
  }

  return firstGreenXs;
}

/**
 * 외곽선만 추출하여 원본 그림을 제거한 결과를 반환
 * @param {HTMLCanvasElement} inputCanvas - 입력 캔버스
 * @param {number} tolerance - 배경 색상 허용치 (기본 35)
 * @param {boolean} transparentBg - 배경을 투명하게 할지 여부 (기본 true)
 * @returns {ImageData} 외곽선만 남은 ImageData
 */
function extractOuterContourOnly(inputCanvas, tolerance = 35, transparentBg = true) {
  const ctx = inputCanvas.getContext("2d", { willReadFrequently: true });
  const width = inputCanvas.width;
  const height = inputCanvas.height;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const mask = new Uint8Array(width * height);

  function getIndex(x, y) {
    return y * width + x;
  }

  function isBackground(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return true;
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const dist = Math.hypot(r - 255, g - 255, b - 255);
    return dist <= tolerance;
  }

  const queue = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (let x = 0; x < width; x += 1) {
    if (isBackground(x, 0)) {
      const idx = getIndex(x, 0);
      if (mask[idx] === 0) {
        mask[idx] = 1;
        queue.push({ x, y: 0 });
      }
    }
    if (isBackground(x, height - 1)) {
      const idx = getIndex(x, height - 1);
      if (mask[idx] === 0) {
        mask[idx] = 1;
        queue.push({ x, y: height - 1 });
      }
    }
  }

  for (let y = 0; y < height; y += 1) {
    if (isBackground(0, y)) {
      const idx = getIndex(0, y);
      if (mask[idx] === 0) {
        mask[idx] = 1;
        queue.push({ x: 0, y });
      }
    }
    if (isBackground(width - 1, y)) {
      const idx = getIndex(width - 1, y);
      if (mask[idx] === 0) {
        mask[idx] = 1;
        queue.push({ x: width - 1, y });
      }
    }
  }

  while (queue.length > 0) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = getIndex(nx, ny);
        if (mask[nIdx] === 0 && isBackground(nx, ny)) {
          mask[nIdx] = 1;
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  const resultData = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = getIndex(x, y);
      const pIdx = idx * 4;

      if (mask[idx] === 0) {
        let isOuterBoundary = false;

        for (const [dx, dy] of directions) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height || mask[getIndex(nx, ny)] === 1) {
            isOuterBoundary = true;
            break;
          }
        }

        if (isOuterBoundary) {
          resultData[pIdx] = 235;
          resultData[pIdx + 1] = 40;
          resultData[pIdx + 2] = 40;
          resultData[pIdx + 3] = 255;
        } else if (transparentBg) {
          resultData[pIdx + 3] = 0;
        } else {
          resultData[pIdx] = 255;
          resultData[pIdx + 1] = 255;
          resultData[pIdx + 2] = 255;
          resultData[pIdx + 3] = 255;
        }
      } else if (transparentBg) {
        resultData[pIdx + 3] = 0;
      } else {
        resultData[pIdx] = 255;
        resultData[pIdx + 1] = 255;
        resultData[pIdx + 2] = 255;
        resultData[pIdx + 3] = 255;
      }
    }
  }

  return new ImageData(resultData, width, height);
}

function extractOuterContour() {
  if (!canvas.width || !canvas.height) {
    showToast("이미지를 먼저 붙여넣어 주세요.");
    return;
  }

  const contourImgData = extractOuterContourOnly(canvas, 35, true);

  resultCanvas.width = canvas.width;
  resultCanvas.height = canvas.height;
  resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
  resultCtx.putImageData(contourImgData, 0, 0);

  pushHistoryState(new ImageData(
    new Uint8ClampedArray(contourImgData.data),
    contourImgData.width,
    contourImgData.height
  ));
  showToast("외곽선 추출 결과를 하단 캔버스에 표시했습니다.");
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

        resetHistory();
        pushHistoryState(captureCurrentCanvasImageData());
      };

      img.src = URL.createObjectURL(file);
      break;
    }
  }
});

historyRange.addEventListener("change", () => {
  applyHistoryState(Number(historyRange.value));
});

function findFirstGreens() {
  if (!canvas.width || !canvas.height) {
    showToast("이미지를 먼저 붙여넣어 주세요.");
    return;
  }

  const sourceImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const firstGreenXs = getFirstGreenXs(sourceImgData);

  resultCanvas.width = canvas.width;
  resultCanvas.height = canvas.height;
  resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
  resultCtx.fillStyle = "#00ff00";

  firstGreenXs.forEach((x, index) => {
    const y = index;
    resultCtx.fillRect(x, y, 1, 1);
  });

  pushHistoryState(resultCtx.getImageData(0, 0, resultCanvas.width, resultCanvas.height));
  showToast("각 행의 첫 녹색 픽셀 위치를 결과 캔버스에 표시했습니다.");
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
  pushHistoryState(new ImageData(
    new Uint8ClampedArray(removedImgData.data),
    removedImgData.width,
    removedImgData.height
  ));
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
