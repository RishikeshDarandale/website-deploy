import test from 'ava';
import sinon from 'sinon';
const mockfs = require('mock-fs');
const S3Deploy = require('../libs/s3-deploy.js');
const path = require('path');

test('Source directory not present', async (t) => {
  // mock the file system with defaults
  mockfs();
  // fake Options
  let options = {
    debug: true,
    delete: true,
  };
  const directoryPath = './dist';
  const deploy = new S3Deploy(sinon.stub());
  await deploy
    .syncBucket(directoryPath, 'test-bucket', options)
    .catch((error) => {
      t.is(
        error.message,
        'The source directory ' +
          path.join(process.cwd(), directoryPath) +
          ' not found.'
      );
    });
  // restore the mocks
  mockfs.restore();
});
