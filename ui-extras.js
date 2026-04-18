const extraUI = `
    <div class="fab-container">
        <div id="fab-menu" class="fab-menu">
            <span style="font-size: 0.8em; color: #aaa; margin-bottom: 5px; padding-left: 5px;">Download Example Code Files</span>
            <button onclick="downloadCode('usb')">USB / BLE Code</button>
            <button onclick="downloadCode('wifi')">Wi-Fi (ESP32) Code</button>
        </div>
        <button class="fab-btn" onclick="toggleFab()" title="Example Code">&lt;/&gt;</button>
    </div>
    
    <div class="footer-area">
        <button class="guide-btn" onclick="openGuide()" title="User Guide">?</button>
        <div class="watermark"> Visino by Akash Kumar </div>
    </div>

    <div id="guide-modal" class="modal-overlay">
        <div class="modal-content">
            <span class="close-btn" onclick="closeGuide()">&times;</span>
            <h2 style="color: var(--accent); margin-bottom: 10px;">VISINO User Guide</h2>
            <p style="color: #aaa; font-style: italic; font-size: 0.9em; border-bottom: 1px solid var(--surface); padding-bottom: 10px; margin-bottom: 20px;">
                Learn how to connect your AI Vision model directly to your hardware devices in just a few simple steps.
            </p>
            <div class="guide-text">
                <h4>Step 1: Train Your AI Model</h4>
                <p>Before using VISINO, you need an AI model. Head over to <b>Google Teachable Machine</b>, create a new "Image Project," and record different classes (e.g., "Hand Open", "Fist"). Train your model, click "Export Model," and copy the public URL link provided.</p>
                <h4>Step 2: Load Your Vision Engine</h4>
                <p>Paste the Teachable Machine link into the <b>"Vision Model URL"</b> box at the top of this page. Click <b>Load Model</b>. Allow camera permissions if prompted.</p>
                <h4>Step 3: Connect Your Hardware</h4>
                <p>In the right panel, select how your hardware is communicating. You can choose USB (COM), BLE (Bluetooth), or Wi-Fi (ESP32).</p>
                <h4>Step 4: Map Your Commands</h4>
                <p>Look at the <b>"Command Mapping"</b> section. In the text box next to your trained class, type the exact command you want to send to your hardware (e.g., type "ON").</p>
                <h4>Step 5: Adjust Settings & Run!</h4>
                <p>Make sure the Camera toggle switch is set to <b>ON</b>. As you perform gestures, VISINO sends your mapped command directly to your device!</p>
                <h4>Troubleshooting</h4>
                <p>• If hardware isn't receiving data, verify your Baud Rate matches your Arduino code.<br>
                • Use the <b>&lt;/&gt;</b> button in the bottom right to download example code.</p>
            </div>
        </div>
    </div>
`;

document.body.insertAdjacentHTML('beforeend', extraUI);

var logConsole = document.getElementById('console');
var mappingContainer = document.getElementById('mapping-container');

function log(message) {
    logConsole.innerHTML += `<span style="color:#8be9fd">></span> ${message}<br>`;
    logConsole.scrollTop = logConsole.scrollHeight;
}

function updateStatusUI(protocol, statusText, isConnected) {
    document.getElementById('main-status-text').innerText = statusText;
    const dot = document.getElementById('main-status-dot');
    const select = document.getElementById('device-select');
    const baudSelect = document.getElementById('baud-rate');
    const discBtn = document.getElementById('btn-disconnect');
    
    if (isConnected) {
        dot.classList.add('connected');
        select.disabled = true;
        baudSelect.disabled = true;
        discBtn.disabled = false;
    } else {
        dot.classList.remove('connected');
        select.disabled = false;
        baudSelect.disabled = false;
        discBtn.disabled = true;
    }
}

function handleDeviceSelect(selectElement) {
    const mode = selectElement.value;
    const baudContainer = document.getElementById('baud-rate-container');
    const baudSelect = document.getElementById('baud-rate');

    if (mode === 'none') { baudContainer.style.visibility = 'hidden'; return; }
    if (mode === 'serial') {
        baudContainer.style.visibility = 'visible';
        baudSelect.value = 'none'; 
    } else if (mode === 'ble') {
        baudContainer.style.visibility = 'hidden';
        connectBLE();
    } else if (mode === 'wifi') {
        baudContainer.style.visibility = 'hidden';
        const ip = prompt("Enter Wi-Fi IP Address (e.g., 192.168.1.50):");
        if (ip) connectWiFi(ip);
        else selectElement.value = 'none'; 
    }
}

function handleBaudSelect(selectElement) {
    if (selectElement.value !== 'none') connectSerial();
}

function toggleFab() { document.getElementById('fab-menu').classList.toggle('show'); }

function downloadCode(type) {
    let codeString = ""; let fileName = "";
    if (type === 'usb') {
        fileName = "AI_USB_Serial.ino";
        codeString = `void setup() {\n  Serial.begin(115200);\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  if (Serial.available() > 0) {\n    String data = Serial.readStringUntil('\\n');\n    data.trim();\n    if (data == "ON") digitalWrite(13, HIGH);\n    if (data == "OFF") digitalWrite(13, LOW);\n  }\n}`;
    } else {
        fileName = "AI_WiFi_ESP32.ino";
        codeString = `// Requires WebSocketsServer library\n#include <WiFi.h>\n#include <WebSocketsServer.h>\n\nWebSocketsServer webSocket = WebSocketsServer(81);\n\nvoid setup() {\n  Serial.begin(115200);\n  WiFi.softAP("AI_Controller", "12345678");\n  webSocket.begin();\n  webSocket.onEvent([](uint8_t num, WStype_t type, uint8_t * p, size_t l){ \n    if(type == WStype_TEXT) Serial.printf("Get: %s\\n", p);\n  });\n}\n\nvoid loop() { webSocket.loop(); }`;
    }
    const blob = new Blob([codeString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = fileName;
    a.click(); URL.revokeObjectURL(url); toggleFab();
}

function openGuide() { document.getElementById('guide-modal').style.display = 'flex'; }
function closeGuide() { document.getElementById('guide-modal').style.display = 'none'; }
window.onclick = function(event) {
    if (event.target == document.getElementById('guide-modal')) closeGuide();
}