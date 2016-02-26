'use strict';

let angular = require('angular');

module.exports = angular.module('spinnaker.azure.cloneServerGroup.controller', [
  require('angular-ui-router'),
  require('../../../../core/utils/lodash.js'),
  require('../serverGroupConfiguration.service.js'),
  require('../../../../core/serverGroup/serverGroup.write.service.js'),
  require('../../../../core/task/monitor/taskMonitorService.js'),
  require('../../../../core/modal/wizard/v2modalWizard.service.js'),
])
  .controller('azureCloneServerGroupCtrl', function($scope, $modalInstance, _, $q, $exceptionHandler, $state,
                                                  serverGroupWriter, v2modalWizardService, taskMonitorService,
                                                  azureServerGroupConfigurationService, serverGroupCommand, application, title) {
    $scope.pages = {
      templateSelection: require('./templateSelection.html'),
      basicSettings: require('./basicSettings/basicSettings.html'),
      loadBalancers: require('./loadBalancers/loadBalancers.html'),
/*    securityGroups: require('./securityGroups.html'),
      instanceArchetype: require('./instanceArchetype.html'),
      instanceType: require('./instanceType.html'),
      advancedSettings: require('./advancedSettings.html'),
      */
    };

    $scope.title = title;

    $scope.applicationName = application.name;
    $scope.application = application;
    $scope.command = serverGroupCommand;

    $scope.state = {
      loaded: false,
      requiresTemplateSelection: !!serverGroupCommand.viewState.requiresTemplateSelection,
    };

    function onApplicationRefresh() {
      // If the user has already closed the modal, do not navigate to the new details view
      if ($scope.$$destroyed) {
        return;
      }
      let [cloneStage] = $scope.taskMonitor.task.execution.stages.filter((stage) => stage.type === 'cloneServerGroup');
      if (cloneStage && cloneStage.context['deploy.server.groups']) {
        let newServerGroupName = cloneStage.context['deploy.server.groups'][$scope.command.region];
        if (newServerGroupName) {
          var newStateParams = {
            serverGroup: newServerGroupName,
            accountId: $scope.command.credentials,
            region: $scope.command.region,
            provider: 'azure',
          };
          var transitionTo = '^.^.^.clusters.serverGroup';
          if ($state.includes('**.clusters.serverGroup')) {  // clone via details, all view
            transitionTo = '^.serverGroup';
          }
          if ($state.includes('**.clusters.cluster.serverGroup')) { // clone or create with details open
            transitionTo = '^.^.serverGroup';
          }
          if ($state.includes('**.clusters')) { // create new, no details open
            transitionTo = '.serverGroup';
          }
          $state.go(transitionTo, newStateParams);
        }
      }
    }

    function onTaskComplete() {
      application.serverGroups.refresh();
      application.serverGroups.onNextRefresh($scope, onApplicationRefresh);
    }


    $scope.taskMonitor = taskMonitorService.buildTaskMonitor({
      application: application,
      title: 'Creating your server group',
      forceRefreshMessage: 'Getting your new server group from Azure...',
      modalInstance: $modalInstance,
      onTaskComplete: onTaskComplete,
    });

    function configureCommand() {
      azureServerGroupConfigurationService.configureCommand(application, serverGroupCommand).then(function () {
        var mode = serverGroupCommand.viewState.mode;
        if (mode === 'clone' || mode === 'create') {
          serverGroupCommand.viewState.useAllImageSelection = true;
        }
        $scope.state.loaded = true;
        initializeCommand();
        initializeWizardState();
        initializeSelectOptions();
        initializeWatches();
      });
    }

    function initializeWizardState() {
      if (serverGroupCommand.viewState.instanceProfile && serverGroupCommand.viewState.instanceProfile !== 'custom') {
        v2modalWizardService.includePage('instance-type');
        v2modalWizardService.markComplete('instance-type');
      }
      var mode = serverGroupCommand.viewState.mode;
      if (mode === 'clone' || mode === 'editPipeline') {
        v2modalWizardService.markComplete('basic-settings');
        v2modalWizardService.markComplete('load-balancers');
        //v2modalWizardService.markComplete('security-groups');
        //v2modalWizardService.markComplete('instance-profile');
        //v2modalWizardService.markComplete('instance-type');
        //v2modalWizardService.markComplete('capacity');
        //v2modalWizardService.markComplete('advanced');
      }
    }

    function initializeWatches() {
      $scope.$watch('command.credentials', createResultProcessor($scope.command.credentialsChanged));
      $scope.$watch('command.region', createResultProcessor($scope.command.regionChanged));
    }

    function initializeSelectOptions() {
      processCommandUpdateResult($scope.command.credentialsChanged());
      processCommandUpdateResult($scope.command.regionChanged());
    }

    function createResultProcessor(method) {
      return function() {
        processCommandUpdateResult(method());
      };
    }

    function processCommandUpdateResult(result) {
      if (result.dirty.loadBalancers) {
        v2modalWizardService.markDirty('load-balancers');
      }
      //if (result.dirty.securityGroups) {
      //  v2modalWizardService.markDirty('security-groups');
      //}
      //if (result.dirty.availabilityZones) {
      //  v2modalWizardService.markDirty('capacity');
      //}
    }

    function initializeCommand() {
      if (serverGroupCommand.viewState.imageId) {
        var foundImage = $scope.command.backingData.packageImages.filter(function(image) {
          return image.amis[serverGroupCommand.region] && image.amis[serverGroupCommand.region].indexOf(serverGroupCommand.viewState.imageId) !== -1;
        });
        if (foundImage.length) {
          serverGroupCommand.amiName = foundImage[0].imageName;
        }
      }
    }

    this.isValid = function () {
      return $scope.command &&
        ($scope.command.application !== null) &&
        ($scope.command.credentials !== null) &&
        ($scope.command.region !== null) &&
        v2modalWizardService.isComplete();
    };

    this.showSubmitButton = function () {
      //return modalWizardService.getWizard().allPagesVisited();
      return true;
    };

    this.submit = function () {
      if ($scope.command.viewState.mode === 'editPipeline' || $scope.command.viewState.mode === 'createPipeline') {
        return $modalInstance.close($scope.command);
      }
      $scope.taskMonitor.submit(
        function() {
          return serverGroupWriter.cloneServerGroup($scope.command, application);
        }
      );
    };

    this.cancel = function () {
      $modalInstance.dismiss();
    };

    this.toggleSuspendedProcess = function(process) {
      $scope.command.suspendedProcesses = $scope.command.suspendedProcesses || [];
      var processIndex = $scope.command.suspendedProcesses.indexOf(process);
      if (processIndex === -1) {
        $scope.command.suspendedProcesses.push(process);
      } else {
        $scope.command.suspendedProcesses.splice(processIndex, 1);
      }
    };

    this.processIsSuspended = function(process) {
      return $scope.command.suspendedProcesses.indexOf(process) !== -1;
    };

    if (!$scope.state.requiresTemplateSelection) {
      configureCommand();
    } else {
      $scope.state.loaded = true;
    }

    $scope.$on('template-selected', function() {
      $scope.state.requiresTemplateSelection = false;
      configureCommand();
    });
  });
