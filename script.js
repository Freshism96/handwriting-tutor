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

    // ANALYSIS: Geometric Checks for Bad Handwriting
    let specificBadTypeId = null;
    let detectionDetail = "";

    if (avgConf < 75) {
        // 1. Check for Rollercoaster (Vertical variance)
        // Calculate variance of 'baseline' (bottom of bbox)
        if (wordCount > 2) {
            const baselines = result.data.words.map(w => w.bbox.y1);
            const meanBaseline = baselines.reduce((a, b) => a + b, 0) / baselines.length;
            const variance = baselines.reduce((a, b) => a + Math.pow(b - meanBaseline, 2), 0) / baselines.length;
            const stdDev = Math.sqrt(variance);

            // Heuristic threshold for waviness (relative to line height approx 50px?)
            if (stdDev > 20) {
                specificBadTypeId = 1; // Rollercoaster
                detectionDetail = "글자 높낮이가 들쑥날쑥해요.";
            }
        }

        // 2. Check for Crowded (Horizontal gap) if not Rollercoaster
        if (!specificBadTypeId && wordCount > 1) {
            let totalGap = 0;
            let gapCount = 0;
            // Sort by x position just in case
            const sortedWords = [...result.data.words].sort((a, b) => a.bbox.x0 - b.bbox.x0);

            for (let i = 0; i < sortedWords.length - 1; i++) {
                const curr = sortedWords[i];
                const next = sortedWords[i + 1];
                const gap = next.bbox.x0 - curr.bbox.x1;
                totalGap += gap;
                gapCount++;
            }
            const avgGap = gapCount > 0 ? totalGap / gapCount : 0;

            // If gap is very small or negative (overlap)
            if (avgGap < 5) {
                specificBadTypeId = 2; // Crowded
                detectionDetail = "글자들이 너무 붙어있어요.";
            }
        }
    }


    // LOGIC: High score AND some text detected -> GOOD
    const resultData = {
        is_good: false,
        allWords: result.data.words,
        recognizedText: result.data.text
    };

    if (avgConf >= 75 && textLength > 0) {
        // Select a random "Good" type
        const goodTypes = appData.good_handwriting_types;
        const randomIndex = Math.floor(Math.random() * goodTypes.length);
        const selected = goodTypes[randomIndex];

        Object.assign(resultData, { ...selected, is_good: true });
    } else {
        // BAD
        let selected;
        if (specificBadTypeId) {
            selected = appData.bad_handwriting_types.find(t => t.id === specificBadTypeId);
            if (!selected) {
                const badTypes = appData.bad_handwriting_types;
                selected = badTypes[Math.floor(Math.random() * badTypes.length)];
            }
            selected = { ...selected, feedback_detail: selected.feedback_detail + ` (${detectionDetail})` };
        } else {
            const badTypes = appData.bad_handwriting_types;
            const randomIndex = Math.floor(Math.random() * badTypes.length);
            selected = badTypes[randomIndex];
        }

        Object.assign(resultData, { ...selected, is_good: false, lowConfWords: lowConfWords });
    }

    return resultData;
}



function drawOverlaySimulation(diagnosis) {
    const canvas = document.getElementById('canvas-output');
    const ctx = canvas.getContext('2d');

    // 1. Draw Confidence Boxes (Traffic Light System) and Corrective Overlay
    // ALWAYS draw this, regardless of good/bad result, so user can see what happened.
    if (diagnosis.allWords && diagnosis.allWords.length > 0) {
        ctx.save();
        ctx.textBaseline = "top";

        diagnosis.allWords.forEach(word => {
            const x = word.bbox.x0;
            const y = word.bbox.y0;
            const w = word.bbox.x1 - word.bbox.x0;
            const h = word.bbox.y1 - word.bbox.y0;
            const conf = word.confidence;

            // Determine Color
            let color = "red"; // Default bad
            if (conf >= 80) color = "#4CAF50"; // Green (Good)
            else if (conf >= 60) color = "#FF9800"; // Orange (Okay)

            // Draw Box
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, h);

            // Draw Confidence Score (Tiny)
            ctx.fillStyle = color;
            ctx.font = "bold 12px Arial";
            ctx.fillText(Math.round(conf), x, y - 15);

            // Draw Corrective Text Overlay (Blue, Semi-transparent)
            // We draw this slightly offset or right on top
            ctx.save();
            ctx.font = "bold 40px 'Nanum Myeongjo'";
            ctx.fillStyle = "rgba(0, 0, 255, 0.5)"; // Blue 50%
            // Draw centered in the box logic if possible, or just x/y
            // For simple code, we use x/y
            ctx.fillText(word.text, x, y);
            ctx.restore();
        });
        ctx.restore();
    }

    // Draw Recognized Text Summary at bottom
    if (diagnosis.recognizedText) {
        ctx.save();
        ctx.font = "16px 'Nanum Gothic'";
        ctx.fillStyle = "#333";
        ctx.textAlign = "center";
        ctx.fillText("AI 인식: " + diagnosis.recognizedText.replace(/\n/g, " "), canvas.width / 2, canvas.height - 20);
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
