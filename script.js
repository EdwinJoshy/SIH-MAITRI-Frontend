document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const chatLog = document.getElementById('chat-log');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatMicButton = document.getElementById('mic-button');
    const inputArea = document.getElementById('input-area');
    const startStopButton = document.getElementById('start-stop-button');
    const videoFeed = document.getElementById('video-feed');
    const cameraPreview = document.getElementById('camera-preview');
    const previewVideo = document.getElementById('preview-video');
    const audioToggleCheckbox = document.getElementById('audio-toggle-checkbox');
    const cameraPreviewToggle = document.getElementById('camera-preview-toggle');
    const initialStateContainer = document.getElementById('initial-state-container');
    const audioVisualizer = document.getElementById('audio-visualizer');
    const cameraSelect = document.getElementById('camera-select');
    const micSelect = document.getElementById('mic-select');

    // --- State Variables ---
    let mediaStream = null;
    let previewStream = null;
    let monitorMediaRecorder; // Separate recorder for the monitor
    let videoChunks = [];
    let isMonitorRecording = false;
    let audioContext, analyser, dataArray, source, animationFrameId;
    let isChatRecording = false;

    // --- Chatbot Logic ---
    const addMessage = (content, sender) => {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('message', `${sender}-message`);

        if (sender === 'bot') {
            const avatar = document.createElement('div');
            avatar.classList.add('avatar');
            messageContainer.appendChild(avatar);
        }

        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        if (typeof content === 'string') {
            const p = document.createElement('p');
            p.textContent = content;
            messageContent.appendChild(p);
        } else {
            messageContent.appendChild(content); // Append element like a video
        }

        messageContainer.appendChild(messageContent);
        chatLog.appendChild(messageContainer);
        chatLog.scrollTop = chatLog.scrollHeight;
    };

    // --- ENHANCED: Hardcoded Responses with Dynamic Multi-Emotion Feedback ---
    const handleSendMessage = () => {
        const userText = userInput.value.trim();
        if (userText) {
            addMessage(userText, 'user');
            userInput.value = '';

            const lowerCaseText = userText.toLowerCase();

            const emotionData = {
                sad: {
                    keywords: ['sad', 'depressed', 'unhappy', 'down', 'crying', 'miserable', 'lonely'],
                    measure: "For sadness, acknowledging the feeling is a healthy first step. You could try some gentle self-care, like listening to calming music, or perhaps writing down your thoughts."
                },
                angry: {
                    keywords: ['angry', 'mad', 'furious', 'irritated', 'annoyed', 'pissed off', 'frustrated'],
                    measure: "To counter anger, it's helpful to find a healthy outlet. Taking a step back to breathe deeply, going for a short walk, or even listening to intense music can help process that energy."
                },
                surprised: {
                    keywords: ['surprised', 'shocked', 'amazed', 'wow', 'unbelievable', 'no way', 'startled'],
                    measure: "Surprise can be a lot to take in! Give yourself a moment to just sit with the feeling and let it settle. Acknowledging the unexpected helps in processing it."
                },
                fear: {
                    keywords: ['scared', 'afraid', 'fearful', 'terrified', 'anxious', 'worried', 'nervous'],
                    measure: "When feeling fear or anxiety, grounding techniques can be very effective. Try the 5-4-3-2-1 method: name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste."
                },
                happy: {
                    keywords: ['happy', 'excited', 'great', 'joyful', 'thrilled', 'elated', 'fantastic'],
                    measure: "It's wonderful that you're feeling happy! A great way to savor this feeling is to share it with someone or to take a moment to practice gratitude. Think of three things you're thankful for right now."
                },
                disgust: {
                    keywords: ['disgusted', 'gross', 'revolted', 'sickened', 'repulsed', 'awful'],
                    measure: "Disgust is a strong protective emotion. It can be helpful to create some distance from what's causing it. Shifting your focus to something pleasant, like a nice scent or a beautiful image, can help reset your state of mind."
                }
            };

            let detectedEmotions = [];
            for (const emotion in emotionData) {
                if (emotionData[emotion].keywords.some(keyword => lowerCaseText.includes(keyword))) {
                    detectedEmotions.push(emotion);
                }
            }

            let botResponse = "";

            if (detectedEmotions.length > 1) {
                const hasPositive = detectedEmotions.includes('happy') || detectedEmotions.includes('surprised');
                const hasNegative = detectedEmotions.some(e => ['sad', 'angry', 'fear', 'disgust'].includes(e));

                if (hasPositive && hasNegative) {
                    // DYNAMIC FEEDBACK FOR MIXED EMOTIONS (e.g., happy and sad)
                    botResponse = `It sounds like you're experiencing some conflicting feelings, like ${detectedEmotions.join(' and ')}. This is very common, and it's okay to feel a mix of things.\n\nA helpful technique for moments like this is 'mindful observation.' Instead of fighting the feelings, just acknowledge them. You can say to yourself, 'I notice I'm feeling happy about one thing, and also sad about another.' By observing without judgment, you give yourself space to understand this complex emotional state.`;

                } else {
                    // TAILORED FEEDBACK FOR MULTIPLE (SIMILAR) EMOTIONS
                    botResponse = `It sounds like you're dealing with a complex mix of feelings, including ${detectedEmotions.join(' and ')}. It's perfectly okay to feel multiple things at once. Let's address them.\n\n`;
                    botResponse += "Here are some individual suggestions that might help:\n";
                    detectedEmotions.forEach(emotion => {
                        botResponse += `\n- For feeling ${emotion}: ${emotionData[emotion].measure}`;
                    });
                }

            } else if (detectedEmotions.length === 1) {
                // INDIVIDUAL SOLUTION FOR A SINGLE EMOTION
                const emotion = detectedEmotions[0];
                botResponse = `It sounds like you're feeling ${emotion}. I'm here to listen.\n\nHere is a suggestion that might help:\n- ${emotionData[emotion].measure}`;

            } else if (lowerCaseText.includes('hello') || lowerCaseText.includes('hi')) {
                botResponse = "Hello there! It's good to hear from you. How are you feeling today?";
            } else {
                botResponse = "Thank you for sharing. Could you elaborate a bit more on that?";
            }

            setTimeout(() => addMessage(botResponse, 'bot'), 1000);
        }
    };

    // --- Audio-to-Text Logic (Web Speech API) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    if (SpeechRecognition) {
        // (Speech recognition logic is unchanged)
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onstart = () => { isChatRecording = true; chatMicButton.classList.add('recording'); inputArea.classList.add('listening'); userInput.placeholder = "Listening..."; };
        recognition.onend = () => { isChatRecording = false; chatMicButton.classList.remove('recording'); inputArea.classList.remove('listening'); userInput.placeholder = "Tell me how you feel or press the mic to talk"; };
        recognition.onerror = (event) => { console.error("Speech recognition error:", event.error); userInput.placeholder = "Sorry, I couldn't hear that."; };
        recognition.onresult = (event) => {
            let interimTranscript = '',
                finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) { finalTranscript += event.results[i][0].transcript; } else { interimTranscript += event.results[i][0].transcript; }
            }
            userInput.value = finalTranscript + interimTranscript;
        };
    } else {
        console.log("Speech Recognition not available.");
        chatMicButton.style.display = 'none';
    }

    const handleMicClick = () => {
        if (isChatRecording) { recognition.stop(); } else { recognition.start(); }
    };

    // --- Wellness Monitor Logic ---
    const getDevices = async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            cameraSelect.innerHTML = '';
            micSelect.innerHTML = '';
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            const audioDevices = devices.filter(d => d.kind === 'audioinput');
            if (videoDevices.length > 0) {
                videoDevices.forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.text = device.label || `Camera ${cameraSelect.length + 1}`;
                    cameraSelect.appendChild(option);
                });
            } else { cameraSelect.innerHTML = '<option>No cameras found</option>'; }
            if (audioDevices.length > 0) {
                audioDevices.forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.text = device.label || `Microphone ${micSelect.length + 1}`;
                    micSelect.appendChild(option);
                });
            } else { micSelect.innerHTML = '<option>No microphones found</option>'; }
        } catch (error) {
            console.error("Error getting devices:", error);
            alert("This application needs access to your camera and microphone to function.");
            startStopButton.disabled = true;
            startStopButton.innerHTML = "Permissions Denied";
        }
    };

    const startMonitorRecording = async () => {
        if (previewStream) {
            previewStream.getTracks().forEach(track => track.stop());
            previewStream = null;
        }

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: cameraSelect.value } }, audio: { deviceId: { exact: micSelect.value } } });
            isMonitorRecording = true;
            videoFeed.srcObject = mediaStream;
            videoFeed.classList.remove('hidden');
            initialStateContainer.classList.add('hidden');
            startStopButton.innerHTML = `<i class="fa-solid fa-stop"></i> Stop`;
            startStopButton.classList.add('stop-mode');

            videoChunks = [];
            monitorMediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm' });
            monitorMediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) videoChunks.push(event.data);
            };
            monitorMediaRecorder.onstop = () => {
                const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
                const videoUrl = URL.createObjectURL(videoBlob);
                const videoElement = document.createElement('video');
                videoElement.src = videoUrl;
                videoElement.controls = true;

                addMessage("Session recording received:", 'user');
                addMessage(videoElement, 'user');
                setTimeout(() => addMessage("Analyzing your session for emotional stress indicators...", 'bot'), 1500);
            };
            monitorMediaRecorder.start();

            setupAudioVisualizer();
        } catch (error) {
            console.error("Error starting recording:", error);
            alert("Could not start recording. Please check device permissions.");
        }
    };

    const stopMonitorRecording = () => {
        if (monitorMediaRecorder && monitorMediaRecorder.state === "recording") {
            monitorMediaRecorder.stop();
        }
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
        isMonitorRecording = false;

        videoFeed.classList.add('hidden');
        cameraPreview.classList.add('hidden');
        audioVisualizer.classList.add('hidden');
        initialStateContainer.classList.remove('hidden');

        startStopButton.innerHTML = `<i class="fa-solid fa-play"></i> Start`;
        startStopButton.classList.remove('stop-mode');
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };

    const togglePreview = async () => {
        if (previewStream) {
            previewStream.getTracks().forEach(track => track.stop());
            previewStream = null;
            cameraPreview.classList.add('hidden');
        } else {
            try {
                previewStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: cameraSelect.value } } });
                previewVideo.srcObject = previewStream;
                cameraPreview.classList.remove('hidden');
            } catch (error) {
                console.error("Error starting preview:", error);
                alert("Could not start preview.");
            }
        }
    };
    const updatePreview = async () => { if (previewStream) { await togglePreview(); await togglePreview(); } };

    const setupAudioVisualizer = () => {
        audioVisualizer.classList.remove('hidden');
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source = audioContext.createMediaStreamSource(mediaStream);
        source.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        visualize();
    };
    const visualize = () => {
        animationFrameId = requestAnimationFrame(visualize);
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        const bars = audioVisualizer.children;
        let sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length;
        for (let i = 0; i < bars.length; i++) {
            const height = (dataArray[i * 5] / 255) * 50 * (avg / 50);
            bars[i].style.height = `${Math.max(5, height)}px`;
        }
    };

    // --- Event Listeners ---
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keydown', (e) => e.key === 'Enter' && handleSendMessage());
    chatMicButton.addEventListener('click', handleMicClick);
    startStopButton.addEventListener('click', () => { isMonitorRecording ? stopMonitorRecording() : startMonitorRecording(); });
    cameraPreviewToggle.addEventListener('click', togglePreview);
    cameraSelect.addEventListener('change', updatePreview);
    audioToggleCheckbox.addEventListener('change', () => { if (mediaStream) mediaStream.getAudioTracks()[0].enabled = audioToggleCheckbox.checked; });

    // --- Initializer ---
    getDevices();
});

