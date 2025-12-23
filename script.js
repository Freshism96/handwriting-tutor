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
    setTimeout(async () => {
        try {
            // 1.5. Run Tesseract OCR (Real Analysis)
            const ocrResult = await Tesseract.recognize(
                tempCanvas,
                'kor',
                {
                    logger: m => {
                        updateSortOfProgress(m);
                    }
                }
            );

            console.log("OCR Result:", ocrResult);
            const analysis = analyzeOCRResult(ocrResult);

            // Update UI with diagnosis
            feedbackTitle.textContent = analysis.feedback_title;
            feedbackDetail.textContent = analysis.feedback_detail;
            correctionAction.textContent = analysis.correction_action;

            // 3. Overlay Simulation
            drawOverlaySimulation(analysis);

            // Transition to Result View
            processingView.classList.add('hidden');
            resultView.classList.remove('hidden');

        } catch (e) {
            console.error(e);
            alert("이미지 처리에 실패했어요." + e.message);
            processingView.classList.add('hidden');
            cameraView.classList.remove('hidden');
            startCamera();
        }
    }, 100); // reduced delay as OCR takes time
}

function analyzeOCRResult(result) {
    // Basic Heuristic:
    // High Confidence (> 75) + Meaningful Text length -> Good
    // Low Confidence (< 75) -> Bad

    // Calculate average confidence of words
    let totalConf = 0;
    let wordCount = 0;
    const lowConfWords = [];

    result.data.words.forEach(word => {
        totalConf += word.confidence;
        wordCount++;
        if (word.confidence < 75) {
            lowConfWords.push(word.bbox);
        }
    });

    const avgConf = wordCount > 0 ? (totalConf / wordCount) : 0;
    const textLength = result.data.text.trim().length;

    console.log(`Average Confidence: ${avgConf}, Text Length: ${textLength}`);

    // LOGIC: High score AND some text detected -> GOOD
    if (avgConf >= 75 && textLength > 0) {
        // Select a random "Good" type
        const goodTypes = appData.good_handwriting_types;
        const randomIndex = Math.floor(Math.random() * goodTypes.length);
        const selected = goodTypes[randomIndex];
        // Carry over OCR data for overlay if needed (not needed for good)
        return { ...selected, is_good: true };
    } else {
        // BAD
        // Select a random "Bad" type for feedback text
        const badTypes = appData.bad_handwriting_types;
        const randomIndex = Math.floor(Math.random() * badTypes.length);
        const selected = badTypes[randomIndex];

        // Return type with added bbox data for red boxes
        return {
            ...selected,
            is_good: false,
            lowConfWords: lowConfWords // Pass coordinates of messy words
        };
    }
}



function drawOverlaySimulation(diagnosis) {
    const canvas = document.getElementById('canvas-output');
    const ctx = canvas.getContext('2d');

    // 1. Draw Red Boxes for "Bad" areas (Real Bad Handwriting Check)
    if (!diagnosis.is_good && diagnosis.lowConfWords && diagnosis.lowConfWords.length > 0) {
        ctx.save();
        ctx.strokeStyle = "red";
        ctx.lineWidth = 4;

        diagnosis.lowConfWords.forEach(bbox => {
            // bbox: {x0, y0, x1, y1} from Tesseract
            const x = bbox.x0;
            const y = bbox.y0;
            const w = bbox.x1 - bbox.x0;
            const h = bbox.y1 - bbox.y0;

            ctx.strokeRect(x, y, w, h);

            // Draw a little "Check" or "X" mark
            ctx.fillStyle = "red";
            ctx.font = "bold 20px Arial";
            ctx.fillText("Check!", x, y - 5);
        });
        ctx.restore();
    }

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (diagnosis.is_good) {
        // Draw "Good Job" Stamp
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-20 * Math.PI / 180); // Rotate -20 degrees

        // Stamp Border
        ctx.beginPath();
        ctx.arc(0, 0, 120, 0, Math.PI * 2);
        ctx.lineWidth = 10;
        ctx.strokeStyle = "#FF5722"; // Stamp Red
        ctx.stroke();

        // Stamp Text
        ctx.font = "bold 40px 'Nanum Myeongjo'"; // Changed to Myeongjo (Batang-like)
        ctx.fillStyle = "#FF5722";
        ctx.fillText("참 잘했어요", 0, -20);

        ctx.font = "30px 'Nanum Myeongjo'"; // Changed to Myeongjo (Batang-like)
        ctx.fillText("AI 선생님 확인", 0, 30);
    } else {
        // Draw "Corrected Example" Box for Bad Handwriting
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Semi-transparent background box for readability
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.roundRect(centerX - 150, centerY - 60, 300, 120, 20);
        ctx.fill();

        // Guide text (Subtitle)
        ctx.font = "20px 'Nanum Gothic'";
        ctx.fillStyle = "#FFD700"; // Gold
        ctx.fillText("이렇게 써보세요!", centerX, centerY - 25);

        // Correction Example (Main)
        // Using 'Nanum Myeongjo' for the "Textbook" feel
        ctx.font = "bold 50px 'Nanum Myeongjo'";
        ctx.fillStyle = "white";
        ctx.fillText("바른 글씨 예시", centerX, centerY + 25);
    }

    ctx.restore();
}


function updateSortOfProgress(message) {
    const progressEl = document.getElementById('progress-detail');
    if (!progressEl) return;

    let statusText = message.status;
    const progress = Math.round(message.progress * 100);

    // Map common Tesseract statuses to Korean
    if (statusText === 'loading tesseract core') {
        statusText = 'AI 두뇌를 깨우는 중...';
    } else if (statusText === 'initializing api') {
        statusText = '준비 운동 하는 중...';
    } else if (statusText === 'recognizing text') {
        statusText = '글씨를 자세히 보는 중...';
    } else if (statusText === 'loading language traineddata') {
        statusText = '한국어 공부장을 펼치는 중...';
    } else {
        // Fallback for other statuses
        statusText = '열심히 생각하는 중...';
    }

    if (message.status === 'done') {
        progressEl.textContent = '분석 완료!';
    } else {
        progressEl.textContent = `${statusText} (${progress}%)`;
    }
}
