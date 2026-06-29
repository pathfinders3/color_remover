const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const copyAfterRemoveCheckbox = document.getElementById("copyAfterRemove");
const toast = document.getElementById("toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
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

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };

      img.src = URL.createObjectURL(file);
      break;
    }
  }
});

async function removeGreen() {
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

  await applyEditedImage(imgData);
}

async function removeRed() {
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

  await applyEditedImage(imgData);
}

async function applyEditedImage(imgData) {
  ctx.putImageData(imgData, 0, 0);

  if (!copyAfterRemoveCheckbox || !copyAfterRemoveCheckbox.checked) {
    return;
  }

  if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) {
    alert("이 브라우저에서는 이미지 클립보드 복사를 지원하지 않습니다.");
    return;
  }

  try {
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });

    if (!blob) {
      alert("클립보드 복사를 위한 이미지 생성에 실패했습니다.");
      return;
    }

    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob })
    ]);
    showToast("제거된 픽셀이 클립보드에 복사되었습니다.");
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
