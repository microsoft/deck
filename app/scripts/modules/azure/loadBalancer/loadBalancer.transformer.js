'use strict';

let angular = require('angular');

module.exports = angular.module('spinnaker.azure.loadBalancer.transformer', [
])
  .factory('azureLoadBalancerTransformer', function (settings) {

    function serverGroupIsInLoadBalancer(serverGroup, loadBalancer) {
      return serverGroup.type === 'azure' &&
        serverGroup.account === loadBalancer.account &&
        serverGroup.region === loadBalancer.region &&
        (typeof loadBalancer.vpcId === 'undefined' || serverGroup.vpcId === loadBalancer.vpcId) &&
        serverGroup.loadBalancers.indexOf(loadBalancer.name) !== -1;
    }

    function convertLoadBalancerForEditing(loadBalancer) {
      var toEdit = {
        editMode: true,
        region: loadBalancer.region,
        credentials: loadBalancer.account,
        loadBalancingRules: [],
        name: loadBalancer.name,
        stack: loadBalancer.stack,
        detail: loadBalancer.detail,
        probes: []
      };

      if (loadBalancer.elb) {
        var elb = loadBalancer.elb;

        toEdit.securityGroups = elb.securityGroups;
        toEdit.vnet = elb.vnet;

        if (elb.loadBalancingRules) {
          toEdit.loadBalancingRules = elb.loadBalancingRules;
        }

        toEdit.probes = elb.probes;
      }
      return toEdit;
    }

    function constructNewLoadBalancerTemplate(application) {
      var defaultCredentials = application.defaultCredentials || settings.providers.azure.defaults.account,
          defaultRegion = application.defaultRegion || settings.providers.azure.defaults.region;
      return {
        stack: '',
        detail: 'frontend',
        credentials: defaultCredentials,
        region: defaultRegion,
        cloudProvider: 'azure',
        vnet: null,
        probes: [
          {
            probeName: '',
            probeProtocol: 'HTTP',
            probePort: 7001,
            probePath: '/healthcheck',
            probeInterval: 10,
            unhealthyThreshold: 2
          }
        ],
        securityGroups: [],
        loadBalancingRules: [
          {
            ruleName: '',
            protocol: 'TCP',
            externalPort: 80,
            backendPort: 8080,
            probeName: '',
            persistence: 'None',
            idleTimeout: 4,
          }
        ],
      };
    }

    return {
      serverGroupIsInLoadBalancer: serverGroupIsInLoadBalancer,
      convertLoadBalancerForEditing: convertLoadBalancerForEditing,
      constructNewLoadBalancerTemplate: constructNewLoadBalancerTemplate,
    };

  });
