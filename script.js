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
        // 1. Request Basic Constraints first (Maximum compatibility)
        const constraints = {
            video: {
                facingMode: 'environment', // Rear camera
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoPreview.srcObject = videoStream;

        // 2. Try to enable Auto-focus if supported (Progressive enhancement)
        try {
            const track = videoStream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();

            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                await track.applyConstraints({
                    advanced: [{ focusMode: 'continuous' }]
                });
                console.log("Auto-focus enabled");
            }
        } catch (focusErr) {
            console.warn("Auto-focus not supported or failed to apply:", focusErr);
            // Ignore focus error, camera is still working
        }

        cameraView.classList.remove('hidden');
        processingView.classList.add('hidden');
    } catch (err) {
        console.error("Camera Error details:", err);
        alert(`카메라를 켤 수 없어요. (${err.name}: ${err.message})\n설정에서 카메라 권한을 확인해주세요.`);
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
            // 1.2 Preprocess Image for OCR (Black & White)
            // We use the 'tempCanvas' (Color) for UI display, but create a 'processedCanvas' for AI
            const processedCanvas = preprocessImage(tempCanvas);

            // 1.5. Run Tesseract OCR on PROCESSED image
            const ocrResult = await Tesseract.recognize(
                processedCanvas,
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
            // Pass tempCanvas (the clean image) to be drawn on the output canvas
            drawOverlaySimulation(analysis, tempCanvas);

            // 4. Render Side-by-Side Comparison
            // Pass tempCanvas to crop from the CLEAN image
            renderComparisonCards(analysis, tempCanvas);

            // 5. Update Recognition Header
            const finalRecogText = analysis.recognizedText ? analysis.recognizedText.replace(/\n/g, " ").trim() : "인식 실패";
            document.getElementById('ai-recognized-text').textContent = finalRecogText || "(글씨가 안 보여요)";

            // Transition to Result View
            processingView.classList.add('hidden');
            resultView.classList.remove('hidden');

        } catch (e) {
            console.error(e);
            alert("이미지 처리에 실패했어요. " + e.message);
            processingView.classList.add('hidden');
            cameraView.classList.remove('hidden');
            startCamera();
        }
    }, 100); // reduced delay as OCR takes time
}

/**
 * Preprocess image using OpenCV for better OCR results
 * 1. Grayscale
 * 2. Adaptive Thresholding (Binarization)
 */
function preprocessImage(originalCanvas) {
    if (!cvReady) return originalCanvas; // Fallback

    let src = null;
    let dst = null;
    let ksize = null;
    // Morphological structures if used
    // let M = null; 

    try {
        src = cv.imread(originalCanvas);
        dst = new cv.Mat();

        // 1. Convert to Grayscale
        cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

        // 1.5. Gaussian Blur (Noise Reduction)
        ksize = new cv.Size(5, 5);
        cv.GaussianBlur(src, src, ksize, 0, 0, cv.BORDER_DEFAULT);

        // 2. Apply Adaptive Thresholding
        cv.adaptiveThreshold(src, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 31, 10);

        // Output to a new canvas
        const processedCanvas = document.createElement('canvas');
        processedCanvas.width = originalCanvas.width;
        processedCanvas.height = originalCanvas.height;
        cv.imshow(processedCanvas, dst);

        return processedCanvas;

    } catch (e) {
        console.error("OpenCV Preprocessing failed:", e);
        return originalCanvas; // Fallback to original
    } finally {
        // CLEANUP: extensive cleanup to prevent memory leaks
        if (src) src.delete();
        if (dst) dst.delete();
        // ksize doesn't strictly need delete() in JS binding usually unless it's a specific object, 
        // but checking docs suggests simple Structs might be GC'd, but Mat MUST be deleted. 
        // However, cv.Size might invoke C++ alloc. 
        // In opencv.js, Size is usually a simple object or needs deletion? 
        // Safe bet: if it has delete, call it.
        // Actually for opencv.js, Size/Point etc often don't need manual delete if they are just JS objects passed to functions,
        // but 'new cv.Size' creates a heap object? Let's be safe if we can, but usually Mat is the big one.
    }
}

function analyzeOCRResult(result) {
    // Safety Check
    if (!result || !result.data || !result.data.words) {
        console.error("Invalid OCR Result:", result);
        return {
            is_good: false,
            lowConfWords: [],
            feedback_title: "분석 오류",
            feedback_detail: "글씨를 제대로 인식하지 못했어요.",
            correction_action: "조금 더 밝은 곳에서 다시 찍어주세요.",
            recognizedText: ""
        };
    }

    // Basic Heuristic:
    // High Confidence (> 75) + Meaningful Text length -> Good
    // Low Confidence (< 75) -> Bad

    // Calculate average confidence of words
    // Calculate average confidence of words
    // Filter Step: Ignore tiny noise (dots/specks) and extremely low confidence garbage
    const validWords = result.data.words.filter(word => {
        const w = word.bbox.x1 - word.bbox.x0;
        const h = word.bbox.y1 - word.bbox.y0;
        // Optimization: Ignore if detection is smaller than 20x20px or confidence is < 40% (Noise)
        return (w > 20 && h > 20 && word.confidence > 40);
    });

    let totalConf = 0;
    let wordCount = 0;
    const lowConfWords = [];

    validWords.forEach(word => {
        totalConf += word.confidence;
        wordCount++;
        // Optimization: Leniency upgrade. 
        // If > 60, it's considered "Okay". If < 60, it needs practice.
        if (word.confidence < 60) {
            lowConfWords.push(word.bbox);
        }
    });

    // If no valid words found, treat as 0 confidence
    const avgConf = wordCount > 0 ? (totalConf / wordCount) : 0;

    // Optimization: Lowered threshold from 75 to 60 to be more encouraging
    const handwritingQualityThreshold = 60;

    // Extract recognized text for display
    const recognizedText = validWords.map(w => w.text).join(' ');

    console.log(`Analyzed ${wordCount} words. Avg Conf: ${avgConf}`);

    // Select Feedback based on Analysis
    let selected;
    if (avgConf >= handwritingQualityThreshold && recognizedText.length > 0) {
        // GOOD handwriting
        const randomIndex = Math.floor(Math.random() * appData.good_handwriting_types.length);
        selected = appData.good_handwriting_types[randomIndex];

        return {
            ...selected,
            is_good: true,
            allWords: validWords, // Pass all words for consistent visualization
            recognizedText: recognizedText
        };
    } else {
        // BAD handwriting
        // 1. Geometric Analysis (Rollercoaster, Congested, etc.)
        // We only analyze geometry if we have enough words (>= 3)
        let geometricType = null;
        let detectionDetail = "";
        if (wordCount >= 3) {
            // 1. Check for Rollercoaster (Vertical variance)
            // Calculate variance of 'baseline' (bottom of bbox)
            const baselines = validWords.map(w => w.bbox.y1);
            const meanBaseline = baselines.reduce((a, b) => a + b, 0) / baselines.length;
            const variance = baselines.reduce((a, b) => a + Math.pow(b - meanBaseline, 2), 0) / baselines.length;
            const stdDev = Math.sqrt(variance);

            // Heuristic threshold for waviness (relative to line height approx 50px?)
            if (stdDev > 20) {
                geometricType = 1; // Rollercoaster
                detectionDetail = "글자 높낮이가 들쑥날쑥해요.";
            }
        } // Closing the 'if (wordCount >= 3)' block properly

        // 2. Check for Crowded (Horizontal gap) if not Rollercoaster
        if (!geometricType && wordCount > 1) {
            let totalGap = 0;
            let gapCount = 0;
            // Sort validWords (not result.data.words) by x position
            const sortedWords = [...validWords].sort((a, b) => a.bbox.x0 - b.bbox.x0);

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
                geometricType = 2; // Crowded
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
        // If we detected a specific geometric type, use that ID.
        // Otherwise, pick a random "Bad" type (excluding 1 & 2 ideally, or just random)
        if (geometricType) {
            // Find the feedback item with this ID
            selected = appData.bad_handwriting_types.find(t => t.id === geometricType);
            if (!selected) { // Fallback if ID not found (shouldn't happen if IDs are consistent)
                const badTypes = appData.bad_handwriting_types;
                selected = badTypes[Math.floor(Math.random() * badTypes.length)];
            }
            selected = { ...selected, feedback_detail: selected.feedback_detail + ` (${detectionDetail})` };
        } else {
            // Random bad feedback (excluding geometric ones if we want, or just random)
            // Let's exclude 1 & 2 for random to avoid confusion if we didn't detect them
            const nonGeometricBad = appData.bad_handwriting_types.filter(t => t.id !== 1 && t.id !== 2);
            const randomIndex = Math.floor(Math.random() * nonGeometricBad.length);
            selected = nonGeometricBad[randomIndex];
        }
    }

    Object.assign(resultData, { ...selected, is_good: false, lowConfWords: lowConfWords });
}

return resultData;
}



function drawOverlaySimulation(diagnosis, sourceImage) {
    const canvas = document.getElementById('canvas-output');
    const ctx = canvas.getContext('2d');

    // 0. Draw the captured image first (Reset canvas)
    if (sourceImage) {
        canvas.width = sourceImage.width;
        canvas.height = sourceImage.height;
        ctx.drawImage(sourceImage, 0, 0);
    }

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
            // NOTE: Per user feedback, we will KEEP this but maybe simplify it.
            // But since we have Side-by-Side now, we can make this overlay purely for "Structure" checking.

            // Let's keep it but make it very subtle so it doesn't clutter.
            // Or strictly follow user request: "Main screen shows check boxes, cards show comparison."
            // So we will NOT draw the text overlay on the main canvas to avoid "messiness",
            // as the comparison cards will show the "Correct" text.

            /*
            ctx.save();
            ctx.font = "bold 40px 'Nanum Myeongjo'";
            ctx.fillStyle = "rgba(0, 0, 255, 0.5)"; // Blue 50%
            ctx.fillText(word.text, x, y);
            ctx.restore();
            */
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

        // Stamp Text (Simplifying stamp to avoid clutter)
        ctx.font = "bold 40px 'Nanum Myeongjo'";
        ctx.fillStyle = "#FF5722";
        ctx.fillText("참 잘했어요", 0, 0);
    } else {
        // No heavy overlays for Bad, just the boxes drawn above
    }

    ctx.restore();
}

function renderComparisonCards(diagnosis, sourceCanvas) {
    const listContainer = document.getElementById('comparison-list');
    listContainer.innerHTML = ''; // Clear previous

    if (!diagnosis.allWords || diagnosis.allWords.length === 0) return;

    // sourceCanvas is passed in now (the clean original image)
    // Fallback just in case
    if (!sourceCanvas) sourceCanvas = document.getElementById('canvas-output');

    diagnosis.allWords.forEach(word => {
        const conf = word.confidence;
        let cardClass = 'bad';
        if (conf >= 80) cardClass = 'good';
        else if (conf >= 60) cardClass = 'okay';

        // 1. Crop Image
        // Optimization: Use more padding (10px) to show surrounding context and prevent tight cuts
        const padding = 10;
        const x = Math.max(0, word.bbox.x0 - padding);
        const y = Math.max(0, word.bbox.y0 - padding);
        const w = Math.min(sourceCanvas.width - x, (word.bbox.x1 - word.bbox.x0) + (padding * 2));
        const h = Math.min(sourceCanvas.height - y, (word.bbox.y1 - word.bbox.y0) + (padding * 2));

        // Create tmp canvas to put crop
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = w;
        cropCanvas.height = h;
        const cropCtx = cropCanvas.getContext('2d');

        // Draw from main canvas (which currently has Red boxes on it... ideally we crop from 'tempCanvas' but that scope is lost.
        // It's actually better to crop from the CLEAN image. 
        // We reused 'tempCanvas' in processImage, let's assume 'videoPreview' frame is still there? 
        // Actually, 'canvas-output' has the *processed* image. 
        // We'll crop from 'canvas-output' but we drew boxes on it already... 
        // Ah, 'drawOverlaySimulation' is called AFTER we get here? No, before.
        // We should fix the order or keep a clean copy.
        // For now, let's just accept the boxes on the crop, it actually helps context.

        cropCtx.drawImage(sourceCanvas, x, y, w, h, 0, 0, w, h);
        const imgUrl = cropCanvas.toDataURL();

        // 2. Create Card HTML
        const card = document.createElement('div');
        card.className = `comparison-card ${cardClass}`;
        card.innerHTML = `
            <div class="comp-col">
                <div class="comp-header">내가 쓴 글씨</div>
                <img src="${imgUrl}" class="handwriting-crop">
            </div>
            <div class="comp-divider"></div>
            <div class="comp-col">
                 <div class="comp-header">바른 글씨</div>
                 <div class="correct-text">${word.text}</div>
            </div>
        `;
        listContainer.appendChild(card);
    });
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
