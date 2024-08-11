// Initialize ZXing QR code scanner
let codeReader;

function scanQRCode() {
    if (!codeReader) {
        codeReader = new ZXing.BrowserQRCodeReader();
    }
    codeReader.decodeFromInputVideoDevice(undefined, 'video')
        .then(result => {
            document.getElementById('scan-result').textContent = `QR Code: ${result.text}`;
        })
        .catch(err => {
            console.error('Error scanning QR code: ', err);
            document.getElementById('scan-result').textContent = 'Error scanning QR code.';
        });
}

// Take Photo using Camera
function takePhoto() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const scanResultDiv = document.getElementById('scan-result');

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.style.display = 'block';
            video.srcObject = stream;

            // Take snapshot after 3 seconds
            setTimeout(() => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                stream.getTracks().forEach(track => track.stop());
                video.style.display = 'none';

                const imageData = canvas.toDataURL('image/png');
                processImage(imageData);
            }, 3000);
        })
        .catch(err => {
            console.error('Error accessing camera: ', err);
            alert('Unable to access camera. Please check your permissions.');
        });
}

// Process Image with Tesseract.js
function processImage(image) {
    Tesseract.recognize(image, 'eng')
        .then(({ data: { text } }) => {
            const scanResultDiv = document.getElementById('scan-result');
            scanResultDiv.textContent = `Scanned Text:\n${text}`;
            const nutritionalInfo = parseNutritionalInfo(text);
            const evaluation = evaluateNutritionalInfo(nutritionalInfo);
            scanResultDiv.innerHTML += `<br><br>Evaluation:\n${evaluation}`;
        })
        .catch(err => {
            console.error('Error processing image: ', err);
            document.getElementById('scan-result').textContent = 'Error processing image.';
        });
}

// Handle File Upload
document.getElementById('file-input').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            processImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }
});

// Parse Nutritional Information
function parseNutritionalInfo(text) {
    const nutritionalInfo = {};

    const regexPatterns = {
        calories: /Calories.*?(\d+)/i,
        totalFat: /Total Fat.*?(\d+)g/i,
        saturatedFat: /Saturated Fat.*?(\d+)g/i,
        transFat: /Trans Fat.*?(\d+)g/i,
        cholesterol: /Cholesterol.*?(\d+)mg/i,
        sodium: /Sodium.*?(\d+)mg/i,
        carbohydrates: /Total Carbohydrate.*?(\d+)g/i,
        dietaryFiber: /Dietary Fiber.*?(\d+)g/i,
        sugars: /Total Sugars.*?(\d+)g/i,
        addedSugars: /Added Sugars.*?(\d+)g/i,
        protein: /Protein.*?(\d+)g/i,
    };

    for (const [key, regex] of Object.entries(regexPatterns)) {
        const match = text.match(regex);
        nutritionalInfo[key] = match ? parseInt(match[1]) : 'Not found';
    }

    return nutritionalInfo;
}

// Evaluate Nutritional Information
function evaluateNutritionalInfo(info) {
    let evaluation = '';

    if (info.calories !== 'Not found' && info.calories > 200) {
        evaluation += 'This product has a high calorie content. ';
    }

    if (info.totalFat !== 'Not found' && info.totalFat > 10) {
        evaluation += 'This product is high in fat. ';
    }

    if (info.sodium !== 'Not found' && info.sodium > 150) {
        evaluation += 'This product has a high sodium content. ';
    }

    if (info.addedSugars !== 'Not found' && info.addedSugars > 10) {
        evaluation += 'This product contains a lot of added sugars. ';
    }

    if (evaluation === '') {
        evaluation = 'This product appears to be within acceptable health guidelines.';
    }

    return evaluation;
}
