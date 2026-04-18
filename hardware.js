var activeProtocol = 'none'; 
var port, writer; 
var bleDevice, bleServer, bleTxChar;
const BLE_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'; 
const BLE_TX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';      
var websocket; 

async function sendCommand(data) {
    if (!data) return;
    log(`Payload [${data}] -> Routing via ${activeProtocol.toUpperCase()}`);
    try {
        if (activeProtocol === 'serial' && writer) {
            const encoder = new TextEncoder();
            await writer.write(encoder.encode(data + '\n'));
        } else if (activeProtocol === 'ble' && bleTxChar) {
            const encoder = new TextEncoder();
            await bleTxChar.writeValue(encoder.encode(data + '\n'));
        } else if (activeProtocol === 'wifi' && websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(data + '\n');
        } else {
            log(`<span style="color:var(--warning)">Warning: Payload dropped. Interface disconnected.</span>`);
        }
    } catch (e) {
        log(`<span style="color:var(--danger)">Transmission Failure: ${e.message}</span>`);
    }
}

async function disconnectAll(skipUIReset) {
    log("Terminating all active interfaces...");
    if (writer) { writer.releaseLock(); writer = null; }
    if (port) { await port.close(); port = null; }
    if (bleDevice && bleDevice.gatt.connected) { bleDevice.gatt.disconnect(); }
    bleTxChar = null;
    if (websocket && websocket.readyState !== WebSocket.CLOSED) { websocket.close(); }
    
    activeProtocol = 'none';
    updateStatusUI('none', 'Device Connection: Disconnected', false);
    
    if (skipUIReset !== false) {
        document.getElementById('device-select').value = 'none';
        document.getElementById('baud-rate-container').style.visibility = 'hidden';
        document.getElementById('baud-rate').value = 'none';
    }
    log("Interfaces safely terminated.");
}

async function connectSerial() {
    await disconnectAll(false);
    if (!("serial" in navigator)) {
        document.getElementById('device-select').value = 'none';
        document.getElementById('baud-rate-container').style.visibility = 'hidden';
        return alert("Web Serial API unsupported.");
    }
    try {
        const baudRate = parseInt(document.getElementById('baud-rate').value, 10);
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: baudRate });
        writer = port.writable.getWriter();
        
        activeProtocol = 'serial';
        updateStatusUI('serial', `USB (COM): Active [${baudRate}]`, true);
        log(`Universal Serial Bus initialized @ ${baudRate} baud.`);
        port.addEventListener('disconnect', disconnectAll);
    } catch (e) {
        document.getElementById('device-select').value = 'none';
        document.getElementById('baud-rate-container').style.visibility = 'hidden';
        document.getElementById('baud-rate').value = 'none';
        log(`Serial Exception: ${e.message}`);
        if (port) { port = null; }
    }
}

async function connectBLE() {
    await disconnectAll(false);
    if (!("bluetooth" in navigator)) {
        document.getElementById('device-select').value = 'none';
        return alert("Web Bluetooth API unsupported.");
    }
    try {
        log("Scanning for BLE GATT Servers...");
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ services: [BLE_SERVICE_UUID] }],
            optionalServices: [BLE_SERVICE_UUID]
        });
        log(`Connecting to BLE device: ${bleDevice.name || "Unknown Device"}`);
        bleDevice.addEventListener('gattserverdisconnected', disconnectAll);
        
        bleServer = await bleDevice.gatt.connect();
        const service = await bleServer.getPrimaryService(BLE_SERVICE_UUID);
        bleTxChar = await service.getCharacteristic(BLE_TX_UUID);
        
        activeProtocol = 'ble';
        updateStatusUI('ble', 'BLE: Active', true);
        log("BLE tunnel established.");
    } catch (e) {
        document.getElementById('device-select').value = 'none';
        log(`BLE Exception: ${e.message}`);
    }
}

async function connectWiFi(ip) {
    await disconnectAll(false);
    ip = ip.trim();
    if (!ip) return alert("Target IPv4 Address required.");
    const wsUrl = `ws://${ip}:81/`;
    log(`Establishing WebSocket handshake with ${wsUrl}...`);
    updateStatusUI('wifi', 'Wi-Fi: Synchronizing...', false);

    websocket = new WebSocket(wsUrl);
    websocket.onopen = function() {
        activeProtocol = 'wifi';
        updateStatusUI('wifi', 'Wi-Fi: Active', true);
        log("WebSocket tunnel established.");
    };
    websocket.onerror = function() {
        document.getElementById('device-select').value = 'none';
        log("Wi-Fi Exception: Handshake failed. Check IP.");
        disconnectAll();
    };
    websocket.onclose = function() { if (activeProtocol === 'wifi') disconnectAll(); };
}