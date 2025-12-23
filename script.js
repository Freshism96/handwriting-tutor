let videoStream = null;
let cvReady = false;

// Elements
const landingPage = document.getElementById('landing-page');
const cameraView = document.getElementById('camera-view');
const processingView = document.getElementById('processing-view');
const resultView = document.getElementById('result-view');

const videoPreview = document.getElementById('video-preview');
const canvasOutput = document.getElementById('canvas-output');
const captureBtn = document.getElementById('capture-btn');
const startBtn = document.getElementById('start-btn');
const retryBtn = document.getElementById('retry-btn');

// Feedback Elements
const feedbackTitle = document.getElementById('feedback-title');
const feedbackDetail = document.getElementById('feedback-detail');
const correctionAction = document.getElementById('correction-action');

function onOpenCvReady() {
    console.log('OpenCV.js is ready.');
    cvReady = true;
}

startBtn.addEventListener('click', async () => {
    landingPage.classList.add('hidden');
    cameraView.classList.remove('hidden');
    await startCamera();
});

captureBtn.addEventListener('click', () => {
    processImage();
});

retryBtn.addEventListener('click', () => {
    resultView.classList.add('hidden');
    cameraView.classList.remove('hidden');
    startCamera();
});

async function startCamera() {
    try {
        const constraints = {
            video: {
                facingMode: 'environment', // Rear camera preferred
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoPreview.srcObject = videoStream;
    } catch (err) {
        console.error("Camera access denied or error:", err);
        alert("카메라를 켤 수 없어요. 권한을 확인해주세요!");
    }
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
}

function processImage() {
    if (!cvReady) {
        alert("OpenCV가 아직 로딩 중이에요! 잠시만 기다려주세요.");
        return;
    }

    // Show processing state
    cameraView.classList.add('hidden');
    processingView.classList.remove('hidden');
    stopCamera();

    // 1. Capture image from video to canvas
    const videoWidth = videoPreview.videoWidth;
    const videoHeight = videoPreview.videoHeight;

    // Create a temporary canvas to hold the full frame
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = videoWidth;
    tempCanvas.height = videoHeight;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(videoPreview, 0, 0, videoWidth, videoHeight);

    // Simulate async processing
    setTimeout(() => {
        try {
            // OpenCV Processing: Perspective Correction (Simulated/Simple Crop for now)
            // In a real app, we would find contours, approximate polygon, and warp.
            // Here we'll just center crop to simulated ROI logic or just use the full image for stability in prototype.

            let src = cv.imread(tempCanvas);
            let dst = new cv.Mat();

            // For this prototype, we will just resize to fit our display canvas nicely
            // and maybe apply a simple filter to look like "scanned" document
            // let dsize = new cv.Size(videoWidth, videoHeight);
            // cv.resize(src, dst, dsize, 0, 0, cv.INTER_AREA);

            cv.imshow('canvas-output', src);
            src.delete();
            // dst.delete(); // If used

            // 2. Random Diagnosis Simulation
            const randomType = getRandomBadHandwritingType();

            // Update UI with diagnosis
            feedbackTitle.textContent = randomType.feedback_title;
            feedbackDetail.textContent = randomType.feedback_detail;
            correctionAction.textContent = randomType.correction_action;

            // 3. Overlay Simulation (Drawing text on canvas)
            drawOverlaySimulation();

            // Transition to Result View
            processingView.classList.add('hidden');
            resultView.classList.remove('hidden');

        } catch (e) {
            console.error(e);
            alert("이미지 처리에 실패했어요.");
            processingView.classList.add('hidden');
            cameraView.classList.remove('hidden');
            startCamera();
        }
    }, 1500); // 1.5s simulated delay
}

function getRandomBadHandwritingType() {
    const types = appData.bad_handwriting_types;
    const randomIndex = Math.floor(Math.random() * types.length);
    return types[randomIndex];
}

function drawOverlaySimulation() {
    // This function simulates the "Corrected Text" overlay
    // We'll just draw some "Nice Text" over the canvas for effect
    const canvas = document.getElementById('canvas-output');
    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.globalAlpha = 0.6; // 50-60% opacity
    ctx.font = "bold 50px 'Nanum Gothic'";
    ctx.fillStyle = "blue";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Just drawing a dummy "Corrected" text in the center
    // In real app, this would be aligned with OCR bounding boxes
    ctx.fillText("바른 글씨 예시", canvas.width / 2, canvas.height / 2);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeText("바른 글씨 예시", canvas.width / 2, canvas.height / 2);

    ctx.restore();
}
