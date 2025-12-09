// Camera Flip-Dot Display with Drone Synthesizer (Optimized Canvas Version)
class CameraFlipDotDisplay {
    constructor() {
        this.cols = 120;
        this.rows = 120;
        this.dotSize = 6;
        this.dotGap = 1;

        // Canvas elements
        this.displayCanvas = document.getElementById('flipDotDisplay');
        this.displayCtx = this.displayCanvas.getContext('2d');
        this.video = document.getElementById('webcam');
        this.processingCanvas = document.getElementById('processingCanvas');
        this.processingCtx = this.processingCanvas.getContext('2d');

        // State tracking
        this.currentState = new Uint8Array(this.cols * this.rows);
        this.previousState = new Uint8Array(this.cols * this.rows);

        // Camera settings
        this.processingCanvas.width = this.cols;
        this.processingCanvas.height = this.rows;
        this.stream = null;
        this.cameraActive = false;
        this.mirrorCamera = true;
        this.animationFrameId = null;

        // Image processing settings
        this.threshold = 128;
        this.brightness = 0;
        this.contrast = 100;

        // Synthesizer settings
        this.audioContext = null;
        this.soundEnabled = true;
        this.masterGain = null;
        this.volume = 0.2;
        this.activeOscillators = new Map();
        this.maxOscillators = 30; // Limit simultaneous sounds for performance

        this.init();
    }

    init() {
        this.updateCanvasSize();
        this.clearDisplay();
        this.initAudio();
    }

    updateCanvasSize() {
        const totalWidth = this.cols * (this.dotSize + this.dotGap);
        const totalHeight = this.rows * (this.dotSize + this.dotGap);
        this.displayCanvas.width = totalWidth;
        this.displayCanvas.height = totalHeight;
    }

    initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.audioContext.destination);
        }
    }

    clearDisplay() {
        this.displayCtx.fillStyle = '#0a0a0a';
        this.displayCtx.fillRect(0, 0, this.displayCanvas.width, this.displayCanvas.height);
    }

    // Drone synthesizer - vertical position maps to pitch
    playDroneSound(row, col) {
        if (!this.soundEnabled || !this.audioContext) return;
        if (this.activeOscillators.size >= this.maxOscillators) return;

        const key = `${row}-${col}`;
        if (this.activeOscillators.has(key)) return;

        // Map row to frequency (inverted: row 0 = high pitch, row 119 = low pitch)
        const minFreq = 80;
        const maxFreq = 600;
        const normalizedRow = 1 - (row / this.rows);
        const frequency = minFreq + (maxFreq - minFreq) * normalizedRow;

        // Create oscillator
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();

        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        oscillator.detune.value = (Math.random() - 0.5) * 15;

        filterNode.type = 'lowpass';
        filterNode.frequency.value = frequency * 2.5;
        filterNode.Q.value = 1;

        const now = this.audioContext.currentTime;
        const duration = 0.25;
        const attackTime = 0.04;
        const releaseTime = 0.15;
        const peakGain = 0.012;

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(peakGain, now + attackTime);
        gainNode.gain.setValueAtTime(peakGain, now + duration - releaseTime);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);

        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(now);
        oscillator.stop(now + duration);

        this.activeOscillators.set(key, { oscillator, gainNode });

        oscillator.onended = () => {
            this.activeOscillators.delete(key);
        };
    }

    // Render dots using canvas
    renderDots() {
        this.clearDisplay();

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const index = row * this.cols + col;
                const state = this.currentState[index];

                const x = col * (this.dotSize + this.dotGap);
                const y = row * (this.dotSize + this.dotGap);

                // Draw dot
                this.displayCtx.fillStyle = state ? '#FFD700' : '#0a0a0a';
                this.displayCtx.beginPath();
                this.displayCtx.arc(
                    x + this.dotSize / 2,
                    y + this.dotSize / 2,
                    this.dotSize / 2,
                    0,
                    Math.PI * 2
                );
                this.displayCtx.fill();

                // Check if state changed and trigger sound
                if (state && !this.previousState[index]) {
                    // Randomly trigger sound (not every dot, to avoid overload)
                    if (Math.random() > 0.85) {
                        this.playDroneSound(row, col);
                    }
                }
            }
        }

        // Update previous state
        this.previousState.set(this.currentState);
    }

    // Start camera capture
    async startCamera() {
        try {
            console.log('Requesting camera access...');
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 1280 },
                    facingMode: 'user'
                }
            });

            console.log('Camera access granted!');
            this.video.srcObject = this.stream;
            this.cameraActive = true;

            document.getElementById('startCamera').disabled = true;

            this.video.onloadedmetadata = () => {
                console.log('Video metadata loaded, starting playback...');
                this.video.play();
                console.log('Starting frame processing...');
                this.startProcessing();
            };

        } catch (error) {
            console.error('Camera error:', error);
            alert('Could not access camera. Please check permissions. Error: ' + error.message);
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.cameraActive = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        document.getElementById('startCamera').disabled = false;
    }

    startProcessing() {
        const processLoop = () => {
            if (!this.cameraActive) return;

            this.processFrame();
            this.animationFrameId = requestAnimationFrame(processLoop);
        };

        processLoop();
    }

    processFrame() {
        if (!this.cameraActive || this.video.readyState < 2) {
            return;
        }

        // Draw video frame to processing canvas
        this.processingCtx.save();

        if (this.mirrorCamera) {
            this.processingCtx.scale(-1, 1);
            this.processingCtx.drawImage(
                this.video,
                -this.processingCanvas.width,
                0,
                this.processingCanvas.width,
                this.processingCanvas.height
            );
        } else {
            this.processingCtx.drawImage(
                this.video,
                0,
                0,
                this.processingCanvas.width,
                this.processingCanvas.height
            );
        }

        this.processingCtx.restore();

        // Get image data
        const imageData = this.processingCtx.getImageData(
            0,
            0,
            this.processingCanvas.width,
            this.processingCanvas.height
        );
        const data = imageData.data;

        // Process each pixel
        for (let i = 0; i < this.cols * this.rows; i++) {
            const pixelIndex = i * 4;

            // Convert to grayscale
            let gray = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;

            // Apply brightness
            gray += this.brightness;

            // Apply contrast
            gray = ((gray - 128) * (this.contrast / 100)) + 128;

            // Clamp
            gray = Math.max(0, Math.min(255, gray));

            // Threshold to binary
            this.currentState[i] = gray > this.threshold ? 1 : 0;
        }

        // Render the dots
        this.renderDots();
    }

    setThreshold(value) {
        this.threshold = parseInt(value);
    }

    setBrightness(value) {
        this.brightness = parseInt(value);
    }

    setContrast(value) {
        this.contrast = parseInt(value);
    }

    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
        if (enabled) {
            this.initAudio();
        }
    }

    setVolume(value) {
        this.volume = value / 100;
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
    }

    setMirror(enabled) {
        this.mirrorCamera = enabled;
        if (enabled) {
            this.video.classList.remove('no-mirror');
        } else {
            this.video.classList.add('no-mirror');
        }
    }

    setDotSize(value) {
        this.dotSize = parseInt(value);
        this.updateCanvasSize();
        this.renderDots();
    }
}

// Global instance
let display = new CameraFlipDotDisplay();

// Control functions
async function startCamera() {
    await display.startCamera();
}

function stopCamera() {
    display.stopCamera();
}

function updateThreshold(value) {
    display.setThreshold(value);
    document.getElementById('thresholdValue').textContent = value;
}

function updateBrightness(value) {
    display.setBrightness(value);
    document.getElementById('brightnessValue').textContent = value;
}

function updateContrast(value) {
    display.setContrast(value);
    document.getElementById('contrastValue').textContent = value;
}

function toggleSound(enabled) {
    display.setSoundEnabled(enabled);
}

function updateVolume(value) {
    display.setVolume(value);
    document.getElementById('volumeValue').textContent = value + '%';
}

function toggleMirror(enabled) {
    display.setMirror(enabled);
}

function updateDotSize(value) {
    display.setDotSize(value);
    document.getElementById('dotSizeValue').textContent = value + 'px';
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.body.requestFullscreen().catch(err => {
            console.log('Fullscreen failed:', err);
        });
        document.body.classList.add('fullscreen');
    } else {
        document.exitFullscreen();
        document.body.classList.remove('fullscreen');
    }
}

// Exit fullscreen
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        document.body.classList.remove('fullscreen');
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
    }
});

// Ready message
window.addEventListener('load', () => {
    console.log('Camera Flip-Dot Display Ready - Optimized Canvas Version');
    console.log('Click "Start Camera" to begin');
});
