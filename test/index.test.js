import fs from 'fs';
import test from 'ava';
import CliTest from 'command-line-test';
import analyse from '../index';

const cliTest = new CliTest();
const strip = (num, precision = 12) => {
  return +parseFloat(num.toPrecision(precision));
}

test('The basic test.', async (t) => {
  await analyse({
    file: './test/horse.mp3',
    output: './test/',
  });
  t.true(fs.existsSync('./test/horse.txt', 'file exit'));
});

test('The outputType and intervalTime test.', async (t) => {
  await analyse({
    file: './test/horse.mp3',
    output: './test/',
    outputType: 'json',
    intervalTime: 0.05,
  });
  const jsonFile = fs.readFileSync('./test/horse.json', {
    encoding: 'utf-8'
  });
  const json = JSON.parse(jsonFile);
  let progressive = true;
  let last;
  for(const item in json) {
    if (last) {
      if (strip((+item) - (+last)) !== 0.05) {
        progressive = false;
      }
    }
    last = item;
  }
  t.is(progressive, true);
});

test('The data length test.', async (t) => {
  await analyse({
    file: './test/horse.mp3',
    output: './test/',
    dataLength: 10,
  });
  const txtFile = fs.readFileSync('./test/horse.txt', {
    encoding: 'utf-8',
  });
  t.is(txtFile.split('\n')[0].split(',').length, 10);
});

test('The cli test.', async (t) => {
  await cliTest.exec('node cli --f ./test/horse.mp3 --o ./test/');
  t.true(fs.existsSync('./test/horse.txt', 'file exit'));
});