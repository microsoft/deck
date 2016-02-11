'use strict';

let angular = require('angular');

module.exports = angular.module('spinnaker.azure.securityGroup.azure.edit.controller', [
  require('angular-ui-router'),
  require('../../../core/account/account.service.js'),
  require('../../../core/cache/infrastructureCaches.js'),
  require('../../../core/cache/cacheInitializer.js'),
  require('../../../core/task/monitor/taskMonitorService.js'),
    require('../securityGroup.write.service.js'),
])
  .controller('azureEditSecurityGroupCtrl', function($scope, $modalInstance, $exceptionHandler, $state,
                                                accountService, securityGroupReader,
                                                taskMonitorService, cacheInitializer, infrastructureCaches,
                                                _, application, securityGroup, azureSecurityGroupWriter) {

    $scope.pages = {
      ingress: require('./createSecurityGroupIngress.html'),
    };

    securityGroup.securityRules = _.map(securityGroup.securityRules,function(rule){
      var temp = rule.destinationPortRange.split('-');
      rule.startPort = Number(temp[0]);
      rule.endPort = Number(temp[1]);
      return rule;
    });

    $scope.securityGroup = securityGroup;

    $scope.state = {
      refreshingSecurityGroups: false,
    };

    $scope.taskMonitor = taskMonitorService.buildTaskMonitor({
      application: application,
      title: 'Updating your security group',
      modalInstance: $modalInstance,
      onTaskComplete: application.refreshImmediately,
    });



//     securityGroup.securityGroupIngress = _(securityGroup.inboundRules)
//       .filter(function(rule) {
//         return rule.securityGroup;
//       }).map(function(rule) {
//         return rule.portRanges.map(function(portRange) {
//           return {
//             name: rule.securityGroup.name,
//             type: rule.protocol,
//             startPort: portRange.startPort,
//             endPort: portRange.endPort
//           };
//         });
//       })
//       .flatten()
//       .value();

//     securityGroup.ipIngress = _(securityGroup.inboundRules)
//       .filter(function(rule) {
//         return rule.range;
//       }).map(function(rule) {
//         return rule.portRanges.map(function(portRange) {
//           return {
//             cidr: rule.range.ip + rule.range.cidr,
//             type: rule.protocol,
//             startPort: portRange.startPort,
//             endPort: portRange.endPort
//           };
//         });
//       })
//       .flatten()
//       .value();

    this.getSecurityGroupRefreshTime = function() {
      return infrastructureCaches.securityGroups.getStats().ageMax;
    };

    this.refreshSecurityGroups = function() {
      $scope.state.refreshingSecurityGroups = true;
      return cacheInitializer.refreshCache('securityGroups').then(function() {
        initializeSecurityGroups().then(function() {
          $scope.state.refreshingSecurityGroups = false;
        });
      });
    };



    function initializeSecurityGroups() {
      return securityGroupReader.getAllSecurityGroups().then(function (securityGroups) {
        var account = securityGroup.accountName,
          region = securityGroup.region,
          //vpcId = securityGroup.vpcId || null, /*removing vpc support from security group creation for Azure*/
          availableGroups = _.filter(securityGroups[account].azure[region], { /*vpcId: vpcId*/ });
        $scope.availableSecurityGroups = _.pluck(availableGroups, 'name');
      });
    }

    this.addRule = function(ruleset) {
      ruleset.push({
        name: $scope.securityGroup.name + '-Rule' + ruleset.length,
        priority: ruleset.length == 0 ? 100 : 100 * (ruleset.length + 1),
        protocol: 'tcp',
        access: 'Allow',
        direction: 'InBound',
        sourceAddressPrefix: '*',
        sourcePortRange: '*',
        destinationAddressPrefix: '*',
        destinationPortRange: '7001-7001',
        startPort: 7001,
        endPort: 7001
      });
    };

    this.portUpdated = function(ruleset, index)
    {
        ruleset[index].destinationPortRange =
            ruleset[index].startPort + '-' + ruleset[index].endPort;
    };

    this.removeRule = function(ruleset, index) {
      ruleset.splice(index, 1);
    };

    this.moveUp = function(ruleset, index) {
      if(index == 0)
        return;
      swapRules(ruleset, index, index - 1);
    };
    this.moveDown = function(ruleset, index) {
      if(index == ruleset.length - 1)
        return;
      swapRules(ruleset, index, index + 1);
    };

    function swapRules(ruleset, a, b)
    {
      var temp, priorityA, priorityB;
      temp = ruleset[b];
      priorityA = ruleset[a].priority;
      priorityB = ruleset[b].priority;
      //swap elements
      ruleset[b] = ruleset[a];
      ruleset[a] = temp;
      //swap priorities
      ruleset[a].priority = priorityA;
      ruleset[b].priority = priorityB;
    }

    //$scope.securityGroup.securityRules = [];

    $scope.taskMonitor.onApplicationRefresh = $modalInstance.dismiss;

    this.upsert = function () {
      $scope.taskMonitor.submit(
        function() {
          let params = {
            cloudProvider: 'azure',
            appName: application.name,
            securityGroupName: $scope.securityGroup.name,
            region: $scope.securityGroup.region,
            subnet : 'none',
            vpcId: 'null'
            };
          $scope.securityGroup.type = 'upsertSecurityGroup';

          return azureSecurityGroupWriter.upsertSecurityGroup($scope.securityGroup, application, 'Update', params);
        }
      );
    };

    this.cancel = function () {
      $modalInstance.dismiss();
    };

    //initializeSecurityGroups();
  });
