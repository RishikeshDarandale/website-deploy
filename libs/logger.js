'use strict';

const chalk = require('chalk');

/**
 * A console logger utility class
 *
 * @param {String} message A message to be displayed
 */
class Logger {
  /**
   * log info log message
   *
   * @param {String} message A message to be displayed
   */
  info(message) {
    console.log(chalk.cyan('INFO: ' + message));
  }
  /**
   * log warn log message
   *
   * @param {String} message A message to be displayed
   */
  warn(message) {
    console.log(chalk.yellow('WARN: ' + message));
  }
  /**
   * log debug log message
   *
   * @param {String} message A message to be displayed
   */
  debug(message) {
    console.log(chalk.black.bgWhite('DEBUG: ' + message));
  }
  /**
   * log error log message
   *
   * @param {String} message A message to be displayed
   */
  error(message) {
    console.log(chalk.red('ERROR: ' + message));
  }
}

module.exports = Logger;
