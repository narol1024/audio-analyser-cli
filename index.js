const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const clc = require('cli-color');
const defaultValue = require('./defaultValue');
const isPowerOfTwo = (value) => {
  return ( value & ( value - 1 ) ) === 0 && value !== 0;
};

module.exports = (args) => {
  return new Promise(async (resolve) => {
    const CONSTANTS = {
      'FILE_PATH': args.file,
      'OUTPUT_PATH': args.output || defaultValue.OUTPUT_PATH,
      'OUTPUT_TYPE': args.outputType || defaultValue.OUTPUT_TYPE,
      'FFT_SIZE': args.fftsize < 32 ? 32 : args.fftsize || defaultValue.FFT_SIZE,
      'INTERVAL_TIME': args.intervalTime || defaultValue.INTERVAL_TIME,
      'DATA_TYPE': args.dataType || defaultValue.DATA_TYPE,
      'DATA_LENGTH': args.dataLength || defaultValue.DATA_LENGTH,
    };
    if (!CONSTANTS.FILE_PATH) {
      throw new Error('Please assign the path of audio file.');
    }
    
    if (CONSTANTS.FFT_SIZE < 32) {
      console.warn(clc.red('Warning: The fftsize must be greater than or equal to 32, It has been set to 32.'));
    }
    
    if (!isPowerOfTwo(CONSTANTS.FFT_SIZE)) {
      throw new Error('The fftsize is not power of two.');
    }

    const browser = await puppeteer.launch({
      ignoreDefaultArgs: ['--mute-audio'],
    });
    const page = await browser.newPage();
    page.on('console', msg => console.log(msg.text()));
    await page.exposeFunction('getConstant', (name) => {
      return new Promise((resolve) => {
        resolve(CONSTANTS[name]);
      });
    });
    await page.exposeFunction('loadFile', () => {
      return new Promise((resolve) => {
        fs.readFile(path.resolve(CONSTANTS.FILE_PATH), 'base64', (err, data) => {
          if (err) throw err;
          resolve(data);
        });
      });
    });
    await page.exposeFunction('writeFile', (data) => {
      return new Promise((resolve) => {
        const filePath = path.resolve(CONSTANTS.FILE_PATH);
        const outputPath = path.resolve(CONSTANTS.OUTPUT_PATH);
        const ext = CONSTANTS.OUTPUT_TYPE === 'json' ? '.json' : '.txt';
        const outFileName = outputPath + '/' + path.basename(filePath, path.extname(filePath)) + ext;
        const outputData = CONSTANTS.OUTPUT_TYPE === 'json' ? JSON.stringify(data) : data;
        fs.writeFile(path.resolve(outFileName), outputData, 'utf8', (err) => {
          if (err) throw err;
          resolve();
        });
      });
    });
    await page.exposeFunction('close', () => {
      resolve();
      browser.close();
    });
    await page.evaluate(() => {
      const base64ToBuffer = (base64) => {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      };
      const decode = (audioFile) => {
        return new Promise((resolve) => {
          const audioContext = new AudioContext();
          audioContext.decodeAudioData(base64ToBuffer(audioFile), (buffer) => {
            resolve(buffer)
          }, (err) => {
            throw err;
          });
        });
      };
      const playAudio = async () => {
        const audioFile = await loadFile();
        const audioBuffer = await decode(audioFile);
        const offlineContext = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
        const analyserNode = offlineContext.createAnalyser();
        const scriptProcessorNode = offlineContext.createScriptProcessor();
        const bufferSource = offlineContext.createBufferSource();
        const outputType = await getConstant('OUTPUT_TYPE');
        const fftSize = await getConstant('FFT_SIZE');
        const intervalTime = await getConstant('INTERVAL_TIME');
        const dataType = await getConstant('DATA_TYPE');
        const dataLength = await getConstant('DATA_LENGTH');
        let analyseData = outputType === 'json' ? {} : '';
        const analyserNodeAction = {
          'floatFrequency': () => {
            const dataArray = new Float32Array(dataLength);
            analyserNode.getFloatFrequencyData(dataArray);
            return dataArray;
          },
          'byteFrequency': () => {
            const dataArray = new Uint8Array(dataLength);
            analyserNode.getByteFrequencyData(dataArray);
            return dataArray;
          },
          'floatTimeDomain': () => {
            const dataArray = new Float32Array(dataLength);
            analyserNode.getFloatTimeDomainData(dataArray);
            return dataArray;
          },
          'byteTimeDomain': () => {
            const dataArray = new Uint8Array(dataLength);
            analyserNode.getByteTimeDomainData(dataArray);
            return dataArray;
          },
        };
        analyserNode.fftSize = fftSize;
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(analyserNode);
        analyserNode.connect(scriptProcessorNode);
        scriptProcessorNode.connect(offlineContext.destination);
        scriptProcessorNode.onaudioprocess = () => {
          const currentTime = Math.floor(offlineContext.currentTime * 100);
          const analyse = () => {
            const dataArray = analyserNodeAction[dataType]();
            if (outputType === 'json') {
              analyseData[(currentTime / 100).toFixed(2)] = dataArray.toString();
            } else {
              analyseData += dataArray.join(',') + '\n';
            }
          };
          if (intervalTime === 0) {
            analyse();
          } else if(currentTime % (intervalTime * 100) === 0) {
            analyse();
          }
        };
        offlineContext.oncomplete = async () => {
          await writeFile(analyseData);
          console.log('\033[42;30m DONE \033[40;32m 👌  Complete the analysis!');
          close();
        };
        bufferSource.start();
        offlineContext.startRendering();
      };
      playAudio();
    });
  });
};
