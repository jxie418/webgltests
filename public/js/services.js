angular.module('starter.services', [])
  .factory('GraphicsFolderService',function($http,$q){
    var folders=[];
    return {
      getGraphicsFolder:function(){
        var q = $q.defer();
        var path="models/graphics.txt";
        $http.get(path).success(function(response){
          response = response.trim().replace(/\n/g, " ");
          try{
            folders = response.split(" ");
            q.resolve(folders);
          }catch(err){
            q.reject(err);
          }
        }).error(function(error){
          q.reject(error);
        });
        return q.promise;
      }
    }
  })
  .factory('DamageViewService', function($http,$q) {
  var DamageViewService = {};
  DamageViewService.getObjectFileNames = function(folder) {
    var q = $q.defer();
    var path=folder+"material_type.txt";
    $http.get(path).success(function(response){
      var results = [];
      response = response.trim().replace(/\n/g, " ");
      try{
        results = response.split(" ");
        q.resolve(results);
      }catch(err){
        q.reject(err);
      }
    }).error(function(error){
      q.reject(error);
    });
    return q.promise;
  };

  DamageViewService.getCarLightsPositions = function(folder) {
    var q = $q.defer();
    var path=folder+"car_lights_pos.txt";
    $http.get(path).success(function(response){
      var results = [];
      var response = response.trim().replace(/\r\n/g, ":");
      try{
        var results = response.split(":");
        q.resolve(results);
      }catch(err){
        q.reject(err);
      }
    }).error(function(error){
      q.reject(error);
    });
    return q.promise;
  };
  return DamageViewService;
})
.factory('Chats', function() {
  // Might use a resource here that returns a JSON array

  // Some fake testing data
  var chats = [{
    id: 0,
    name: 'Ben Sparrow',
    lastText: 'You on your way?',
    face: 'https://pbs.twimg.com/profile_images/514549811765211136/9SgAuHeY.png'
  }, {
    id: 1,
    name: 'Max Lynx',
    lastText: 'Hey, it\'s me',
    face: 'https://avatars3.githubusercontent.com/u/11214?v=3&s=460'
  }, {
    id: 2,
    name: 'Adam Bradleyson',
    lastText: 'I should buy a boat',
    face: 'https://pbs.twimg.com/profile_images/479090794058379264/84TKj_qa.jpeg'
  }, {
    id: 3,
    name: 'Perry Governor',
    lastText: 'Look at my mukluks!',
    face: 'https://pbs.twimg.com/profile_images/598205061232103424/3j5HUXMY.png'
  }, {
    id: 4,
    name: 'Mike Harrington',
    lastText: 'This is wicked good ice cream.',
    face: 'https://pbs.twimg.com/profile_images/578237281384841216/R3ae1n61.png'
  }];

  return {
    all: function() {
      return chats;
    },
    remove: function(chat) {
      chats.splice(chats.indexOf(chat), 1);
    },
    get: function(chatId) {
      for (var i = 0; i < chats.length; i++) {
        if (chats[i].id === parseInt(chatId)) {
          return chats[i];
        }
      }
      return null;
    }
  };
});
