'use strict';

let angular = require('angular');

module.exports = angular.module('spinnaker.azure.serverGroup.transformer', [
    require('../../core/utils/lodash.js'),
  ])
  .factory('azureServerGroupTransformer', function (_) {

    function convertServerGroupCommandToDeployConfiguration(base) {
      var command = {
        name: base.application,
        cloudProvider: base.selectedProvider,
        application: base.application,
        stack: base.stack,
        detail: base.details,
        credentials: base.credentials,
        region: base.region,
        user: '[anonymous]',
        upgradePolicy: 'Manual',
        type: 'createServerGroup',

        image: {
          publisher: 'Canonical',
          offer: 'UbuntuServer',
          sku: '15.04',
          version: 'latest',
        },

        sku: {
          name: 'Standard_A1',
          tier: 'Standard',
          capacity: 2,
        },

        osConfig: {
          adminUsername: 'spinnakeruser',
          adminPassword: '!Qnti**234',
        },
      };

      if (typeof base.stack != 'undefined') {
        command.name = command.name + '-' + base.stack;
      }
      if(typeof base.details != 'undefined') {
        command.name = command.name + '-' + base.details;
      }

      return command;
    }

    return {
      convertServerGroupCommandToDeployConfiguration: convertServerGroupCommandToDeployConfiguration,
    };

  });
