'use strict';

let angular = require('angular');

module.exports = angular.module('spinnaker.azure.securityGroup.transformer', [
])
  .factory('azureSecurityGroupTransformer', function () {

    function normalizeSecurityGroup(securityGroup) {
      
    }

    function addVpcNameToSecurityGroup(securityGroup) {
      return function(vpcs) {
        var matches = vpcs.filter(function(test) {
          return test.id === securityGroup.vpcId;
        });
        securityGroup.vpcName = matches.length ? matches[0].name : '';
      };
    }

    return {
      normalizeSecurityGroup: normalizeSecurityGroup,
    };
  });
