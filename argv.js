const yargs = require('yargs');
const defaultValue = require('./defaultValue');

module.exports = yargs
  .option('file', {
    type: 'string',
    describe: 'The path of audio file',
    alias: 'f',
  })
  .option('output', {
    type: 'string',
    describe: 'The output path',
    default: defaultValue.OUTPUT_PATH,
    alias: 'o',
  })
  .option('fftsize', {
    type: 'number',
    default: defaultValue.FFT_SIZE,
    alias: 'fs',
  })
  .option('intervalTime', {
    type: 'number',
    default: defaultValue.INTERVAL_TIME,
    describe: 'The interval time of analyse audio',
    alias: 'it',
  })
  .option('outputType', {
    type: 'string',
    default: defaultValue.OUTPUT_TYPE,
    choices: ['txt', 'json'],
    describe: 'The type of output file, supoort json and txt.',
    alias: 'ot',
  })
  .option('dataType', {
    type: 'string',
    default: defaultValue.DATA_TYPE,
    choices: ['floatFrequency', 'byteFrequency', 'floatTimeDomain', 'byteTimeDomain'],
    describe: 'The data type of analysis.',
    alias: 'dt',
  })
  .option('dataLength', {
    type: 'number',
    default: defaultValue.DATA_LENGTH,
    describe: 'The length of analysis data.',
    alias: 'dl',
  })
  .example('analyse --file ./a.mp3')
  .help('h')
  .alias('h', 'help')
  .argv
