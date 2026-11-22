// Taktgeber für den Host: Worker-Timer werden in Hintergrundfenstern nicht ausgebremst.
setInterval(() => postMessage(0), 50);
