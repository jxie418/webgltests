angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope) {})

.controller('ChatsCtrl', function($scope, Chats) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  $scope.chats = Chats.all();
  $scope.remove = function(chat) {
    Chats.remove(chat);
  };
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats) {
  $scope.chat = Chats.get($stateParams.chatId);
})
  .controller('GraphicsListCtr', function($scope, $stateParams,$state, GraphicsFolderService) {
    $scope.folderList=[];
    $scope.list= function() {
      GraphicsFolderService.getGraphicsFolder().then(
        function(response){
            $scope.folderList= response;
        },
        function(error){
          alert("Can't get Graphics Folders! Please contact James Xie.");
      })
    };
    $scope.select=function(name){
      console.log(name);
      $state.go("damageViewer",{name:name});
    };
  })
  .controller('DamageViewerCtr', function($scope,$state, $stateParams,DamageViewService) {
    console.log($stateParams.name);
    $scope.params = {
      paint : false,
      heat : false,
      undo : true,
      org : "",
      claimId : "",
      logoURL : "",
      showCancel : true,
      carFolder: 'models/'+$stateParams.name+'/Car/'
    };
    $scope.PaintColors =
      ["#ffffff", "#f4e85d", "#ff7800",
        "#af0000", "#489422", "#06649f",
        "#70767d", "#333333" ];
    //var searchObject = $location.search();
    //console.log(JSON.stringify(searchObject));
    $scope.isReady = false;
    $scope.progressValue = 0;
    $scope.progressMaxValue = 0;
    $scope.isBusy = false;
    var spinner = new Spinner();
    var busy = document.getElementById("busy");
    var damageView = new AudaExplore.DamageView();
    /*
    var parseParams = function() {
      Object.keys(searchObject).forEach(function(key) {
        $scope.params[key] = searchObject[key] === "true" ? true : searchObject[key] ==="false" ? false : searchObject[key];
      });
    };
    parseParams();*/
    var init = function() {
      DamageViewService.getObjectFileNames($scope.params.carFolder).then(
        function(responses){
          damageView.objFileNames=responses;
          $scope.progressValue = 0;
          //loaded car obj files and 4 garage obj files.
          $scope.progressMaxValue = (responses.length + 4)*100;
          DamageViewService.getCarLightsPositions($scope.params.carFolder).then(
            function(responses){
              damageView.lightsPositions=responses;
              damageView.init($scope.params.carFolder, function(){
                $scope.$apply(function(){
                  $scope.progressValue = damageView.loadedCount;
                  $scope.isReady = damageView.isReady;
                });
              });
            },
            function(error){
              alert("Can't load car lights positions!")
            }
          );
        },
        function(error){
          alert("Get 3D Object file name error!");
        }
      );
    };
    init();
    $scope.dentLgBtnActive = false;
    $scope.lgDentClick = function() {
      $scope.dentLgBtnActive = !$scope.dentLgBtnActive;
      if($scope.dentLgBtnActive) {
        damageView.btn_state = AudaExplore.Constants.BTN_STATE.DENT_LARGE;
        damageView.enabledInteraction(true);
        $scope.dentSmBtnActive = false;
        $scope.scratchBtnActive = false;
      } else {
        damageView.btn_state = AudaExplore.Constants.BTN_STATE.NONE;
        damageView.enabledInteraction(false);
      }
      console.log("Large Dent Click!");
    };
    $scope.dentSmBtnActive = false;
    $scope.sgDentClick = function() {
      $scope.dentSmBtnActive = !$scope.dentSmBtnActive;
      if($scope.dentSmBtnActive) {
        damageView.btn_state = AudaExplore.Constants.BTN_STATE.DENT_SMALL;
        damageView.enabledInteraction(true);
        $scope.dentLgBtnActive = false;
        $scope.scratchBtnActive = false;
      } else {
        damageView.btn_state = AudaExplore.Constants.BTN_STATE.NONE;
        damageView.enabledInteraction(false);
      }
      console.log("Small Dent Click!");
    };
    $scope.scratchBtnActive = false;
    $scope.scratchClick = function() {
      $scope.scratchBtnActive = !$scope.scratchBtnActive;
      if($scope.scratchBtnActive) {
        damageView.btn_state = AudaExplore.Constants.BTN_STATE.SCRATCH;
        damageView.enabledInteraction(true);
        $scope.dentSmBtnActive = false;
        $scope.dentLgBtnActive = false;
      } else {
        damageView.btn_state = AudaExplore.Constants.BTN_STATE.NONE;
        damageView.enabledInteraction(false);
      }
      console.log("Scratch Click!");
    };
    $scope.heatMapBtnActive = false;
    $scope.heatMapClick = function() {
      $scope.heatMapBtnActive = !$scope.heatMapBtnActive;
      damageView.turnOnOffHeatMap($scope.heatMapBtnActive);
    };
    $scope.paintBtnActive = false;
    $scope.paintClick = function() {
      $scope.paintBtnActive =  !$scope.paintBtnActive;
    };
    $scope.undoClick = function() {
      damageView.history.undo();
    };
    $scope.redoClick = function() {
      damageView.history.redo();
    };
    $scope.resetClick = function() {
      $scope.isBusy = true;
      spinner.spin(busy);
      setTimeout(function(){
        $scope.dentLgBtnActive = false;
        $scope.dentSmBtnActive = false;
        $scope.scratchBtnActive = false;
        damageView.resetDamageView();
        spinner.stop();
        $scope.$apply(function(){
          $scope.isBusy = false;
        });
      },1000);
    };

    $scope.backClick = function() {
      damageView.disposeAllMesh();
      damageView={};
      $state.go("graphicsList");
    };
    $scope.nextClick = function() {
      $scope.isBusy = true;
      spinner.spin(busy);
      damageView.takeDamageImages($scope.params.heat,function(){
        spinner.stop();
        damageView.disposeAllMesh();
        damageView = {};
        $scope.$apply(function(){
          $scope.isBusy = false;
        });
      });
    };
    $scope.cancelClick = function() {

      if (damageView.device == AudaExplore.Constants.DEVICE.ANDROID) {
        Android.onCancelClick();
      }

      $('<div></div>')
        .appendTo('body')
        .html(
        '<div>This information has not been submitted to Liberty Mutual. Are you sure you want to cancel?</div>')
        .dialog(
        {
          modal : true,
          title : 'Cancel Damage Capture',
          zIndex : 10000,
          autoOpen : true,
          width : '248px',
          resizable : false,
          buttons : {
            Yes : function() {
              damageView.disposeAllMesh();
              if (damageView.device == AudaExplore.Constants.DEVICE.ANDROID) {
                Android.onCancelConfirm();
              } else {
                NativeBridge.call("CancelButtonClicked");
              }
              damageView = {};
              $(this).dialog("close");
            },
            No : function() {
              $(this).dialog("close");
            }
          },
          close : function(event, ui) {
            $(this).remove();
          }
        });
    };
    $scope.colorButtonClick = function(color) {
      damageView.changeCarColor(color);
    };

    $scope.helpClick = function() {
      $("#helpDialog").modal({
        show:true
      });
    };
  })
.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
});
