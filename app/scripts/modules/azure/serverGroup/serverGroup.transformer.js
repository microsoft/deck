'use strict';

let angular = require('angular');

module.exports = angular.module('spinnaker.azure.serverGroup.transformer', [
    require('../../core/utils/lodash.js'),
    require('../vpc/vpc.read.service.js'),
  ])
  .factory('azureServerGroupTransformer', function (_, azureVpcReader) {

    function normalizeServerGroup(serverGroup) {
      serverGroup.instances.forEach((instance) => { instance.vpcId = serverGroup.vpcId; });
      return azureVpcReader.listVpcs().then(addVpcNameToServerGroup(serverGroup));
    }

    function addVpcNameToServerGroup(serverGroup) {
      return function(vpcs) {
        var matches = vpcs.filter(function(test) {
          return test.id === serverGroup.vpcId;
        });
        serverGroup.vpcName = matches.length ? matches[0].name : '';
        return serverGroup;
      };
    }

    function convertServerGroupCommandToDeployConfiguration(base) {
      // use _.defaults to avoid copying the backingData, which is huge and expensive to copy over
      var command = {
        name: base.application,
        cloudProvider: base.selectedProvider,
        appName: base.application,
        stack: base.stack,
        detail: base.details,
        credentials: base.credentials,
        region: base.region,
        user: "[anonymous]",
        upgradePolicy: "Manual",

        image: {
          publisher: "Canonical",
          offer: "UbuntuServer",
          sku: "15.04",
          version: "latest",
        },

        sku: {
          name: "Standard_A1",
          tier: "Standard",
          capacity: 2,
        },

        osConfig: {
          adminUsername: "spinnakeruser",
          adminPassword: "!Qnti**234",
        },

        stageDetals: {
          "type": "createServerGroup",
        },
      };
      
      if (typeof base.stack != 'undefined'){
        command.name = command.name + '-' + base.stack;
      }
      if(typeof base.details != 'undefined'){
        command.name = command.name + '-' + base.details;
      }

      return command;
    }

    return {
      convertServerGroupCommandToDeployConfiguration: convertServerGroupCommandToDeployConfiguration,
      normalizeServerGroup: normalizeServerGroup,
    };

  });
