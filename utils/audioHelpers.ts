export const extractWavFromVideo = async (videoFile: File): Promise<void> => {
  try {
    const arrayBuffer = await videoFile.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    // WAV Encoder
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: any) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: any) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    setUint32(0x46464952); // "RIFF"
    setUint32(36 + audioBuffer.length * numOfChan * 2); 
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " 
    setUint32(16); 
    setUint16(1); // PCM 
    setUint16(numOfChan);
    setUint32(audioBuffer.sampleRate);
    setUint32(audioBuffer.sampleRate * 2 * numOfChan); 
    setUint16(numOfChan * 2); 
    setUint16(16); 
    setUint32(0x61746164); // "data" 
    setUint32(audioBuffer.length * numOfChan * 2); 

    for(i = 0; i < audioBuffer.numberOfChannels; i++)
      channels.push(audioBuffer.getChannelData(i));

    while(pos < audioBuffer.length) {
      for(i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][pos])); 
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; 
        view.setInt16(44 + offset, sample, true);
        offset += 2;
      }
      pos++;
    }

    const blob = new Blob([buffer], {type: "audio/wav"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted_audio_${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
    
  } catch (e) {
    console.error("Audio extraction error:", e);
    throw new Error("Failed to extract audio. Browser may not support decoding this video format.");
  }
};