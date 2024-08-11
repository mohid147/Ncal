let codeReader;
const cameraSelect = document.getElementById('camera-select');
const loadingSpinner = document.getElementById('loading'); // Get the loading spinner element

// Initialize ZXing scanner
function initializeScanner() {
    codeReader = new ZXing.BrowserQRCodeReader();
}

// Populate camera options
function populateCameraOptions() {
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            devices.forEach(device => {
                if (device.kind === 'videoinput') {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || 'Camera ' + (cameraSelect.options.length + 1);
                    cameraSelect.appendChild(option);
                }
            });
        })
        .catch(err => console.error('Error getting camera devices: ', err));
}

// Scan QR Code
function scanQRCode() {
    if (!codeReader) {
        initializeScanner();
    }
    loadingSpinner.style.display = 'block'; // Show loading spinner

    codeReader.decodeFromInputVideoDevice(undefined, 'video')
        .then(result => {
            document.getElementById('scan-result').textContent = `QR Code: ${result.text}`;
            loadingSpinner.style.display = 'none'; // Hide loading spinner
        })
        .catch(err => {
            console.error('Error scanning QR code: ', err);
            document.getElementById('scan-result').textContent = 'Error scanning QR code.';
            loadingSpinner.style.display = 'none'; // Hide loading spinner
        });
}

// Take Photo using Camera
function takePhoto() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const scanResultDiv = document.getElementById('scan-result');
    const selectedCamera = cameraSelect.value;

    if (!selectedCamera) {
        alert('Please select a camera.');
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: { deviceId: selectedCamera } })
        .then(stream => {
            video.style.display = 'block';
            video.srcObject = stream;
            video.play(); // Ensure video is playing

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
    loadingSpinner.style.display = 'block'; // Show loading spinner

    Tesseract.recognize(image, 'eng')
        .then(({ data: { text } }) => {
            const scanResultDiv = document.getElementById('scan-result');
            scanResultDiv.textContent = `Scanned Text:\n${text}`;
            const nutritionalInfo = parseNutritionalInfo(text);
            populateTable(nutritionalInfo);
            const evaluation = evaluateNutritionalInfo(nutritionalInfo);
            document.getElementById('evaluation').textContent = `Evaluation:\n${evaluation}`;
            loadingSpinner.style.display = 'none'; // Hide loading spinner
        })
        .catch(err => {
            console.error('Error processing image: ', err);
            document.getElementById('scan-result').textContent = 'Error processing image.';
            loadingSpinner.style.display = 'none'; // Hide loading spinner
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

// Populate Nutritional Information Table
function populateTable(info) {
    const tableBody = document.getElementById('result-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Clear existing rows

    for (const [key, value] of Object.entries(info)) {
        const row = tableBody.insertRow();
        const cell1 = row.insertCell(0);
        const cell2 = row.insertCell(1);
        cell1.textContent = capitalizeFirstLetter(key.replace(/([A-Z])/g, ' $1'));
        cell2.textContent = value;
    }
}

// Capitalize the first letter of each word
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Evaluate Nutritional Information
function evaluateNutritionalInfo(info) {
    let evaluation = '';

    if (info.calories !== 'Not found' && info.calories > 200) {
        evaluation += 'High calorie content. ';
    }

    if (info.totalFat !== 'Not found' && info.totalFat > 10) {
        evaluation += 'High fat content. ';
    }

    if (info.sodium !== 'Not found' && info.sodium > 150) {
        evaluation += 'High sodium content. ';
    }

    if (info.addedSugars !== 'Not found' && info.addedSugars > 10) {
        evaluation += 'High added sugars. ';
    }

    if (evaluation === '') {
        evaluation = 'This product appears to be within acceptable health guidelines.';
    }

    return evaluation;
}

// Initialize and populate camera options on page load
window.onload = function() {
    initializeScanner();
    populateCameraOptions();
};
