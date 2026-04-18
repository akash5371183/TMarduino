var model, webcam, maxPredictions;
var lastCommandTime = 0;
var lastSentCommand = null;
var isCameraOn = false;

async function initModel() {
    const URL = document.getElementById('model-url').value;
    if (!URL) return alert("System requires a valid Teachable Machine URL.");
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    try {
        log("Pulling neural network weights...");
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        log(`Weights loaded. Classes detected: ${maxPredictions}.`);

        webcam = new tmImage.Webcam(400, 300, true); 
        await webcam.setup(); 
        await webcam.play();
        isCameraOn = true;
        window.requestAnimationFrame(loop);

        document.getElementById("webcam-container").innerHTML = "";
        document.getElementById("webcam-container").appendChild(webcam.canvas);
        
        document.getElementById('cam-toggle-container').style.display = 'flex';
        document.getElementById('cam-toggle-checkbox').checked = true;
        document.getElementById('webcam-offline-overlay').style.display = 'none';

        generateMappingUI(model.getClassLabels());
    } catch (e) {
        log(`<span style="color:var(--danger)">Exception during initialization: ${e.message}</span>`);
    }
}

async function loop() {
    if (!isCameraOn) return;
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

async function toggleCamera() {
    if (!model) return; 
    const checkbox = document.getElementById('cam-toggle-checkbox');
    const overlay = document.getElementById('webcam-offline-overlay');
    
    if (!checkbox.checked) {
        if (webcam) webcam.stop(); 
        isCameraOn = false;
        overlay.style.display = 'flex';
        log(" Camera turned OFF.");
    } else {
        try {
            document.getElementById("webcam-container").innerHTML = "<span>Starting...</span>";
            webcam = new tmImage.Webcam(400, 300, true);
            await webcam.setup(); 
            await webcam.play();
            
            document.getElementById("webcam-container").innerHTML = "";
            document.getElementById("webcam-container").appendChild(webcam.canvas);
            
            isCameraOn = true;
            overlay.style.display = 'none';
            log(" Camera turned ON.");
            window.requestAnimationFrame(loop);
        } catch (e) {
            log(`<span style="color:var(--danger)">Camera error: ${e.message}</span>`);
            checkbox.checked = false;
            document.getElementById("webcam-container").innerHTML = "<span>Offline</span>";
            overlay.style.display = 'flex';
        }
    }
}

async function predict() {
    if (!model || !isCameraOn) return;
    const predictions = await model.predict(webcam.canvas);
    
    const threshold = parseFloat(document.getElementById('threshold').value);
    const debounceMs = parseInt(document.getElementById('debounce').value);
    const now = Date.now();

    let highestConfidence = 0;
    let topClass = null;

    for (let i = 0; i < maxPredictions; i++) {
        if (predictions[i].probability > highestConfidence) {
            highestConfidence = predictions[i].probability;
            topClass = predictions[i].className;
        }
    }

    if (highestConfidence >= threshold) {
        const commandInput = document.getElementById(`map-${topClass}`);
        if (commandInput && commandInput.value) {
            const command = commandInput.value;
            if (command !== lastSentCommand || (now - lastCommandTime) > debounceMs) {
                sendCommand(command); 
                lastCommandTime = now;
                lastSentCommand = command;
            }
        }
    }
}

function generateMappingUI(classes) {
    mappingContainer.innerHTML = "";
    classes.forEach(className => {
        const row = document.createElement('div');
        row.className = 'mapping-row';
        row.innerHTML = `
            <span><strong style="color:var(--accent)">${className}</strong></span>
            <input type="text" id="map-${className}" placeholder="Payload" maxlength="10">
            <button onclick="sendCommand(document.getElementById('map-${className}').value)">Inject</button>
        `;
        mappingContainer.appendChild(row);
    });
}